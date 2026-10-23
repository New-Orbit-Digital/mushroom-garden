// The side panel: coins, weather, basket, spores, buyers, the journal and the build palette. Reads state, never changes it.

import { findById, placeablePieces, pieceName, cellCost, mushroomStage, stageShareLeft, salePrice, titleFor, pieceReleased } from "../engine/rules.js";
import { featureOn } from "../engine/conditions.js";
import { journal, nextRelease, rankProgress } from "../engine/query.js";
import { formatClock } from "./draw.js";

export function buildPalette(el, content, tuning, onSelect) {
  el.textContent = "";
  for (const piece of placeablePieces(content)) {
    const users = content.species.filter((s) => s.needs.indexOf(piece.id) >= 0).map((s) => s.name);
    const notes = [];
    if (piece.does) notes.push(piece.does);
    if (users.length) notes.push("for " + users.join(", "));
    const button = document.createElement("button");
    button.type = "button";
    button.id = "piece-" + piece.id;
    button.textContent = piece.name + " · " + tuning.pieceCost[piece.id] + " coins";
    const small = document.createElement("small");
    small.textContent = notes.join("; ");
    button.appendChild(small);
    button.addEventListener("click", () => onSelect(piece.id));
    el.appendChild(button);
  }
}

export function markPalette(el, selectedPiece) {
  for (const button of el.children) {
    button.setAttribute("aria-pressed", String(button.id === "piece-" + selectedPiece));
  }
}

// A label as a sentence: capital first letter, one full stop at the end.
export function sentence(text) {
  return text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? "" : ".");
}

