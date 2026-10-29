/* Self Authoring Suite sync API.
 *
 * The server never sees a password or any answer. The browser derives two keys from the
 * password (an authentication key and a key-encryption key) and derives the same from the
 * recovery code. The server stores only:
 *   - a keyed hash (HMAC with PEPPER) of the authentication key, for each of password and recovery code
 *   - the data key, wrapped (encrypted) twice: once with the password's key, once with the recovery code's key
 *   - the vault: the answers, encrypted in the browser with the data key
 */

const SESSION_DAYS = 30;
const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_VAULT_CHARS = 4_000_000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

const enc = new TextEncoder();

/* ---------- small helpers ---------- */

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
  if (allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request, env, data, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function fail(request, env, status, message) {
  return json(request, env, { error: message }, status);
}

function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function toB64(bytes) {
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}

function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function toB64Url(bytes) {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function keyedHash(env, salt, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.PEPPER), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(salt + ":" + secret));
  return toB64(new Uint8Array(sig));
}

function sameText(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isB64(str, maxLen) {
  return typeof str === "string" && str.length > 0 && str.length <= maxLen && /^[A-Za-z0-9+/=]+$/.test(str);
}

function isWrapped(w) {
  return w && typeof w === "object" && isB64(w.iv, 64) && isB64(w.ct, 512);
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch (err) {
    return null;
  }
}

function normEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

/* ---------- rate limiting ---------- */

async function limited(env, key) {
  const row = await env.DB.prepare("SELECT count, reset_at FROM attempts WHERE key = ?").bind(key).first();
  return !!row && row.reset_at > Date.now() && row.count >= MAX_FAILS;
}

async function recordFail(env, key) {
  const now = Date.now();
  const row = await env.DB.prepare("SELECT count, reset_at FROM attempts WHERE key = ?").bind(key).first();
  if (!row || row.reset_at <= now) {
    await env.DB.prepare("INSERT INTO attempts (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at")
      .bind(key, now + FAIL_WINDOW_MS).run();
  } else {
    await env.DB.prepare("UPDATE attempts SET count = count + 1 WHERE key = ?").bind(key).run();
  }
}

async function clearFails(env, key) {
  await env.DB.prepare("DELETE FROM attempts WHERE key = ?").bind(key).run();
}

/* ---------- sessions ---------- */

async function createSession(env, userId) {
  const token = toB64Url(randomBytes(32));
  const hash = await sha256Hex(token);
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(hash, userId, Date.now() + SESSION_DAYS * 86400000).run();
  return token;
}

async function sessionUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(auth);
  if (!match) return null;
  const hash = await sha256Hex(match[1]);
  const row = await env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").bind(hash).first();
  if (!row || row.expires_at <= Date.now()) return null;
  return row.user_id;
}

/* ---------- fake material for unknown emails (so the response doesn't reveal who has an account) ---------- */

async function fakeKdf(env, email) {
  const salt = (await keyedHash(env, "kdf-salt", email)).slice(0, 22);
  return {
    kdfSalt: salt,
    wrapPw: { iv: toB64(randomBytes(12)), ct: toB64(randomBytes(48)) },
    recoverySalt: (await keyedHash(env, "recovery-salt", email)).slice(0, 22),
    wrapRc: { iv: toB64(randomBytes(12)), ct: toB64(randomBytes(48)) },
  };
}

/* ---------- handlers ---------- */

