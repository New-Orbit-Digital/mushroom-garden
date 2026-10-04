// The side panel: coins, basket, spores, buyers and the build palette. Reads state, never changes it.

import { findById, placeablePieces, pieceName, cellCost, mushroomStage, stageShareLeft, salePrice } from "../engine/rules.js";
import { formatClock } from "./draw.js";

export function buildPalette(el, content, tuning, onSelect) {
  el.textContent = "";
  for (const piece of placeablePieces(content)) {
    const users = content.species.filter((s) => s.needs.indexOf(piece.id) >= 0).map((s) => s.name);
    const button = document.createElement("button");
    button.type = "button";
    button.id = "piece-" + piece.id;
    button.textContent = piece.name + " · " + tuning.pieceCost[piece.id] + " coins";
    const small = document.createElement("small");
    small.textContent = "for " + users.join(", ");
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

export function renderHud(els, state, content, tuning, view) {
  const ui = tuning.ui;
  const nameOf = (id) => findById(content.species, id).name;

  els.stats.innerHTML =
    "Coins <b>" + state.coins + "</b> &nbsp; Compost <b>" + state.compost + "</b> &nbsp; Played " +
    formatClock(tuning, state.time) + (view.paused ? " &nbsp; PAUSED" : "");

  if (view.build) {
    els.hint.textContent =
      "Build mode. Click a cell you own to place " + pieceName(content, view.selectedPiece) +
      " (" + tuning.pieceCost[view.selectedPiece] + " coins). Click a light green cell to buy it (" +
      cellCost(tuning, state.cellsBought) + " coins). B to leave.";
  } else if (view.hint) {
    els.hint.textContent = "E: " + view.hint.label;
  } else {
    els.hint.textContent = "Walk up to something and press E.";
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
    html +=
      "<div class=\"row\"><span class=\"name" + (chosen ? " sel" : "") + "\">" + (chosen ? "▶ " : "") +
      species.name + " ×" + count + "</span><span class=\"note\">needs " + needs.join(" + ") + " beside it</span></div>";
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
    if (kind.buysSpores) extras.push("buys spare spores (R)");
    html +=
      "<div class=\"buyer\"><b>" + kind.name + "</b> on the " + buyer.route + ", leaves in " +
      formatClock(tuning, buyer.total - buyer.elapsed) + "<br>wants " + wants.join("; ") +
      (extras.length ? "<br><span class=\"note\">" + extras.join(", ") + "</span>" : "") + "</div>";
  }
  els.buyers.innerHTML = html || "<div class=\"note\">Nobody right now. One comes by before long.</div>";
}
