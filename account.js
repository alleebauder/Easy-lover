/* Accounts and encrypted sync for the Self Authoring Suite.
 * Depends on crypto.js and config.js, and on window.SAApp (set by app.js). */
(function () {
  "use strict";

  var STORE_KEY = "self-authoring-suite:account";
  var MIN_PASSWORD = 12;
  var API = String((window.SA_CONFIG && window.SA_CONFIG.apiBase) || "").replace(/\/+$/, "");
  var C = window.SA_CRYPTO;

  var session = loadSession();   // { token, email, dek (base64), version, base, syncedAt } or null
  var recoveryReveal = null;     // { code } shown once after sign-up or a new recovery code
  var showRecovery = false;      // the "forgot password" form is open
  var syncTimer = null;
  var syncing = false;
  var syncAgain = false;
  var lastStatus = "";

  function loadSession() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveSession() {
    try {
      if (session) window.localStorage.setItem(STORE_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(STORE_KEY);
    } catch (err) { /* storage unavailable: the session lasts this visit only */ }
  }

  function signedIn() {
    return !!(session && session.token && session.dek);
  }

  function api(method, path, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth && session && session.token) headers.Authorization = "Bearer " + session.token;
    return fetch(API + path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      if (res.status === 204) return { status: 204, data: {} };
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).catch(function () {
      return { status: 0, data: { error: "Could not reach the sync service. Check your connection." } };
    });
  }

  function dataKeyBytes() {
    return C.fromB64(session.dek);
  }

  /* ---------- merging two copies of the answers ---------- */

  function snapshot(state) {
    return JSON.parse(JSON.stringify({ answers: state.answers || {}, reviews: state.reviews || [] }));
  }

  function mergeStates(base, local, remote) {
    base = base || { answers: {}, reviews: [] };
    var keys = {};
    [local.answers, remote.answers, base.answers].forEach(function (obj) {
      Object.keys(obj || {}).forEach(function (k) { keys[k] = true; });
    });

    var answers = {};
    Object.keys(keys).forEach(function (k) {
      var l = local.answers[k];
      var r = remote.answers[k];
      var changedHere = JSON.stringify(l) !== JSON.stringify(base.answers[k]);
      var value = changedHere ? l : (r !== undefined ? r : l);
      if (value !== undefined) answers[k] = value;
    });

    // Reviews are keyed by week. This device's copy wins for a week it has; a week this device
    // deleted since its last sync is removed.
    var byWeek = {};
    remote.reviews.forEach(function (r) { byWeek[r.week] = r; });
    local.reviews.forEach(function (r) { byWeek[r.week] = r; });
    base.reviews.forEach(function (b) {
      var stillHere = local.reviews.some(function (l) { return l.week === b.week; });
      if (!stillHere) delete byWeek[b.week];
    });
    var reviews = Object.keys(byWeek).map(function (w) { return byWeek[w]; });
    reviews.sort(function (a, b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : 0; });

    return { version: 1, answers: answers, reviews: reviews };
  }

  /* ---------- sync ---------- */

  function setStatus(text) {
    lastStatus = text;
    var node = document.getElementById("account-status");
    if (node) node.textContent = text;
  }

  function expireSession() {
    if (session) session.token = null;
    saveSession();
    setStatus("Your sign-in has expired. Sign in again to sync. Your answers stay saved on this device.");
  }

  async function syncNow() {
    if (!API || !signedIn()) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    setStatus("Syncing...");
    try {
      var key = await C.importDataKey(dataKeyBytes());
      for (var attempt = 0; attempt < 3; attempt++) {
        var got = await api("GET", "/api/vault", null, true);
        if (got.status === 401) { expireSession(); return; }
        if (got.status !== 200) { setStatus("Could not sync. Will try again."); return; }

        var local = window.SAApp.getState();
        var merged = local;
        if (got.data.blob) {
          var remote = await C.openJson(got.data.blob, key);
          merged = mergeStates(session.base, local, { answers: remote.answers || {}, reviews: remote.reviews || [] });
          window.SAApp.replaceState(merged);
        }

        var sealed = await C.sealJson({ answers: merged.answers, reviews: merged.reviews }, key);
        var put = await api("PUT", "/api/vault", { baseVersion: got.data.version, blob: sealed }, true);
        if (put.status === 401) { expireSession(); return; }
        if (put.status === 409) continue; // changed elsewhere in the meantime: pull again
        if (put.status !== 200) { setStatus("Could not sync. Will try again."); return; }

        session.version = put.data.version;
        session.base = snapshot(merged);
        session.syncedAt = Date.now();
        saveSession();
        setStatus("All changes synced just now.");
        return;
      }
      setStatus("Could not sync because the answers changed on another device. Try Sync now.");
    } catch (err) {
      setStatus("Could not sync. Will try again.");
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; scheduleSync(500); }
    }
  }

  function scheduleSync(delay) {
    if (!API || !signedIn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, delay === undefined ? 1500 : delay);
  }

  /* ---------- account actions ---------- */

  function cleanEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  async function verifyPassword(password) {
    var start = await api("POST", "/api/login/start", { email: session.email }, false);
    if (start.status !== 200) return { error: "Could not check your password right now." };
    var keys = await C.deriveKeys(password, start.data.kdfSalt);
    try {
      var dek = await C.unwrap(start.data.wrapPw, keys.kek);
      if (C.toB64(dek) !== session.dek) return { error: "Password is not right." };
    } catch (err) {
      return { error: "Password is not right." };
    }
    return { authKey: keys.authKey };
  }

  async function createAccount(email, password) {
    email = cleanEmail(email);
    var salt = C.randomSalt();
    var keys = await C.deriveKeys(password, salt);
    var dek = C.newDataKeyBytes();
    var wrapPw = await C.wrap(dek, keys.kek);
    var code = C.makeRecoveryCode();
    var recSalt = C.randomSalt();
    var rk = await C.deriveKeys(C.normalizeRecoveryCode(code), recSalt);
    var wrapRc = await C.wrap(dek, rk.kek);
    var res = await api("POST", "/api/signup", {
      email: email, authKey: keys.authKey, kdfSalt: salt, wrapPw: wrapPw,
      recoveryAuthKey: rk.authKey, recoverySalt: recSalt, wrapRc: wrapRc
    }, false);
    if (res.status !== 201) return { error: res.data.error || "Could not create the account." };
    session = { token: res.data.token, email: email, dek: C.toB64(dek), version: 0, base: null, syncedAt: null };
    saveSession();
    return { code: code };
  }

  async function signIn(email, password) {
    email = cleanEmail(email);
    var start = await api("POST", "/api/login/start", { email: email }, false);
    if (start.status !== 200) return { error: start.data.error || "Could not sign in right now." };
    var keys = await C.deriveKeys(password, start.data.kdfSalt);
    var dek;
    try {
      dek = await C.unwrap(start.data.wrapPw, keys.kek);
    } catch (err) {
      return { error: "Email or password is not right." };
    }
    var res = await api("POST", "/api/login", { email: email, authKey: keys.authKey }, false);
    if (res.status !== 200) return { error: res.data.error || "Email or password is not right." };
    session = { token: res.data.token, email: email, dek: C.toB64(dek), version: null, base: null, syncedAt: null };
    saveSession();
    return { ok: true };
  }

  async function recoverAccount(email, code, newPassword) {
    email = cleanEmail(email);
    var start = await api("POST", "/api/recover/start", { email: email }, false);
    if (start.status !== 200) return { error: "Could not check that recovery code right now." };
    var rk = await C.deriveKeys(C.normalizeRecoveryCode(code), start.data.recoverySalt);
    var dek;
    try {
      dek = await C.unwrap(start.data.wrapRc, rk.kek);
    } catch (err) {
      return { error: "That recovery code is not right for this email." };
    }
    var salt = C.randomSalt();
    var keys = await C.deriveKeys(newPassword, salt);
    var wrapPw = await C.wrap(dek, keys.kek);
    var res = await api("POST", "/api/recover", {
      email: email, recoveryAuthKey: rk.authKey, newAuthKey: keys.authKey, newKdfSalt: salt, newWrapPw: wrapPw
    }, false);
    if (res.status !== 200) return { error: res.data.error || "Could not reset the password." };
    session = { token: res.data.token, email: email, dek: C.toB64(dek), version: null, base: null, syncedAt: null };
    saveSession();
    return { ok: true };
  }

  async function changePassword(current, next) {
    var check = await verifyPassword(current);
    if (check.error) return check;
    var salt = C.randomSalt();
    var keys = await C.deriveKeys(next, salt);
    var wrapPw = await C.wrap(C.fromB64(session.dek), keys.kek);
    var res = await api("POST", "/api/password", {
      authKey: check.authKey, newAuthKey: keys.authKey, newKdfSalt: salt, newWrapPw: wrapPw
    }, true);
    if (res.status !== 200) return { error: res.data.error || "Could not change the password." };
    session.token = res.data.token;
    saveSession();
    return { ok: true };
  }

  async function newRecoveryCode(password) {
    var check = await verifyPassword(password);
    if (check.error) return check;
    var code = C.makeRecoveryCode();
    var rsalt = C.randomSalt();
    var rk = await C.deriveKeys(C.normalizeRecoveryCode(code), rsalt);
    var wrapRc = await C.wrap(C.fromB64(session.dek), rk.kek);
    var res = await api("POST", "/api/recovery-code", {
      authKey: check.authKey, newRecoverySalt: rsalt, newRecoveryAuthKey: rk.authKey, newWrapRc: wrapRc
    }, true);
    if (res.status !== 204 && res.status !== 200) return { error: res.data.error || "Could not create a new code." };
    return { code: code };
  }

  async function deleteAccount(password) {
    var check = await verifyPassword(password);
    if (check.error) return check;
    var res = await api("POST", "/api/account/delete", { authKey: check.authKey }, true);
    if (res.status !== 204 && res.status !== 200) return { error: res.data.error || "Could not delete the account." };
    forgetDevice();
    return { ok: true };
  }

  function forgetDevice() {
    session = null;
    saveSession();
    recoveryReveal = null;
    window.SAApp.replaceState(window.SAApp.emptyState());
  }

  async function signOut() {
    await api("POST", "/api/logout", null, true);
    forgetDevice();
  }

  /* ---------- views ---------- */

  function formCard(title, intro, fields, submitLabel, onSubmit, extra) {
    var el = window.SAApp.el;
    var error = el("p", { class: "form-error", role: "alert" });
    var button = el("button", { type: "submit", class: "btn primary", text: submitLabel });
    var inputs = fields.map(function (f) {
      return el("label", { class: "form-field" }, [
        el("span", { text: f.label }),
        el("input", { type: f.type || "text", name: f.name, autocomplete: f.autocomplete || "off", required: true, minLength: f.minLength, placeholder: f.placeholder || "" })
      ]);
    });
    var form = el("form", { class: "form-stack" }, inputs.concat([button, error]));
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var values = {};
      fields.forEach(function (f) { values[f.name] = form.elements[f.name].value; });
      button.disabled = true;
      error.textContent = "Working...";
      try {
        var result = await onSubmit(values);
        if (result && result.error) error.textContent = result.error;
        else error.textContent = "";
      } catch (err) {
        console.error("Account action failed:", err);
        error.textContent = "Something went wrong. Try again.";
      } finally {
        button.disabled = false;
      }
    });
    return el("section", { class: "card" }, [
      el("h2", { text: title }),
      el("p", { class: "help", text: intro }),
      form,
      extra || null
    ]);
  }

  function recoveryRevealCard() {
    var el = window.SAApp.el;
    var box = el("input", { type: "checkbox" });
    var go = el("button", { type: "button", class: "btn primary", text: "Continue", disabled: true });
    box.addEventListener("change", function () { go.disabled = !box.checked; });
    go.addEventListener("click", function () {
      recoveryReveal = null;
      syncNow();
      window.SAApp.route();
    });
    return el("section", { class: "card recovery" }, [
      el("h2", { text: "Save your recovery code" }),
      el("p", { class: "help", text: "This code is the only way back into your answers if you forget your password. It is shown once. Write it down or store it in a password manager. Nobody at this site can recover it for you." }),
      el("p", { class: "recovery-code", text: recoveryReveal.code }),
      el("label", { class: "check-row" }, [box, el("span", { text: "I have saved this recovery code somewhere safe." })]),
      go
    ]);
  }

  function signedOutView() {
    var el = window.SAApp.el;
    var recoveryForm = formCard("Forgot your password?",
      "Enter the recovery code you saved when you created the account, and choose a new password.",
      [
        { label: "Email", name: "email", type: "email", autocomplete: "email" },
        { label: "Recovery code", name: "code", placeholder: "XXXX-XXXX-XXXX-XXXX-XXXX" },
        { label: "New password (at least 12 characters)", name: "password", type: "password", minLength: MIN_PASSWORD, autocomplete: "new-password" }
      ],
      "Reset password",
      async function (v) {
        if (v.password.length < MIN_PASSWORD) return { error: "Use at least 12 characters for the password." };
        var r = await recoverAccount(v.email, v.code, v.password);
        if (r.ok) { syncNow(); window.SAApp.route(); }
        return r;
      });

    var signInCard = formCard("Sign in",
      "Your answers are encrypted with your password. Signing in on a new device brings them back.",
      [
        { label: "Email", name: "email", type: "email", autocomplete: "email" },
        { label: "Password", name: "password", type: "password", autocomplete: "current-password" }
      ],
      "Sign in",
      async function (v) {
        var r = await signIn(v.email, v.password);
        if (r.ok) { syncNow(); window.SAApp.route(); }
        return r;
      },
      el("p", { class: "help" }, [
        "Forgot your password? ",
        el("a", { href: "#/account", onclick: function (e) { e.preventDefault(); showRecovery = true; window.SAApp.route(); }, text: "Use your recovery code" })
      ]));

    var create = formCard("Create an account",
      "Your answers are encrypted in this browser before they are sent. The service stores only encrypted data, and cannot read what you write.",
      [
        { label: "Email", name: "email", type: "email", autocomplete: "email" },
        { label: "Password (at least 12 characters)", name: "password", type: "password", minLength: MIN_PASSWORD, autocomplete: "new-password" }
      ],
      "Create account",
      async function (v) {
        if (v.password.length < MIN_PASSWORD) return { error: "Use at least 12 characters for the password." };
        var r = await createAccount(v.email, v.password);
        if (r.code) {
          recoveryReveal = { code: r.code };
          window.SAApp.route();
        }
        return r.error ? { error: r.error } : null;
      },
      el("p", { class: "help small", text: "If you forget your password and lose your recovery code, your answers cannot be recovered. That is the trade-off for keeping them private." }));

    return el("div", { class: "account-grid" }, showRecovery ? [recoveryForm, signInCard, create] : [signInCard, create, recoveryForm]);
  }

  function signedInView() {
    var el = window.SAApp.el;
    var stamp = session.syncedAt ? new Date(session.syncedAt).toLocaleString() : "not yet";

    var sync = el("section", { class: "card" }, [
      el("h2", { text: "Signed in as " + session.email }),
      el("p", { class: "help", text: "Last synced: " + stamp }),
      el("p", { id: "account-status", class: "muted small", text: lastStatus || "Your answers sync automatically after each change." }),
      el("div", { class: "button-row" }, [
        el("button", { type: "button", class: "btn primary", text: "Sync now", onclick: function () { syncNow(); } }),
        el("button", { type: "button", class: "btn", text: "Sign out", onclick: function () {
          if (!window.confirm("Sign out of this device? Your answers stay in your account, and this device's copy is removed.")) return;
          signOut().then(function () { window.SAApp.route(); });
        } })
      ])
    ]);

    var password = formCard("Change password",
      "Your answers are re-locked with the new password. Your recovery code still works.",
      [
        { label: "Current password", name: "current", type: "password", autocomplete: "current-password" },
        { label: "New password (at least 12 characters)", name: "next", type: "password", minLength: MIN_PASSWORD, autocomplete: "new-password" }
      ],
      "Change password",
      async function (v) {
        if (v.next.length < MIN_PASSWORD) return { error: "Use at least 12 characters for the new password." };
        var r = await changePassword(v.current, v.next);
        if (r.ok) window.SAApp.route();
        return r;
      });

    var recovery = formCard("New recovery code",
      "Use this if you think the code you saved may be lost or seen by someone else. The old code stops working.",
      [{ label: "Current password", name: "password", type: "password", autocomplete: "current-password" }],
      "Create a new code",
      async function (v) {
        var r = await newRecoveryCode(v.password);
        if (r.code) { recoveryReveal = { code: r.code }; window.SAApp.route(); }
        return r.error ? { error: r.error } : null;
      });

    var remove = formCard("Delete account",
      "This permanently deletes your account and every answer stored in it. It cannot be undone.",
      [
        { label: "Type DELETE to confirm", name: "confirm", placeholder: "DELETE" },
        { label: "Current password", name: "password", type: "password", autocomplete: "current-password" }
      ],
      "Delete my account",
      async function (v) {
        if (v.confirm !== "DELETE") return { error: "Type DELETE to confirm." };
        var r = await deleteAccount(v.password);
        if (r.ok) window.SAApp.route();
        return r;
      });
    remove.classList.add("danger-zone");

    return el("div", { class: "account-grid" }, [sync, password, recovery, remove]);
  }

  function render(main) {
    var el = window.SAApp.el;
    main.appendChild(el("header", { class: "page-head" }, [
      el("p", { class: "eyebrow", text: "Account" }),
      el("h1", { text: "Your account" }),
      el("p", { class: "lede", text: "Keep your answers safe and in sync across devices. Everything is encrypted in your browser before it is sent." })
    ]));

    if (!API) {
      main.appendChild(el("section", { class: "card" }, [
        el("h2", { text: "Accounts are not connected yet" }),
        el("p", { class: "help", text: "The sync service has not been set up on this site. Your answers still save in this browser, and you can sign in once the service is connected." })
      ]));
      return;
    }

    if (recoveryReveal) { main.appendChild(recoveryRevealCard()); return; }
    main.appendChild(signedIn() ? signedInView() : signedOutView());
  }

  window.SAAccount = {
    render: render,
    onSave: function () { scheduleSync(1500); },
    syncNow: syncNow,
    isSignedIn: signedIn
  };

  // Pull on load if a session exists, so a second device sees changes made elsewhere.
  if (signedIn()) {
    window.addEventListener("load", function () { scheduleSync(300); });
    window.addEventListener("online", function () { scheduleSync(0); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") scheduleSync(0);
    });
  }
})();