async function signup(request, env) {
  const body = await readJson(request);
  const email = normEmail(body && body.email);
  if (!email) return fail(request, env, 400, "Enter a valid email address.");
  const { authKey, kdfSalt, wrapPw, recoveryAuthKey, recoverySalt, wrapRc } = body;
  if (!isB64(authKey, 128) || !isB64(kdfSalt, 128) || !isWrapped(wrapPw)) return fail(request, env, 400, "Invalid account data.");
  if (!isB64(recoveryAuthKey, 128) || !isB64(recoverySalt, 128) || !isWrapped(wrapRc)) return fail(request, env, 400, "Invalid recovery data.");

  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return fail(request, env, 409, "An account with this email already exists. Try signing in.");

  const id = crypto.randomUUID();
  const authSalt = toB64(randomBytes(16));
  await env.DB.prepare(`INSERT INTO users (id, email, kdf_salt, auth_salt, auth_hash, wrap_pw_iv, wrap_pw_ct,
      recovery_salt, recovery_auth_hash, wrap_rc_iv, wrap_rc_ct, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, email, kdfSalt, authSalt, await keyedHash(env, authSalt, authKey), wrapPw.iv, wrapPw.ct,
      recoverySalt, await keyedHash(env, recoverySalt, recoveryAuthKey), wrapRc.iv, wrapRc.ct, Date.now())
    .run();
  const token = await createSession(env, id);
  return json(request, env, { token }, 201);
}

async function loginStart(request, env) {
  const body = await readJson(request);
  const email = normEmail(body && body.email);
  if (!email) return fail(request, env, 400, "Enter a valid email address.");
  const user = await env.DB.prepare("SELECT kdf_salt, wrap_pw_iv, wrap_pw_ct FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    const fake = await fakeKdf(env, email);
    return json(request, env, { kdfSalt: fake.kdfSalt, wrapPw: fake.wrapPw });
  }
  return json(request, env, { kdfSalt: user.kdf_salt, wrapPw: { iv: user.wrap_pw_iv, ct: user.wrap_pw_ct } });
}

async function login(request, env) {
  const body = await readJson(request);
  const email = normEmail(body && body.email);
  if (!email || !isB64(body.authKey, 128)) return fail(request, env, 400, "Enter your email and password.");
  const key = "login:" + email;
  if (await limited(env, key)) return fail(request, env, 429, "Too many attempts. Wait 15 minutes and try again.");
  const user = await env.DB.prepare("SELECT id, auth_salt, auth_hash FROM users WHERE email = ?").bind(email).first();
  if (!user || !sameText(await keyedHash(env, user.auth_salt, body.authKey), user.auth_hash)) {
    await recordFail(env, key);
    return fail(request, env, 401, "Email or password is not right.");
  }
  await clearFails(env, key);
  return json(request, env, { token: await createSession(env, user.id) });
}

async function recoverStart(request, env) {
  const body = await readJson(request);
  const email = normEmail(body && body.email);
  if (!email) return fail(request, env, 400, "Enter a valid email address.");
  const user = await env.DB.prepare("SELECT recovery_salt, wrap_rc_iv, wrap_rc_ct FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    const fake = await fakeKdf(env, email);
    return json(request, env, { recoverySalt: fake.recoverySalt, wrapRc: fake.wrapRc });
  }
  return json(request, env, { recoverySalt: user.recovery_salt, wrapRc: { iv: user.wrap_rc_iv, ct: user.wrap_rc_ct } });
}

async function recover(request, env) {
  const body = await readJson(request);
  const email = normEmail(body && body.email);
  if (!email || !isB64(body.recoveryAuthKey, 128) || !isB64(body.newAuthKey, 128) || !isB64(body.newKdfSalt, 128) || !isWrapped(body.newWrapPw)) {
    return fail(request, env, 400, "Check the recovery code and the new password.");
  }
  const key = "recover:" + email;
  if (await limited(env, key)) return fail(request, env, 429, "Too many attempts. Wait 15 minutes and try again.");
  const user = await env.DB.prepare("SELECT id, recovery_salt, recovery_auth_hash FROM users WHERE email = ?").bind(email).first();
  if (!user || !sameText(await keyedHash(env, user.recovery_salt, body.recoveryAuthKey), user.recovery_auth_hash)) {
    await recordFail(env, key);
    return fail(request, env, 401, "That recovery code is not right for this email.");
  }
  await clearFails(env, key);
  const authSalt = toB64(randomBytes(16));
  await env.DB.prepare("UPDATE users SET kdf_salt = ?, auth_salt = ?, auth_hash = ?, wrap_pw_iv = ?, wrap_pw_ct = ? WHERE id = ?")
    .bind(body.newKdfSalt, authSalt, await keyedHash(env, authSalt, body.newAuthKey), body.newWrapPw.iv, body.newWrapPw.ct, user.id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  return json(request, env, { token: await createSession(env, user.id) });
}

async function changePassword(request, env, userId) {
  const body = await readJson(request);
  if (!body || !isB64(body.authKey, 128) || !isB64(body.newAuthKey, 128) || !isB64(body.newKdfSalt, 128) || !isWrapped(body.newWrapPw)) {
    return fail(request, env, 400, "Invalid password data.");
  }
  const user = await env.DB.prepare("SELECT auth_salt, auth_hash FROM users WHERE id = ?").bind(userId).first();
  if (!user || !sameText(await keyedHash(env, user.auth_salt, body.authKey), user.auth_hash)) {
    return fail(request, env, 401, "Current password is not right.");
  }
  const authSalt = toB64(randomBytes(16));
  await env.DB.prepare("UPDATE users SET kdf_salt = ?, auth_salt = ?, auth_hash = ?, wrap_pw_iv = ?, wrap_pw_ct = ? WHERE id = ?")
    .bind(body.newKdfSalt, authSalt, await keyedHash(env, authSalt, body.newAuthKey), body.newWrapPw.iv, body.newWrapPw.ct, userId).run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  return json(request, env, { token: await createSession(env, userId) });
}

async function newRecoveryCode(request, env, userId) {
  const body = await readJson(request);
  if (!body || !isB64(body.authKey, 128) || !isB64(body.newRecoverySalt, 128) || !isB64(body.newRecoveryAuthKey, 128) || !isWrapped(body.newWrapRc)) {
    return fail(request, env, 400, "Invalid recovery code data.");
  }
  const user = await env.DB.prepare("SELECT auth_salt, auth_hash FROM users WHERE id = ?").bind(userId).first();
  if (!user || !sameText(await keyedHash(env, user.auth_salt, body.authKey), user.auth_hash)) {
    return fail(request, env, 401, "Password is not right.");
  }
  await env.DB.prepare("UPDATE users SET recovery_salt = ?, recovery_auth_hash = ?, wrap_rc_iv = ?, wrap_rc_ct = ? WHERE id = ?")
    .bind(body.newRecoverySalt, await keyedHash(env, body.newRecoverySalt, body.newRecoveryAuthKey), body.newWrapRc.iv, body.newWrapRc.ct, userId).run();
  return json(request, env, null, 204);
}

async function deleteAccount(request, env, userId) {
  const body = await readJson(request);
  const user = await env.DB.prepare("SELECT auth_salt, auth_hash FROM users WHERE id = ?").bind(userId).first();
  if (!body || !user || !sameText(await keyedHash(env, user.auth_salt, body.authKey), user.auth_hash)) {
    return fail(request, env, 401, "Password is not right.");
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vaults WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
  return json(request, env, null, 204);
}

async function logout(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(auth);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(match[1])).run();
  return json(request, env, null, 204);
}

async function getVault(request, env, userId) {
  const row = await env.DB.prepare("SELECT version, blob, updated_at FROM vaults WHERE user_id = ?").bind(userId).first();
  if (!row) return json(request, env, { version: 0, blob: null, updatedAt: null });
  return json(request, env, { version: row.version, blob: JSON.parse(row.blob), updatedAt: row.updated_at });
}

async function putVault(request, env, userId) {
  const body = await readJson(request);
  if (!body || !Number.isInteger(body.baseVersion) || body.baseVersion < 0) return fail(request, env, 400, "Invalid sync request.");
  const blob = body.blob;
  if (!blob || typeof blob !== "object" || blob.v !== 1 || !isB64(blob.iv, 64) || !isB64(blob.ct, MAX_VAULT_CHARS)) {
    return fail(request, env, 400, "Invalid vault data.");
  }
  const text = JSON.stringify(blob);
  if (text.length > MAX_VAULT_CHARS) return fail(request, env, 413, "Your answers are too large to save.");

  const current = await env.DB.prepare("SELECT version, blob FROM vaults WHERE user_id = ?").bind(userId).first();
  const currentVersion = current ? current.version : 0;
  if (body.baseVersion !== currentVersion) {
    return json(request, env, { error: "Changed on another device.", version: currentVersion, blob: current ? JSON.parse(current.blob) : null }, 409);
  }
  const next = currentVersion + 1;
  const now = Date.now();
  if (!current) {
    await env.DB.prepare("INSERT INTO vaults (user_id, version, blob, updated_at) VALUES (?, ?, ?, ?)").bind(userId, next, text, now).run();
  } else {
    const result = await env.DB.prepare("UPDATE vaults SET version = ?, blob = ?, updated_at = ? WHERE user_id = ? AND version = ?")
      .bind(next, text, now, userId, currentVersion).run();
    if (!result.meta || result.meta.changes !== 1) return json(request, env, { error: "Changed on another device." }, 409);
  }
  return json(request, env, { version: next, updatedAt: now });
}

/* ---------- router ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    if (!url.pathname.startsWith("/api/")) return fail(request, env, 404, "Not found.");
    const path = url.pathname.replace(/\/+$/, "");
    const method = request.method;

    try {
      if (method === "GET" && path === "/api/health") return json(request, env, { ok: true });
      if (method === "POST" && path === "/api/signup") return signup(request, env);
      if (method === "POST" && path === "/api/login/start") return loginStart(request, env);
      if (method === "POST" && path === "/api/login") return login(request, env);
      if (method === "POST" && path === "/api/recover/start") return recoverStart(request, env);
      if (method === "POST" && path === "/api/recover") return recover(request, env);
      if (method === "POST" && path === "/api/logout") return logout(request, env);

      const userId = await sessionUser(request, env);
      if (!userId) return fail(request, env, 401, "Please sign in again.");

      if (method === "GET" && path === "/api/vault") return getVault(request, env, userId);
      if (method === "PUT" && path === "/api/vault") return putVault(request, env, userId);
      if (method === "POST" && path === "/api/password") return changePassword(request, env, userId);
      if (method === "POST" && path === "/api/recovery-code") return newRecoveryCode(request, env, userId);
      if (method === "POST" && path === "/api/account/delete") return deleteAccount(request, env, userId);
      return fail(request, env, 404, "Not found.");
    } catch (err) {
      return fail(request, env, 500, "Something went wrong. Try again.");
    }
  },
};
