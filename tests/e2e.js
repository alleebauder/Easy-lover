// End-to-end test for accounts, sync, recovery, merging, and the modules.
// Needs: a static server for this repo on port 8000, and the sync Worker on port 8787
//   (cd worker && npx wrangler dev --local --persist-to .wrangler/state --port 8787).
// Run with: npm i playwright && node tests/e2e.js

const { chromium } = require('playwright');
const BASE = 'http://localhost:8000/';
const API = 'http://localhost:8787';
const EMAIL = 'e2e-' + Date.now() + '@example.com';
const PW = 'correct horse battery 42';
const results = [];
const check = (name, ok, extra) => { results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' :: ' + extra : '')); };

async function newPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((api) => { window.SA_CONFIG = { apiBase: api }; }, API);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  return page;
}

async function waitServer(page, key, expected) {
  // Polls the server until the decrypted vault holds `expected` at `key`. Proves the answer was uploaded.
  for (let i = 0; i < 80; i++) {
    const ok = await page.evaluate(async ([api, k, e]) => {
      const s = JSON.parse(localStorage.getItem('self-authoring-suite:account') || 'null');
      if (!s || !s.token || !s.dek) return false;
      const r = await fetch(api + '/api/vault', { headers: { Authorization: 'Bearer ' + s.token } });
      const j = await r.json();
      if (!j.blob) return false;
      const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(s.dek), c => c.charCodeAt(0)), { name: 'AES-GCM' }, false, ['decrypt']);
      const d = await window.SA_CRYPTO.openJson(j.blob, key);
      return d.answers && d.answers[k] === e;
    }, [API, key, expected]).catch(() => false);
    if (ok) return true;
    await page.waitForTimeout(500);
  }
  throw new Error('server never received ' + key);
}