export function renderHud(els, state, content, tuning, view) {
  const ui = tuning.ui;
  const nameOf = (id) => findById(content.species, id).name;

  const progress = rankProgress(state, tuning);
  const share = Math.min(ui.percent, Math.round((progress.into / progress.need) * ui.percent));
  let stats =
    "Rank <b>" + state.rank + "</b> " + titleFor(content, tuning, state.rank) +
    " <span class=\"bar xp\" title=\"" + progress.into + " of " + progress.need + " xp\"><i style=\"width:" + share + "%\"></i></span> " +
    progress.into + "/" + progress.need + " xp<br>" +
    "Coins <b>" + state.coins + "</b> &nbsp; Compost <b>" + state.compost + "</b> &nbsp; Played " +
    formatClock(tuning, state.time) + (view.paused ? " &nbsp; PAUSED" : "");
  const coming = nextRelease(state, content, tuning);
  if (featureOn(tuning, "ranks") && coming) {
    stats += "<br><span class=\"note\">Rank " + coming.rank + " brings: " + coming.items.join(", ") + ".</span>";
  }
  if (state.weather.kind) {
    stats +=
      "<br>Weather <b>" + findById(content.weather, state.weather.kind).name + "</b>, then " +
      findById(content.weather, state.weather.next).name + " in " + formatClock(tuning, state.weather.left);
  }
  if (featureOn(tuning, "conditions")) {
    stats += "<br><span class=\"note\">Colony bars, top to bottom: moisture, air, light. Green is the band it likes.</span>";
  }
  els.stats.innerHTML = stats;

  // Build palette: pieces not yet released show the rank that opens them.
  for (const piece of placeablePieces(content)) {
    const button = document.getElementById("piece-" + piece.id);
    if (!button) continue;
    const open = pieceReleased(state, tuning, piece.id);
    button.classList.toggle("locked", !open);
    button.dataset.lock = open ? "" : "opens at rank " + tuning.pieceRank[piece.id];
  }

  if (view.build) {
    els.hint.textContent =
      "Build mode. Click a cell you own to place " + pieceName(content, view.selectedPiece) +
      " (" + tuning.pieceCost[view.selectedPiece] + " coins). Click a light green cell to buy it (" +
      cellCost(tuning, state.cellsBought) + " coins). B to leave.";
  } else if (view.hint && view.hint.action) {
    els.hint.textContent = "Click: " + view.hint.label;
  } else if (view.hint) {
    els.hint.textContent = sentence(view.hint.label);
  } else {
    els.hint.textContent = "Point at something to see what a click does.";
  }
  els.message.textContent = view.message || "";

  // Basket: one row per mushroom with a freshness bar.
  els.basketTitle.textContent = "Basket " + state.basket.length + " / " + tuning.basketSize;
  let html = "";
  for (const m of state.basket) {
    const stage = mushroomStage(tuning, m);
    const share = Math.round(stageShareLeft(tuning, m) * ui.percent);
    html +=
      "<div class=\"row\"><span class=\"name\">" + nameOf(m.species) + "</span>" +
      "<span class=\"stars\">" + "★".repeat(m.quality) + "</span>" +
      "<span class=\"tag\">" + stage + "</span>" +
      "<span class=\"bar " + stage + "\"><i style=\"width:" + share + "%\"></i></span></div>";
  }
  els.basket.innerHTML = html || "<div class=\"note\">Empty. Forage or pick something.</div>";

  // Spores per species, with what each needs.
  html = "";
  for (const species of content.species) {
    const count = state.spores[species.id] || 0;
    if (count <= 0) continue;
    const needs = species.needs.map((n) => pieceName(content, n));
    if (species.host) needs.push("an established " + nameOf(species.host) + " colony");
    const chosen = species.id === view.selectedSpore;
    const likes = species.likes.moisture + " moisture, " + species.likes.air + " air, " + species.likes.light + " light";
    html +=
      "<div class=\"row\"><span class=\"name" + (chosen ? " sel" : "") + "\">" + (chosen ? "▶ " : "") +
      species.name + " ×" + count + "</span><span class=\"note\">needs " + needs.join(" + ") + " beside it; likes " +
      likes + "</span></div>";
  }
  els.spores.innerHTML = html || "<div class=\"note\">None yet. Forage a wild mushroom to get one.</div>";

  // Buyers and what they want, visible before walking over.
  html = "";
  for (const buyer of state.buyers) {
    const kind = findById(content.buyers, buyer.kind);
    const wants = buyer.wants.map((w) => {
      const held = state.basket.filter((m) => m.species === w.species).length;
      const keen = buyer.favourite === w.species ? " ♥" : "";
      const price = salePrice(tuning, buyer, { species: w.species, quality: tuning.minQuality + Math.floor((tuning.maxQuality - tuning.minQuality) / 2), age: 0 });
      return nameOf(w.species) + " ×" + w.count + keen + " (about " + price + " each, you hold " + held + ")";
    });
    const extras = [];
    if (!kind.acceptsDried) extras.push("fresh only");
    if (tuning.buyers[buyer.kind].driedBonus > 1) extras.push("pays extra for dried");
    if (kind.buysSpores) extras.push("buys spare spores: point at it and press R");
    html +=
      "<div class=\"buyer\"><b>" + kind.name + "</b> on the " + buyer.route + ", leaves in " +
      formatClock(tuning, buyer.total - buyer.elapsed) + "<br>wants " + wants.join("; ") +
      (extras.length ? "<br><span class=\"note\">" + extras.join(", ") + "</span>" : "") + "</div>";
  }
  els.buyers.innerHTML = html || "<div class=\"note\">Nobody right now. One comes by before long.</div>";

  // Journal: each species that has appeared, its step on the ladder, and what comes next.
  const book = journal(state, content, tuning);
  els.journalTitle.textContent = "Journal · " + book.awards + " awards · " + book.xp + " xp";
  html = "";
  for (const entry of book.entries) {
    html +=
      "<div class=\"entry\"><b>" + entry.name + "</b> <span class=\"step\">" + entry.step + " · " +
      entry.stepNumber + " of " + entry.steps + "</span><br><span class=\"note\">" + entry.next + "</span></div>";
  }
  if (book.unseen > 0) html += "<div class=\"note\">" + book.unseen + " species not seen yet.</div>";
  els.journal.innerHTML = html;
}
