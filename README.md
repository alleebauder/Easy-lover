# Self Authoring Suite

A free self-reflection suite. Ten guided modules take you from your history, through your faults and strengths, to a direction, a plan, and the people who keep you accountable. A weekly review keeps the work alive. Your answers are encrypted in your browser, and an optional account keeps them in sync across devices.

This is an independent, original take on structured self-authoring. It is not affiliated with or endorsed by the original Self Authoring Suite or its authors. All prompts here are written for this project. See [SOURCES.md](SOURCES.md) for the research behind the structure.

**Live site:** https://alleebauder.github.io/Easy-lover/

## What is inside

| Module | Question it answers |
| --- | --- |
| 01 Past Self | Where have I been? Map my life into epochs, examine ten experiences, see the patterns across them. |
| 02 Present: Faults | Where do I get in my own way? Choose from five personality dimensions, rank the costliest faults, and write about each. |
| 03 Present: Virtues | What do I do well? Choose strengths from the same five dimensions, and describe when they helped and how to use them on purpose. |
| 04 Future Self | Where am I going? Daydream the ideal future, name the one to avoid, clarify values and seven life areas, then set ranked goals. |
| 05 The Plan | What will I do? One fault to work against, one virtue to lean on, up to three if-then commitments, a first step, and a witness. |
| 06 Values in Action | Do my choices match what I say matters? A typical week of time and money, tagged by value, with a summary of the split. |
| 07 Relationship Ledger | Who gives me energy, and who do I give it to? Each person rated both ways, with a next move. |
| 08 Habit Lab | Run small two-week experiments, predict first, then count the days kept and read the result. |
| 09 Meaning and Calling | A slower inquiry into purpose, service, and the one-sentence statement you're working toward. |
| 10 Shared Review | Set up a witness, the commitment they should ask about, and the questions for each check-in. |
| Weekly review | Each week: did I follow through, what went well, what drained me, one priority. Follow-through is charted over time. |


## Where this improves on a one-time workbook

- **It repeats.** The weekly review turns a one-time exercise into a practice and charts follow-through.
- **Commitments are specific.** The plan asks for if-then statements, a dated first step, and a named witness.
- **It is private by default.** No account, no server, no analytics. Answers stay in your browser's local storage.
- **It is paced.** Each module shows an estimated time and a note on working through heavy material, with a crisis line on every page.
- **You can take it with you.** Export to Markdown for reading, JSON for a full backup, or print to PDF.
- **It is built to grow.** Modules are plain data in `modules.js`. Adding one does not require changing the engine.
- **It works everywhere.** Mobile-friendly, keyboard-navigable, respects light and dark mode and reduced motion, and has no build step or external dependencies.

## Run it locally

No build step is needed. Either open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish on GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, select `main`, and folder `/ (root)`.
3. Save. The site appears at the URL shown on that page within a minute or two.

The included `.nojekyll` file tells GitHub Pages to serve the files as they are.

## Project layout

```
index.html    page shell and social-share metadata
styles.css    all styling (light and dark, print styles included)
config.js     where the sync service lives (apiBase)
crypto.js     client-side key derivation and encryption
account.js    sign-up, sign-in, recovery, password change, and sync
modules.js    all content: prompts, checklists, tables, and module order
summaries.js  computed summaries under the table modules
app.js        engine: storage, navigation, progress, weekly review, export
worker/       the sync service (Cloudflare Worker + D1)
tests/        end-to-end test (Playwright)
404.html      page for unknown addresses
SOURCES.md    research behind the structure, with discrepancies noted
ROADMAP.md    where the project is going
```

### Adding a module

Open `modules.js` and add an object to `window.SA_MODULES`:

```js
{
  id: "my-module",
  status: "active",          // or "coming" to show it as a roadmap card
  number: "11",
  title: "My Module",
  subtitle: "A short question it answers",
  time: "About an hour",
  intro: "One paragraph on why this matters.",
  note: "Optional guidance shown as a callout.",
  sections: [
    { id: "first", kind: "text", title: "Heading", prompt: "The question." },
    { id: "pick", kind: "choose", title: "Pick some", prompt: "Choose.", options: ["A", "B", "C"], max: 2 },
    { id: "rank", kind: "list", title: "Rank them", prompt: "Write up to three.", max: 3 }
  ]
}
```

Section kinds are `text` (free writing), `choose` (tick up to `max` options from `options`), `list` (short lines, optionally capped with `max`), and `rows` (a small table with typed columns; add a `summary` function name from `summaries.js` to show computed lines under it).

## Accounts, encryption, and privacy

- **Without an account**, answers stay in this browser only.
- **With an account**, answers are encrypted in your browser before they are sent. The server stores your email, a salted verifier that cannot reveal your password, the encrypted data key, and encrypted answers. It cannot read your answers.
- **Recovery code.** When you create an account you get a recovery code, shown once. It is the only way back in if you lose your password. Nobody at this site can recover it for you. If you lose both the password and the code, the answers cannot be recovered.
- **Sign-out** removes the answers from the device and keeps them in your account.
- **Password change or recovery** signs out your other devices.

## Accounts setup (for the site owner)

The Worker lives in `worker/`. It uses Cloudflare Workers and D1.

```bash
cd worker
npx wrangler login
npx wrangler d1 create self-authoring-suite      # copy the database_id into wrangler.jsonc
npx wrangler d1 execute self-authoring-suite --remote --file=schema.sql
npx wrangler secret put PEPPER                    # a long random string; never commit it
npx wrangler deploy
```

Then set `apiBase` in `config.js` to the Worker's URL (for example `https://self-authoring-api.<account>.workers.dev`), and push. Until then the Account page says accounts are not connected yet, and everything still works on this device.

For local testing: create `worker/.dev.vars` with `PEPPER=...` (never committed), apply the schema locally with `npx wrangler d1 execute self-authoring-suite --local --persist-to .wrangler/state --file=schema.sql`, start `npx wrangler dev --local --persist-to .wrangler/state --port 8787`, serve this folder on port 8000, and run `node tests/e2e.js`.

## Contributing

Ideas, prompt improvements, accessibility fixes, and new modules are welcome. Open an issue first for larger changes so the direction stays coherent.

## License

Not yet chosen. Add a `LICENSE` file before accepting outside contributions.
