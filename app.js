(function () {
  "use strict";

  var APP_ID = "self-authoring-suite";
  var STORAGE_KEY = "self-authoring-suite:v1";
  var CRISIS_LINE = "If anything here leaves you feeling unsafe or thinking about harming yourself, contact emergency services or a crisis line now. In the US, call or text 988.";
  var MODULES = window.SA_MODULES || [];
  var ACTIVE = MODULES.filter(function (m) { return m.status === "active"; });
  var COMING = MODULES.filter(function (m) { return m.status !== "active"; });

  var state = load();
  var saveTimer = null;
  var toastTimer = null;
  var currentRoute = "";

  /* ---------- storage ---------- */

  function emptyState() {
    return { version: 1, answers: {}, reviews: [] };
  }

  function normalize(data) {
    var out = emptyState();
    if (data && data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)) {
      out.answers = data.answers;
    }
    if (data && Array.isArray(data.reviews)) {
      out.reviews = data.reviews.filter(function (r) {
        return r && typeof r.week === "string";
      });
    }
    return out;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : emptyState();
    } catch (err) {
      return emptyState();
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStatus("Saved in this browser");
    } catch (err) {
      setStatus("Could not save in this browser");
    }
    renderSidebar(currentRoute);
  }

  function scheduleSave() {
    setStatus("Saving...");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }

  function setStatus(text) {
    var node = document.getElementById("save-state");
    if (node) node.textContent = text;
  }

  /* ---------- answers and progress ---------- */

  function sectionKey(mod, section) {
    return mod.id + "/" + section.id;
  }

  function isListKind(section) {
    return section.kind === "list" || section.kind === "choose";
  }

  function isFilled(section, value) {
    if (value === null || value === undefined) return false;
    if (isListKind(section)) {
      return Array.isArray(value) && value.some(function (x) { return String(x).trim() !== ""; });
    }
    return typeof value === "string" && value.trim() !== "";
  }

  function moduleProgress(mod) {
    var done = mod.sections.filter(function (s) {
      return isFilled(s, state.answers[sectionKey(mod, s)]);
    }).length;
    return { done: done, total: mod.sections.length };
  }

  function percent(progress) {
    return progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  }

  function commit(key, value, card, section) {
    state.answers[key] = value;
    card.classList.toggle("is-done", isFilled(section, value));
    scheduleSave();
  }

  /* ---------- helpers ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  function findActive(id) {
    return ACTIVE.filter(function (m) { return m.id === id; })[0];
  }

  function labelFor(id) {
    if (id === "review") return "Weekly review";
    var mod = findActive(id);
    return mod ? mod.title : "Overview";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2), value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value === true ? "" : String(value));
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function progressBar(label, pct) {
    var fill = el("span");
    fill.style.width = pct + "%";
    return el("div", {
      class: "progress",
      role: "progressbar",
      "aria-label": label,
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": String(pct)
    }, [fill]);
  }

  function autosize(area) {
    area.style.height = "auto";
    area.style.height = (area.scrollHeight + 4) + "px";
  }

  function scoreText(score) {
    return typeof score === "number" ? score + " / 10" : "Not rated yet";
  }

  function scoreControl(score, label, onChange) {
    var readout = el("span", { class: "score-out", text: scoreText(score) });
    var range = el("input", {
      type: "range",
      min: "1",
      max: "10",
      step: "1",
      value: score || 5,
      "aria-label": label
    });
    range.addEventListener("input", function () {
      var next = Number(range.value);
      readout.textContent = scoreText(next);
      onChange(next);
    });
    return el("div", { class: "score-row" }, [range, readout]);
  }

  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function byWeekDesc(a, b) {
    if (a.week === b.week) return 0;
    return a.week < b.week ? 1 : -1;
  }

  function toast(message) {
    var node = $("toast");
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-visible"); }, 2800);
  }

  function crisisNote() {
    return el("p", { class: "crisis", text: CRISIS_LINE });
  }

  /* ---------- sidebar ---------- */

  function navItem(id, label, progress, active) {
    return el("a", {
      class: "nav-item" + (active ? " is-active" : ""),
      href: "#/" + id,
      "aria-current": active ? "page" : null
    }, [
      el("span", { class: "nav-title", text: label }),
      progress ? el("span", { class: "nav-count", text: progress.done + "/" + progress.total }) : null
    ]);
  }

  function renderSidebar(current) {
    var nav = $("sidebar");
    nav.textContent = "";
    nav.appendChild(el("p", { class: "nav-label", text: "Modules" }));
    nav.appendChild(navItem("", "Overview", null, current === ""));
    ACTIVE.forEach(function (mod) {
      nav.appendChild(navItem(mod.id, mod.number + "  " + mod.title, moduleProgress(mod), current === mod.id));
    });
    nav.appendChild(el("p", { class: "nav-label", text: "Practice" }));
    nav.appendChild(navItem("review", "Weekly review", null, current === "review"));
    nav.appendChild(navItem("export", "Export and privacy", null, current === "export"));
    nav.appendChild(el("p", { class: "nav-label", text: "On the roadmap" }));
    COMING.forEach(function (mod) {
      nav.appendChild(el("span", { class: "nav-item is-locked" }, [
        el("span", { class: "nav-title", text: mod.number + "  " + mod.title }),
        el("span", { class: "pill", text: "Soon" })
      ]));
    });
  }

  /* ---------- section fields ---------- */

  function textField(key, section, value, card) {
    var area = el("textarea", {
      class: "answer",
      rows: 4,
      placeholder: section.placeholder || "Write freely. Nothing here is graded.",
      "aria-label": section.title,
      value: value || ""
    });
    area.addEventListener("input", function () {
      autosize(area);
      commit(key, area.value, card, section);
    });
    requestAnimationFrame(function () { autosize(area); });
    return area;
  }

  function listField(key, section, value, card) {
    var max = section.max || 99;
    var items = Array.isArray(value) && value.length ? value.slice() : [""];
    var list = el("ul", { class: "list-items" });
    var addBtn = el("button", { type: "button", class: "btn ghost", text: "+ Add a line" });

    function store() {
      commit(key, items.map(function (t) { return t.trim(); }).filter(Boolean), card, section);
    }

    function render() {
      list.textContent = "";
      items.forEach(function (text, i) {
        var input = el("input", {
          type: "text",
          class: "answer-line",
          value: text,
          placeholder: section.placeholder || "Write one line",
          "aria-label": section.title + ", line " + (i + 1)
        });
        input.addEventListener("input", function () {
          items[i] = input.value;
          store();
        });
        var remove = el("button", {
          type: "button",
          class: "icon-btn",
          text: "×",
          "aria-label": "Remove line " + (i + 1),
          onclick: function () {
            items.splice(i, 1);
            if (!items.length) items.push("");
            render();
            store();
          }
        });
        list.appendChild(el("li", {}, [input, remove]));
      });
      addBtn.disabled = items.length >= max;
    }

    addBtn.addEventListener("click", function () {
      if (items.length >= max) return;
      items.push("");
      render();
      var inputs = list.querySelectorAll("input");
      inputs[inputs.length - 1].focus();
    });

    render();
    return el("div", { class: "list-field" }, [
      list,
      addBtn,
      section.max ? el("p", { class: "help small", text: "Up to " + max + " lines." }) : null
    ]);
  }

  function chooseField(key, section, value, card) {
    var max = section.max || 99;
    var selected = Array.isArray(value) ? value.slice() : [];
    var boxes = [];
    var counter = el("p", { class: "help small" });

    function refresh() {
      counter.textContent = selected.length + " of up to " + max + " selected";
      boxes.forEach(function (box) {
        box.disabled = !box.checked && selected.length >= max;
      });
    }

    var list = el("ul", { class: "choices" });
    section.options.forEach(function (option) {
      var input = el("input", { type: "checkbox", checked: selected.indexOf(option) !== -1 });
      input.addEventListener("change", function () {
        if (input.checked) selected.push(option);
        else selected.splice(selected.indexOf(option), 1);
        commit(key, selected.slice(), card, section);
        refresh();
      });
      boxes.push(input);
      list.appendChild(el("li", {}, [el("label", {}, [input, el("span", { text: option })])]));
    });

    refresh();
    return el("div", { class: "choose-field" }, [list, counter]);
  }

  function sectionCard(mod, section, number) {
    var key = sectionKey(mod, section);
    var value = state.answers[key];
    var titleId = mod.id + "-" + section.id + "-title";
    var card = el("section", { class: "card", id: mod.id + "-" + section.id, "aria-labelledby": titleId });

    card.appendChild(el("div", { class: "card-head" }, [
      el("span", { class: "card-num", text: String(number) }),
      el("h2", { id: titleId, text: section.title })
    ]));
    card.appendChild(el("p", { class: "prompt", text: section.prompt }));
    if (section.help) card.appendChild(el("p", { class: "help", text: section.help }));

    var field;
    if (section.kind === "list") field = listField(key, section, value, card);
    else if (section.kind === "choose") field = chooseField(key, section, value, card);
    else field = textField(key, section, value, card);

    card.appendChild(field);
    card.classList.toggle("is-done", isFilled(section, value));
    return card;
  }

  /* ---------- views ---------- */

  function pager(id) {
    var order = [""].concat(ACTIVE.map(function (m) { return m.id; }), ["review"]);
    var i = order.indexOf(id);
    var links = [];
    if (i > 0) links.push(el("a", { class: "btn ghost", href: "#/" + order[i - 1], text: "← " + labelFor(order[i - 1]) }));
    if (i > -1 && i < order.length - 1) links.push(el("a", { class: "btn primary", href: "#/" + order[i + 1], text: labelFor(order[i + 1]) + " →" }));
    return el("nav", { class: "pager", "aria-label": "Continue" }, links);
  }

  function renderModule(main, mod) {
    var progress = moduleProgress(mod);
    main.appendChild(el("header", { class: "page-head" }, [
      el("p", { class: "eyebrow", text: "Module " + mod.number }),
      el("h1", { text: mod.title }),
      el("p", { class: "lede", text: mod.subtitle }),
      el("p", { class: "intro", text: mod.intro }),
      mod.note ? el("p", { class: "callout", text: mod.note }) : null,
      progressBar(mod.title + " progress", percent(progress)),
      el("p", { class: "muted small", text: progress.done + " of " + progress.total + " sections answered" + (mod.time ? "  ·  Time: " + mod.time : "") })
    ]));
    mod.sections.forEach(function (section, i) {
      main.appendChild(sectionCard(mod, section, i + 1));
    });
    main.appendChild(pager(mod.id));
    main.appendChild(crisisNote());
  }

  function step(title, text) {
    return el("li", {}, [el("strong", { text: title }), el("p", { text: text })]);
  }

  function moduleTile(mod) {
    var progress = moduleProgress(mod);
    return el("a", { class: "tile", href: "#/" + mod.id }, [
      el("span", { class: "eyebrow", text: "Module " + mod.number }),
      el("h3", { text: mod.title }),
      el("p", { class: "tile-sub", text: mod.subtitle }),
      progressBar(mod.title + " progress", percent(progress)),
      el("p", { class: "muted small", text: progress.done + " of " + progress.total + " answered" })
    ]);
  }

  function comingTile(mod) {
    return el("div", { class: "tile is-locked" }, [
      el("span", { class: "eyebrow", text: "Module " + mod.number }),
      el("h3", { text: mod.title }),
      el("p", { class: "tile-sub", text: mod.summary }),
      el("span", { class: "pill", text: "Coming" })
    ]);
  }

  function renderHome(main) {
    var anyProgress = ACTIVE.some(function (m) { return moduleProgress(m).done > 0; });
    var next = ACTIVE.filter(function (m) { var p = moduleProgress(m); return p.done < p.total; })[0];
    var target = anyProgress && next ? next : ACTIVE[0];
    var cta = (anyProgress && next ? "Continue with " : "Begin with ") + target.title;

    main.appendChild(el("header", { class: "hero" }, [
      el("p", { class: "eyebrow", text: "A self-authoring suite" }),
      el("h1", { text: "Look back honestly. Take stock. Author the next chapter." }),
      el("p", { class: "lede", text: "Five guided modules move you from your history, through an honest look at your strengths and faults, to a direction and a plan. A weekly review keeps the work alive. Everything stays in this browser unless you choose to export it." }),
      el("div", { class: "hero-actions" }, [
        el("a", { class: "btn primary", href: "#/" + target.id, text: cta + " →" })
      ])
    ]));

    main.appendChild(el("h2", { class: "section-title", text: "The path" }));
    main.appendChild(el("ol", { class: "steps" }, [
      step("Look back", "Past Self: map your life into chapters, and examine the experiences that shaped you."),
      step("Take stock", "Present: Faults and Virtues, organized by five personality dimensions."),
      step("Look ahead", "Future Self: daydream your direction, name what to avoid, then set goals you control."),
      step("Commit", "The Plan: turn direction into if-then commitments, a first step, and a witness.")
    ]));
    main.appendChild(el("p", { class: "callout" }, [
      "The order is flexible. Past is a natural start. If you want to test your honesty before the emotional material, start with Faults. Then repeat every week in the ",
      el("a", { href: "#/review", text: "weekly review" }),
      "."
    ]));

    main.appendChild(el("h2", { class: "section-title", text: "Modules" }));
    main.appendChild(el("div", { class: "grid" }, ACTIVE.map(moduleTile)));

    main.appendChild(el("h2", { class: "section-title", text: "Coming to the suite" }));
    main.appendChild(el("p", { class: "muted", text: "Each one is planned in ROADMAP.md. Modules are added as plain data, so the suite can grow without a rewrite." }));
    main.appendChild(el("div", { class: "grid" }, COMING.map(comingTile)));

    main.appendChild(el("div", { class: "privacy card" }, [
      el("h2", { text: "Private by design" }),
      el("p", { text: "Answers are saved in this browser's local storage. There is no account, no server, and no analytics. Export a backup before you clear your browser or switch devices." })
    ]));
    main.appendChild(crisisNote());
  }

  function reviewField(review, key, label, prompt) {
    var id = "rv-" + review.week + "-" + key;
    var area = el("textarea", {
      class: "answer",
      id: id,
      rows: 3,
      value: review[key] || ""
    });
    area.addEventListener("input", function () {
      autosize(area);
      review[key] = area.value;
      scheduleSave();
    });
    requestAnimationFrame(function () { autosize(area); });
    return el("div", { class: "review-field" }, [
      el("label", { class: "field-label", htmlFor: id, text: label }),
      el("p", { class: "help", text: prompt }),
      area
    ]);
  }

  function reviewCard(review, open) {
    var summary = el("summary", {});
    function refreshSummary() {
      summary.textContent = "Week " + review.week + (typeof review.score === "number" ? "  ·  " + review.score + " / 10" : "");
    }
    refreshSummary();

    var score = scoreControl(review.score, "Plan follow-through for week " + review.week + ", 1 to 10", function (next) {
      review.score = next;
      refreshSummary();
      scheduleSave();
    });

    var remove = el("button", {
      type: "button",
      class: "btn ghost danger",
      text: "Delete this review",
      onclick: function () {
        if (!window.confirm("Delete the review for week " + review.week + "?")) return;
        state.reviews = state.reviews.filter(function (r) { return r !== review; });
        persist();
        route();
      }
    });

    return el("details", { class: "card review", open: open }, [
      summary,
      el("p", { class: "help", text: "How closely did I live by my plan this week?" }),
      score,
      reviewField(review, "planHonored", "Plan follow-through", "Which commitments did I keep, and which did I drop?"),
      reviewField(review, "wins", "Wins", "What went well, including small things?"),
      reviewField(review, "drains", "Drains", "What drained energy or pulled me off course?"),
      reviewField(review, "priority", "One priority for next week", "Name the one thing that matters most, and put a day on it."),
      el("div", { class: "review-actions" }, [remove])
    ]);
  }

  function renderReviews(main) {
    var week = isoWeek(new Date());
    var hasThisWeek = state.reviews.some(function (r) { return r.week === week; });
    var sorted = state.reviews.slice().sort(byWeekDesc);

    main.appendChild(el("header", { class: "page-head" }, [
      el("p", { class: "eyebrow", text: "Practice" }),
      el("h1", { text: "Weekly review" }),
      el("p", { class: "lede", text: "Ten minutes each week keeps the suite alive. Look at what happened, compare it with your plan, and choose one priority for next week." })
    ]));

    if (hasThisWeek) {
      main.appendChild(el("p", { class: "muted", text: "This week's review (" + week + ") is open below." }));
    } else {
      main.appendChild(el("button", {
        type: "button",
        class: "btn primary",
        text: "Start this week's review (" + week + ")",
        onclick: function () {
          state.reviews.unshift({ week: week, score: null, planHonored: "", wins: "", drains: "", priority: "" });
          persist();
          route();
        }
      }));
    }

    var scored = sorted.filter(function (r) { return typeof r.score === "number"; }).slice(0, 12).reverse();
    if (scored.length > 1) {
      var bars = el("div", { class: "bars", role: "img", "aria-label": "Plan follow-through scores over recent weeks" });
      scored.forEach(function (r) {
        var bar = el("div", { class: "bar", title: r.week + ": " + r.score + " / 10" });
        bar.style.height = (r.score * 10) + "%";
        bars.appendChild(bar);
      });
      main.appendChild(el("section", { class: "trend" }, [
        el("h2", { class: "section-title", text: "Follow-through over time" }),
        bars,
        el("p", { class: "muted small", text: "Oldest on the left. Each bar is one week's score." })
      ]));
    }

    if (sorted.length) {
      main.appendChild(el("h2", { class: "section-title", text: "Past reviews" }));
      sorted.forEach(function (review, index) {
        main.appendChild(reviewCard(review, index === 0));
      });
    }

    main.appendChild(pager("review"));
  }

  function buildMarkdown() {
    var lines = ["# Self Authoring Suite", "", "_Exported " + todayISO() + "_", ""];

    ACTIVE.forEach(function (mod) {
      var body = [];
      mod.sections.forEach(function (section) {
        var value = state.answers[sectionKey(mod, section)];
        if (!isFilled(section, value)) return;
        body.push("### " + section.title, "", "_" + section.prompt + "_", "");
        if (isListKind(section)) {
          value.forEach(function (item) {
            if (String(item).trim()) body.push("- " + String(item).trim());
          });
          body.push("");
        } else {
          body.push(value.trim(), "");
        }
      });
      if (body.length) lines.push("## " + mod.number + " " + mod.title, "", body.join("\n"));
    });

    var sorted = state.reviews.slice().sort(byWeekDesc);
    if (sorted.length) {
      lines.push("## Weekly reviews", "");
      sorted.forEach(function (r) {
        lines.push("### Week " + r.week + (typeof r.score === "number" ? "  ·  " + r.score + " / 10" : ""), "");
        [["Plan follow-through", "planHonored"], ["Wins", "wins"], ["Drains", "drains"], ["Next priority", "priority"]].forEach(function (pair) {
          var text = String(r[pair[1]] || "").trim();
          if (text) lines.push("**" + pair[0] + ":** " + text, "");
        });
      });
    }
    return lines.join("\n") + "\n";
  }

  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var link = el("a", { href: url, download: name });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function restoreFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (err) {
        data = null;
      }
      if (!data || data.app !== APP_ID || !data.answers || typeof data.answers !== "object") {
        toast("That file is not a Self Authoring Suite backup.");
        return;
      }
      if (!window.confirm("Replace what is saved in this browser with this backup?")) return;
      state = normalize(data);
      persist();
      route();
      toast("Backup restored.");
    };
    reader.readAsText(file);
  }

  function renderExport(main) {
    var answerCount = 0;
    ACTIVE.forEach(function (mod) {
      mod.sections.forEach(function (section) {
        if (isFilled(section, state.answers[sectionKey(mod, section)])) answerCount += 1;
      });
    });

    main.appendChild(el("header", { class: "page-head" }, [
      el("p", { class: "eyebrow", text: "Practice" }),
      el("h1", { text: "Export and privacy" }),
      el("p", { class: "lede", text: "Your writing lives only in this browser. Export a copy whenever you want one, or move your data to another device." }),
      el("p", { class: "muted small", text: answerCount + " answers and " + state.reviews.length + " weekly reviews saved." })
    ]));

    var confirmInput = el("input", {
      type: "text",
      class: "answer-line",
      placeholder: "Type ERASE",
      "aria-label": "Type ERASE to confirm"
    });
    var eraseBtn = el("button", { type: "button", class: "btn danger", text: "Erase everything", disabled: true });
    confirmInput.addEventListener("input", function () {
      eraseBtn.disabled = confirmInput.value !== "ERASE";
    });
    eraseBtn.addEventListener("click", function () {
      if (confirmInput.value !== "ERASE") return;
      state = emptyState();
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
      route();
      toast("All data erased from this browser.");
    });

    var fileInput = el("input", {
      type: "file",
      accept: "application/json,.json",
      "aria-label": "Choose a backup file to restore"
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) restoreFromFile(fileInput.files[0]);
      fileInput.value = "";
    });

    main.appendChild(el("section", { class: "card" }, [
      el("h2", { text: "Export" }),
      el("p", { class: "help", text: "Markdown reads well and prints cleanly. JSON is a full backup you can restore later." }),
      el("div", { class: "button-row" }, [
        el("button", {
          type: "button",
          class: "btn primary",
          text: "Download Markdown",
          onclick: function () {
            download("self-authoring-suite-" + todayISO() + ".md", buildMarkdown(), "text/markdown");
          }
        }),
        el("button", {
          type: "button",
          class: "btn",
          text: "Download JSON backup",
          onclick: function () {
            var payload = { app: APP_ID, version: 1, exportedAt: new Date().toISOString(), answers: state.answers, reviews: state.reviews };
            download("self-authoring-suite-" + todayISO() + ".json", JSON.stringify(payload, null, 2), "application/json");
          }
        }),
        el("button", { type: "button", class: "btn", text: "Print or save as PDF", onclick: function () { window.print(); } })
      ])
    ]));

    main.appendChild(el("section", { class: "card" }, [
      el("h2", { text: "Restore" }),
      el("p", { class: "help", text: "Choose a JSON backup from this suite. It replaces what is currently saved in this browser." }),
      fileInput
    ]));

    main.appendChild(el("section", { class: "card danger-zone" }, [
      el("h2", { text: "Erase" }),
      el("p", { class: "help", text: "Removes every answer and review from this browser. This cannot be undone unless you have a backup." }),
      el("div", { class: "button-row" }, [confirmInput, eraseBtn])
    ]));
  }

  /* ---------- router ---------- */

  function route() {
    var raw = (window.location.hash || "").replace(/^#\/?/, "");
    var first = raw.split("/").filter(Boolean)[0] || "";
    currentRoute = first;

    var main = $("main");
    main.textContent = "";

    var mod = findActive(first);
    if (mod) renderModule(main, mod);
    else if (first === "review") renderReviews(main);
    else if (first === "export") renderExport(main);
    else renderHome(main);

    renderSidebar(first);
    document.body.classList.remove("nav-open");
    $("nav-toggle").setAttribute("aria-expanded", "false");
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  /* ---------- boot ---------- */

  $("nav-toggle").addEventListener("click", function () {
    var open = document.body.classList.toggle("nav-open");
    this.setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("hashchange", route);
  route();
})();