async function card(page, title) { return page.locator('section.card').filter({ has: page.locator('h2', { hasText: title }) }).first(); }
async function waitSynced(page, since) {
  // Resolves once this device has pushed a change after `since` (ms), whichever page is open.
  await page.waitForFunction((t0) => {
    const s = JSON.parse(localStorage.getItem('self-authoring-suite:account') || 'null');
    return !!s && !!s.syncedAt && s.syncedAt >= t0;
  }, since || 0, { timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch();
  try {
    // A: create account, write an answer, confirm it reaches the server
    const A = await newPage(browser);
    await A.goto(BASE + '#/account');
    await A.waitForSelector('text=Create an account');
    const createCard = await card(A, 'Create an account');
    await createCard.locator('input[name=email]').fill(EMAIL);
    await createCard.locator('input[name=password]').fill(PW);
    await createCard.locator('button[type=submit]').click();
    await A.waitForSelector('.recovery-code', { timeout: 30000 });
    const code = (await A.textContent('.recovery-code')).trim();
    check('signup shows a recovery code', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/.test(code), code);
    await A.check('.recovery input[type=checkbox]');
    await A.click('.recovery button:has-text("Continue")');
    await A.waitForSelector('text=Signed in as', { timeout: 30000 });
    check('signed in after recovery code acknowledged', true);
    await A.goto(BASE + '#/past');
    await A.waitForSelector('#past-epochs-title');
    await A.fill('#past-epochs textarea', 'Kept the shop open through the flood week.');
    await waitServer(A, 'past/epochs', 'Kept the shop open through the flood week.');
    const vault = await A.evaluate(async (api) => {
      const s = JSON.parse(localStorage.getItem('self-authoring-suite:account'));
      const r = await fetch(api + '/api/vault', { headers: { Authorization: 'Bearer ' + s.token } });
      return r.json();
    }, API);
    check('server holds an encrypted vault (version >= 1)', vault.version >= 1 && vault.blob && vault.blob.ct && !JSON.stringify(vault).includes('flood week'), 'version ' + vault.version);

    // B: a new device signs in and receives the answers
    const B = await newPage(browser);
    await B.goto(BASE + '#/account');
    await B.waitForSelector('text=Sign in');
    const signInCard = await card(B, 'Sign in');
    await signInCard.locator('input[name=email]').fill(EMAIL);
    await signInCard.locator('input[name=password]').fill('wrong password here');
    await signInCard.locator('button[type=submit]').click();
    await B.waitForFunction(() => document.querySelector('.form-error') && document.querySelector('.form-error').textContent.includes('not right'), null, { timeout: 30000 });
    check('wrong password is refused', true);
    await signInCard.locator('input[name=password]').fill(PW);
    await signInCard.locator('button[type=submit]').click();
    await B.waitForSelector('text=Signed in as', { timeout: 30000 });
    await B.waitForTimeout(2500);
    await B.goto(BASE + '#/past');
    await B.waitForSelector('#past-epochs textarea');
    const restored = await B.inputValue('#past-epochs textarea');
    check('new device receives the answer after sign-in', restored === 'Kept the shop open through the flood week.', restored);

    // C: recovery code on a third device, with a new password
    const C = await newPage(browser);
    await C.goto(BASE + '#/account');
    await C.waitForSelector('text=Forgot your password?');
    const recCard = await card(C, 'Forgot your password?');
    await recCard.locator('input[name=email]').fill(EMAIL);
    await recCard.locator('input[name=code]').fill(code);
    await recCard.locator('input[name=password]').fill('a brand new passphrase 99');
    await recCard.locator('button[type=submit]').click();
    await C.waitForTimeout(6000);
    await C.waitForSelector('text=Signed in as', { timeout: 30000 });
    await C.goto(BASE + '#/past');
    await C.waitForSelector('#past-epochs textarea');
    check('recovery code restores the answers with a new password', (await C.inputValue('#past-epochs textarea')) === 'Kept the shop open through the flood week.');

    // Old password no longer works
    const D = await newPage(browser);
    await D.goto(BASE + '#/account');
    await D.waitForSelector('text=Sign in');
    const dCard = await card(D, 'Sign in');
    await dCard.locator('input[name=email]').fill(EMAIL);
    await dCard.locator('input[name=password]').fill(PW);
    await dCard.locator('button[type=submit]').click();
    await D.waitForFunction(() => document.querySelector('.form-error') && document.querySelector('.form-error').textContent.includes('not right'), null, { timeout: 30000 });
    check('old password is refused after recovery', true);

    // Old sessions are revoked by a password reset, so device A must sign in again with the new password.
    const E = await newPage(browser);
    await E.goto(BASE + '#/account');
    await E.waitForSelector('text=Sign in');
    const eCard = await card(E, 'Sign in');
    await eCard.locator('input[name=email]').fill(EMAIL);
    await eCard.locator('input[name=password]').fill('a brand new passphrase 99');
    await eCard.locator('button[type=submit]').click();
    await E.waitForSelector('text=Signed in as', { timeout: 30000 });
    await E.waitForTimeout(2500);

    // Conflict: E and C both edit while signed in, each on a different answer, and both sync.
    await E.goto(BASE + '#/past');
    await E.waitForSelector('#past-experiences textarea');
    await E.fill('#past-experiences textarea', 'Device E: moved away from the old routine.');
    await waitServer(E, 'past/experiences', 'Device E: moved away from the old routine.');
    await C.goto(BASE + '#/past');
    await C.waitForSelector('#past-patterns textarea');
    await C.fill('#past-patterns textarea', 'Device C: the plan was never realistic.');
    await waitServer(C, 'past/patterns', 'Device C: the plan was never realistic.');
    await E.reload();
    await E.waitForSelector('#past-experiences textarea');
    await E.waitForFunction(() => { const a = JSON.parse(localStorage.getItem('self-authoring-suite:v1') || '{}').answers || {}; return a['past/patterns'] === 'Device C: the plan was never realistic.'; }, null, { timeout: 30000 });
    const merged = await E.evaluate(() => JSON.parse(localStorage.getItem('self-authoring-suite:v1')).answers);
    check('merge keeps both devices\u2019 edits', merged['past/experiences'] && merged['past/patterns'] && merged['past/epochs'], Object.keys(merged).join(', '));

    // Rows and summaries: Values in Action
    await A.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('self-authoring-suite:v1'));
      s.answers['future/values'] = ['Honesty', 'Courage', 'Patience'];
      localStorage.setItem('self-authoring-suite:v1', JSON.stringify(s));
    });
    await A.goto(BASE + '#/values-in-action');
    await A.reload();
    await A.waitForSelector('.rows-table');
    const row = A.locator('.rows-table tbody tr').first();
    await row.locator('input').nth(0).fill('Work');
    await row.locator('input').nth(1).fill('30');
    await row.locator('input').nth(2).fill('0');
    await row.locator('select').selectOption('Honesty');
    const row2 = A.locator('.rows-table tbody tr').nth(1);
    await row2.locator('input').nth(0).fill('Scrolling');
    await row2.locator('input').nth(1).fill('10');
    await row2.locator('select').selectOption({ index: 0 });
    const summaryText = await A.textContent('.rows-field .summary');
    check('values summary reports hours and value split', /Logged: 40 hours/.test(summaryText) && /Honesty: 30 hours a week \(75%\)/.test(summaryText) && /Serves no value: 10 hours a week \(25%\)/.test(summaryText), summaryText.slice(0, 120));

    // Relationship Ledger
    await A.goto(BASE + '#/relationships');
    await A.waitForSelector('.rows-table');
    const r1 = A.locator('.rows-table tbody tr').first();
    await r1.locator('input').nth(0).fill('Sam');
    await r1.locator('select').nth(0).selectOption('2');
    await r1.locator('select').nth(1).selectOption('5');
    const ledger = await A.textContent('.rows-field .summary');
    check('ledger flags a relationship that costs more than it gives', /Costs more than it gives: Sam \(-3\)/.test(ledger), ledger.slice(0, 120));

    // Habit Lab
    await A.goto(BASE + '#/habit-lab');
    await A.waitForSelector('.rows-table');
    const h1 = A.locator('.rows-table tbody tr').first();
    await h1.locator('input').nth(0).fill('Walk after dinner');
    await h1.locator('input').nth(2).fill('11');
    await h1.locator('select').selectOption('Keep it');
    const habit = await A.textContent('.rows-field .summary');
    check('habit lab reports days kept out of 14', /kept 11 of 14 days \(79%\)/.test(habit), habit.slice(0, 100));

    // Every module opens and has its sections
    const modules = ['past', 'faults', 'virtues', 'future', 'plan', 'values-in-action', 'relationships', 'habit-lab', 'meaning-calling', 'shared-review'];
    for (const m of modules) {
      await A.goto(BASE + '#/' + m);
      await A.waitForSelector('main h1');
      const count = await A.locator('section.card').count();
      check('module opens: ' + m, count >= 3, count + ' sections');
    }

    // Sign out removes the local copy but keeps the account
    await E.goto(BASE + '#/account');
    await E.waitForSelector('text=Sign out');
    await E.click('button:has-text("Sign out")');
    await E.waitForSelector('text=Create an account', { timeout: 30000 });
    const after = await E.evaluate(() => localStorage.getItem('self-authoring-suite:account'));
    check('sign out clears the session on this device', after === null);

    // Mobile: rows table scrolls inside its wrapper, page itself does not overflow
    const M = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await M.addInitScript((api) => { window.SA_CONFIG = { apiBase: api }; }, API);
    await M.goto(BASE + '#/values-in-action');
    await M.waitForSelector('.rows-table');
    const overflow = await M.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check('phone width: no page-wide horizontal overflow', !overflow);

    for (const [name, p] of [['A', A], ['B', B], ['C', C], ['D', D], ['E', E]]) check('no page errors on ' + name, p.errors.length === 0, p.errors.slice(0, 2).join(' | '));
  } catch (e) {
    results.push('FAIL flow aborted :: ' + e.message.split('\n').slice(0,4).join(' | '));
  } finally {
    console.log(results.join('\n'));
    await browser.close();
  }
})();
