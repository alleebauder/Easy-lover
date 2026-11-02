# Roadmap

The suite is meant to grow one module at a time. Each module is plain content in `modules.js`, so new work can ship without reworking the engine.

## Now (v1.0)

- [x] Past Authoring: epochs, ten experiences, three deep-dives, patterns, people and energy, honest friend
- [x] Present Authoring: Faults and Virtues, both built on the five Big Five dimensions
- [x] Future Authoring: daydream, future to avoid, values, seven life areas, ranked goals
- [x] The Plan: anchor fault and virtue, if-then commitments, first step, obstacle, witness
- [x] Weekly review with follow-through trend
- [x] Export to Markdown and JSON, restore from JSON, print to PDF, erase
- [x] Accounts with end-to-end encrypted sync (Cloudflare Worker + D1), recovery code, password change
- [x] Light and dark mode, keyboard navigation, reduced-motion support

## Next (v1.1)

- [ ] Light/dark toggle in the top bar, in addition to following the system setting (accounts and encrypted sync are built; deploy the Worker to switch them on)
- [ ] Module completion state on the overview (a finished-module badge)
- [ ] A short guide for each module on when to return to it
- [ ] Prompt review pass: tighten wording and add a second example per prompt
- [ ] Automated checks for the module format and for localStorage round-trips

## Later

- [ ] Optional encrypted sync between your own devices (no account, end-to-end encrypted)
- [ ] Printable workbook layout for group or coaching use

## Ideas, not yet scheduled

- Translations, starting with Spanish
- A facilitator guide for running the suite in small groups
- Charts for domain ratings over time, not only follow-through
- Short audio or video introductions to each module

## Principles

1. **Private by default.** Nothing leaves the browser unless the person exports it.
2. **No grading.** Prompts invite honesty; the suite never scores a person's character.
3. **Plain content.** Anyone who can edit a JavaScript object can add or change a module.
4. **No build step.** The site stays a folder of static files that GitHub Pages serves directly.
5. **Original prompts.** Every prompt is written for this project.

## Version log

- **1.2.0**: accounts with end-to-end encrypted sync and a recovery code; five modules built out; table-row fields with summaries.
- **1.1.0**: rebuilt to follow the original's structure: Past by epochs, Present split into Faults and Virtues on the Big Five, Future with daydream and goal refinement. Added pacing notes, crisis line, sources file.
- **1.0.0**: first complete release. Four active modules, weekly review, export and restore.
