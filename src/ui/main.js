// Wires the page together: mouse and keyboard in, engine actions out, a frame loop that
// steps the engine and redraws. The screen changes the game only through engine.act().
// Cursor only: there is no character. Hovering shows what a click would do; a click does it.

import { tuning } from "../../shared/tuning.js";
import { content } from "../../shared/content.js";
import { createEngine } from "../engine/engine.js";
import { placeablePieces } from "../engine/rules.js";
import { actionAt, buyerAt, cellAt } from "../engine/query.js";
import { canvasSize, pointFromPixel, drawWorld } from "./draw.js";
import { buildPalette, markPalette, renderHud, sentence } from "./hud.js";

const ui = tuning.ui;
const seedText = new URLSearchParams(window.location.search).get("seed");
const engine = createEngine({ tuning, content, seed: seedText === null || seedText === "" ? tuning.defaultSeed : Number(seedText) });
const state = engine.state;

const canvas = document.getElementById("world");
const size = canvasSize(tuning);
canvas.width = size.width;
canvas.height = size.height;
const ctx = canvas.getContext("2d");

const els = {
  stats: document.getElementById("stats"),
  hint: document.getElementById("hint"),
  message: document.getElementById("message"),
  basket: document.getElementById("basket"),
  basketTitle: document.getElementById("basket-title"),
  spores: document.getElementById("spores"),
  buyers: document.getElementById("buyers"),
  journal: document.getElementById("journal"),
  journalTitle: document.getElementById("journal-title"),
  build: document.getElementById("build"),
  palette: document.getElementById("palette"),
};

const view = {
  build: false,
  paused: false,
  point: null, // where the cursor is, in cells (fractions allowed); null when off the garden
  hover: null, // the whole cell under the cursor
  hint: null, // what a click would do now: { action, label } or null
  selectedPiece: placeablePieces(content)[0].id,
  selectedSpore: null,
  message: "",
  messageLeft: 0,
  lastEvent: null,
};

function say(text) {
  view.message = text;
  view.messageLeft = ui.messageSeconds;
}

// Show the reason when the engine refuses an action.
function attempt(action) {
  const result = engine.act(action);
  if (!result.ok) say("Can't: " + result.reason + ".");
  return result;
}

function heldSpores() {
  return content.species.filter((s) => state.spores[s.id] > 0).map((s) => s.id);
}

function keepSporeChoiceValid() {
  const held = heldSpores();
  if (held.indexOf(view.selectedSpore) < 0) view.selectedSpore = held.length ? held[0] : null;
}

function nextSpore() {
  const held = heldSpores();
  if (!held.length) return;
  view.selectedSpore = held[(held.indexOf(view.selectedSpore) + 1) % held.length];
}

// ---------- keyboard ----------

function setBuild(on) {
  view.build = on;
  els.build.hidden = !on;
  canvas.classList.toggle("build", on);
}

const commands = {
  q() {
    nextSpore();
  },
  c() {
    const cell = view.point ? cellAt(state, view.point) : null;
    if (!cell || !cell.colony) say("Point at a colony and press C to compost it.");
    else attempt({ type: "applyCompost", x: cell.x, y: cell.y });
  },
  r() {
    const buyer = view.point ? buyerAt(state, tuning, view.point) : null;
    if (!buyer) say("Point at a buyer and press R to sell spare spores.");
    else attempt({ type: "sell", buyer: buyer.id, what: "spores" });
  },
  b() {
    setBuild(!view.build);
  },
  p() {
    view.paused = !view.paused;
  },
};

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (event.repeat || !commands[key]) return;
  commands[key]();
  event.preventDefault();
});

// ---------- mouse ----------

function pointUnderMouse(event) {
  const box = canvas.getBoundingClientRect();
  const px = ((event.clientX - box.left) * canvas.width) / box.width;
  const py = ((event.clientY - box.top) * canvas.height) / box.height;
  return pointFromPixel(tuning, px, py);
}

canvas.addEventListener("mousemove", (event) => {
  view.point = pointUnderMouse(event);
  view.hover = { x: Math.floor(view.point.x), y: Math.floor(view.point.y) };
});

canvas.addEventListener("mouseleave", () => {
  view.point = null;
  view.hover = null;
});

canvas.addEventListener("click", (event) => {
  view.point = pointUnderMouse(event);
  view.hover = { x: Math.floor(view.point.x), y: Math.floor(view.point.y) };
  const cell = view.hover;
  if (view.build) {
    const owned = state.cells[cell.x + "," + cell.y];
    if (owned) attempt({ type: "placePiece", piece: view.selectedPiece, x: cell.x, y: cell.y });
    else attempt({ type: "buyCell", x: cell.x, y: cell.y });
    return;
  }
  const hint = actionAt(state, content, tuning, view.point, view.selectedSpore);
  if (hint && hint.action) attempt(hint.action);
  else if (hint) say(sentence(hint.label));
});

buildPalette(els.palette, content, tuning, (id) => {
  view.selectedPiece = id;
  markPalette(els.palette, id);
});
markPalette(els.palette, view.selectedPiece);

// ---------- frame loop ----------
// Time moves only while the page is open and unpaused: a hidden tab gets no frames,
// and one frame can never advance more than maxFrameSeconds.

let lastStamp = null;
let hudLeft = 0;

function frame(stamp) {
  let dt = 0;
  if (lastStamp !== null) dt = Math.min((stamp - lastStamp) / ui.msPerSecond, ui.maxFrameSeconds);
  lastStamp = stamp;
  if (!view.paused && dt > 0) engine.step(dt);

  const latest = state.events.length ? state.events[state.events.length - 1] : null;
  if (latest && latest !== view.lastEvent) {
    view.lastEvent = latest;
    say(latest.text);
  }
  if (view.messageLeft > 0) {
    view.messageLeft -= dt;
    if (view.messageLeft <= 0) view.message = "";
  }

  keepSporeChoiceValid();
  view.hint = view.build || !view.point ? null : actionAt(state, content, tuning, view.point, view.selectedSpore);
  drawWorld(ctx, state, content, tuning, view);
  hudLeft -= dt;
  if (hudLeft <= 0) {
    renderHud(els, state, content, tuning, view);
    hudLeft = ui.hudSeconds;
  }
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);
