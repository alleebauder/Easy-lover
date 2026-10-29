/* Client-side encryption for the Self Authoring Suite.
 *
 * Nothing secret leaves the browser. From a password (or a recovery code) and a random salt we
 * derive 512 bits with PBKDF2-SHA256: the first 256 bits are sent to the server as an
 * authentication key (the server stores only a keyed hash of it); the last 256 bits become an
 * AES-GCM key that wraps the data key. The data key encrypts the answers. The server holds the
 * wrapped data key and the encrypted answers, and cannot read either.
 */
(function () {
  "use strict";

  var ITERATIONS = 600000;
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  // No 0, 1, I or O: easier to read and type.
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  function randomBytes(n) {
    var b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }

  function toB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function fromB64(str) {
    var s = atob(str);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function randomSalt() {
    return toB64(randomBytes(16));
  }

  // Derives { authKey (base64), kek (AES-GCM CryptoKey) } from a secret and a base64 salt.
  async function deriveKeys(secret, saltB64) {
    var base = await crypto.subtle.importKey("raw", enc.encode(String(secret).normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltB64), iterations: ITERATIONS }, base, 512));
    var kek = await crypto.subtle.importKey("raw", bits.slice(32, 64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    return { authKey: toB64(bits.slice(0, 32)), kek: kek };
  }

  // Wraps raw key bytes under a KEK. Returns { iv, ct } as base64.
  async function wrap(rawBytes, kek) {
    var iv = randomBytes(12);
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, kek, rawBytes));
    return { iv: toB64(iv), ct: toB64(ct) };
  }

  async function unwrap(wrapped, kek) {
    var raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(wrapped.iv) }, kek, fromB64(wrapped.ct));
    return new Uint8Array(raw);
  }

  function newDataKeyBytes() {
    return randomBytes(32);
  }

  function importDataKey(rawBytes) {
    return crypto.subtle.importKey("raw", rawBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  async function sealJson(obj, dataKey) {
    var iv = randomBytes(12);
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, dataKey, enc.encode(JSON.stringify(obj))));
    return { v: 1, iv: toB64(iv), ct: toB64(ct) };
  }

  async function openJson(blob, dataKey) {
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(blob.iv) }, dataKey, fromB64(blob.ct));
    return JSON.parse(dec.decode(plain));
  }

  // A 20-character recovery code (100 bits), shown as five groups of four.
  function makeRecoveryCode() {
    var bytes = randomBytes(20);
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out.match(/.{1,4}/g).join("-");
  }

  function normalizeRecoveryCode(code) {
    return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  window.SA_CRYPTO = {
    deriveKeys: deriveKeys,
    wrap: wrap,
    unwrap: unwrap,
    randomSalt: randomSalt,
    newDataKeyBytes: newDataKeyBytes,
    importDataKey: importDataKey,
    sealJson: sealJson,
    openJson: openJson,
    makeRecoveryCode: makeRecoveryCode,
    normalizeRecoveryCode: normalizeRecoveryCode,
    toB64: toB64,
    fromB64: fromB64
  };
})();
