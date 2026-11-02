/* Computed summaries shown under table-row answers. Each takes the rows and the full answers state,
   and returns plain sentences. Named in modules.js with `summary: "<name>"`. */
(function () {
  "use strict";

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function pct(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  }

  var summaries = {
    // Values in Action: how the logged week splits across the user's values.
    valueTime: function (rows, state) {
      var values = (state.answers["future/values"] || []).filter(function (v) { return String(v).trim() !== ""; });
      var totalHours = 0, totalSpend = 0, unvalued = 0;
      var byValue = {};
      values.forEach(function (v) { byValue[v] = 0; });
      rows.forEach(function (r) {
        var h = num(r.hours);
        totalHours += h;
        totalSpend += num(r.spend);
        if (r.value && byValue.hasOwnProperty(r.value)) byValue[r.value] += h;
        else unvalued += h;
      });
      if (totalHours === 0 && totalSpend === 0) return [];
      var lines = ["Logged: " + totalHours + " hours a week and $" + totalSpend + " a month."];
      if (!values.length) {
        lines.push("Name your five values in Future Self to see how your time lines up with them.");
        return lines;
      }
      values.forEach(function (v) {
        lines.push(v + ": " + byValue[v] + " hours a week (" + pct(byValue[v], totalHours) + "%).");
      });
      var empty = values.filter(function (v) { return byValue[v] === 0; });
      if (empty.length) lines.push("No logged time backs: " + empty.join(", ") + ".");
      lines.push("Serves no value: " + unvalued + " hours a week (" + pct(unvalued, totalHours) + "%).");
      return lines;
    },

    // Relationship Ledger: who gives more energy than they cost, and who costs more.
    ledgerNet: function (rows) {
      var people = rows.filter(function (r) { return r.name && (r.gives || r.costs); })
        .map(function (r) { return { name: r.name, net: num(r.gives) - num(r.costs) }; });
      if (!people.length) return [];
      var draining = people.filter(function (p) { return p.net < 0; }).sort(function (a, b) { return a.net - b.net; });
      var giving = people.filter(function (p) { return p.net > 0; }).sort(function (a, b) { return b.net - a.net; });
      var lines = [];
      if (draining.length) lines.push("Costs more than it gives: " + draining.map(function (p) { return p.name + " (" + p.net + ")"; }).join(", ") + ".");
      if (giving.length) lines.push("Gives more than it costs: " + giving.map(function (p) { return p.name + " (+" + p.net + ")"; }).join(", ") + ".");
      if (!draining.length && !giving.length) lines.push("Energy in and out is balanced for everyone you listed.");
      return lines;
    },

    // Habit Lab: how often each experiment was kept, and the average across them.
    habitLab: function (rows) {
      var tested = rows.filter(function (r) { return r.habit && r.days !== "" && r.days !== undefined; });
      if (!tested.length) return [];
      var lines = tested.map(function (r) {
        var days = Math.min(14, Math.max(0, num(r.days)));
        var line = r.habit + ": kept " + days + " of 14 days (" + pct(days, 14) + "%)";
        if (r.verdict) line += ", verdict: " + r.verdict.toLowerCase();
        return line + ".";
      });
      var avg = Math.round(tested.reduce(function (sum, r) { return sum + Math.min(14, Math.max(0, num(r.days))); }, 0) / tested.length);
      lines.push("Average kept: " + avg + " of 14 days.");
      return lines;
    }
  };

  window.SASummaries = summaries;
})();
