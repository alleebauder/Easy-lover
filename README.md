# Self Authoring Suite

A free, private, local-first self-reflection suite. Four guided modules move you from an honest look at the past to specific commitments for the future, and a weekly review keeps the work alive.

This is an independent, original take on structured self-authoring. It is not affiliated with or endorsed by the original Self Authoring Suite or its authors. All prompts here were written for this project.

**Live site:** `https://<your-username>.github.io/self-authoring-suite/` (replace after enabling GitHub Pages)

## What is inside

| Module | Question it answers |
| --- | --- |
| 01 Past Self | Where have I been? Credit I have not given myself, turning points, gaps between word and deed, recurring patterns, energy in relationships, an honest friend's view. |
| 02 Present Self | Where do I stand? A 1–10 rating and a note for eight areas of life, plus what I am avoiding, running on autopilot, and should protect. |
| 03 Future Self | Where am I going? Five values, an ordinary day three years out, three traits I am building, a one-year success condition, a five-year direction. |
| 04 The Plan | What will I do? One anchor area, up to three if-then commitments, a first step with a time on it, an expected obstacle, and a witness. |
| Weekly review | Each week: did I follow through, what went well, what drained me, one priority for next week. Scores are charted over time. |

Modules on the roadmap (Values in Action, Relationship Ledger, Habit Lab, Meaning and Calling, Shared Review) are listed on the site and in [ROADMAP.md](ROADMAP.md).

## Where this improves on a one-time workbook

- **It repeats.** A one-off exercise fades. The weekly review turns it into a practice and charts follow-through over time.
- **Commitments are specific.** The plan asks for if-then statements, a first step with a day and time, and a named witness, which are the parts most likely to change behavior.
- **It is private by default.** No account, no server, no analytics. Answers stay in your browser's local storage.
- **You can take it with you.** Export to Markdown for reading, JSON for a full backup, or print to PDF.
- **It is built to grow.** Modules are plain data in `modules.js`. Adding one does not require touching the rest of the code.
- **It works everywhere.** Mobile-friendly, keyboard-navigable, respects light and dark mode and reduced motion, and has no build step or external dependencies.

## Run it locally

No build step is needed. Either open `index.html` in a browser, or serve the folder:

```bash
cd self-authoring-suite
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish on GitHub Pages

1. Create a repository named `self-authoring-suite` and push this folder to it on the `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main`, and folder `/ (root)`.
4. Save. The site appears at `https://<your-username>.github.io/self-authoring-suite/` within a minute or two.

The included `.nojekyll` file tells GitHub Pages to serve the files as they are.

## Project layout

```
index.html    page shell
styles.css    all styling (light and dark, print styles included)
modules.js    all content: module titles, prompts, and roadmap cards
app.js        engine: storage, navigation, progress, weekly review, export
ROADMAP.md    where the project is going
```

### Adding a module

Open `modules.js` and add an object to `window.SA_MODULES`:

```js
{
  id: "my-module",
  status: "active",          // or "coming" to show it as a roadmap card
  number: "10",
  title: "My Module",
  subtitle: "A short question it answers",
  intro: "One paragraph on why this matters.",
  sections: [
    { id: "first", kind: "text", title: "Heading", prompt: "The question." },
    { id: "scores", kind: "domain", title: "Area", prompt: "Rate it." },
    { id: "items", kind: "list", title: "Lines", prompt: "Name up to three.", max: 3 }
  ]
}
```

Section kinds are `text` (free writing), `list` (short lines, optionally capped with `max`), and `domain` (a 1–10 rating with a note).

## Your data and privacy

- Everything you write is stored in `localStorage` in the browser you use. Nothing is sent to a server.
- Clearing your browser's site data erases it. Export a JSON backup first if you want to keep it.
- Restoring a backup replaces what is currently saved in that browser, after you confirm.

## Contributing

Ideas, prompt improvements, accessibility fixes, and new modules are welcome. Please open an issue first for larger changes so the direction stays coherent. See [ROADMAP.md](ROADMAP.md) for what is planned.

## License

Not yet chosen. Add a `LICENSE` file before accepting outside contributions.
