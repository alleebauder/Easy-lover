# Self Authoring Suite

A free, private, local-first self-reflection suite. Five guided modules take you from your history, through an honest look at your faults and strengths, to a direction and a plan. A weekly review keeps the work alive.

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
| Weekly review | Each week: did I follow through, what went well, what drained me, one priority. Follow-through is charted over time. |

Modules on the roadmap (Values in Action, Relationship Ledger, Habit Lab, Meaning and Calling, Shared Review) are listed on the site and in [ROADMAP.md](ROADMAP.md).

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
modules.js    all content: prompts, checklist options, and roadmap cards
app.js        engine: storage, navigation, progress, weekly review, export
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

Section kinds are `text` (free writing), `choose` (tick up to `max` options from `options`), and `list` (short lines, optionally capped with `max`).

## Your data and privacy

- Everything you write is stored in `localStorage` in the browser you use. Nothing is sent to a server.
- Clearing your browser's site data erases it. Export a JSON backup first if you want to keep it.
- Restoring a backup replaces what is currently saved in that browser, after you confirm.

## Contributing

Ideas, prompt improvements, accessibility fixes, and new modules are welcome. Open an issue first for larger changes so the direction stays coherent.

## License

Not yet chosen. Add a `LICENSE` file before accepting outside contributions.
