// Wires the page together: keyboard and mouse in, engine actions out, a frame loop that
// steps the engine and redraws. The screen changes the game only through engine.act().

import { tuning } from "../../shared/tuning.js";
import { content } from "../../shared/content.js";
import { createEngine } from "../engine/engine.js";
import { placeablePieces } from "../engine/rules.js";
import { suggestAction, nearestCompostable, nearestBuyer } from "../engine/query.js";
import { canvasSize, cellFromPixel, drawWorld } from "./draw.js";
import { buildPalette, markPalette, renderHud } from "./hud.js";

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
  build: document.getElementById("build"),
  palette: document.getElementById("palette"),
};

const view = {
  build: false,
  paused: false,
  hover: null,
  hint: null,
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

const moveKeys = {
  w: { x: 0, y: -1 }, arrowup: { x: 0, y: -1 },
  s: { x: 0, y: 1 }, arrowdown: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, arrowleft: { x: -1, y: 0 },
  d: { x: 1, y: 0 }, arrowright: { x: 1, y: 0 },
};
const held = {};

function sendMove() {
  const dir = { x: 0, y: 0 };
  if (!view.build) {
    for (const key of Object.keys(held)) {
      if (!held[key]) continue;
      dir.x += moveKeys[key].x;
      dir.y += moveKeys[key].y;
    }
  }
  engine.act({ type: "move", dir });
}

function setBuild(on) {
  view.build = on;
  view.hover = null;
  els.build.hidden = !on;
  canvas.classList.toggle("build", on);
  sendMove();
}

const commands = {
  e() {
    if (view.build || !view.hint) return;
    attempt(view.hint.action);
  },
  q() {
    nextSpore();
  },
  c() {
    const cell = nearestCompostable(state, tuning);
    if (!cell) say("Stand next to a colony to compost it.");
    else attempt({ type: "applyCompost", x: cell.x, y: cell.y });
  },
  r() {
    const buyer = nearestBuyer(state, tuning);
    if (!buyer) say("Stand next to a buyer to sell spores.");
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
  if (moveKeys[key]) {
    held[key] = true;
    sendMove();
    event.preventDefault();
    return;
  }
  if (event.repeat || !commands[key]) return;
  commands[key]();
  event.preventDefault();
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (!moveKeys[key]) return;
  held[key] = false;
  sendMove();
});

window.addEventListener("blur", () => {
  for (const key of Object.keys(held)) held[key] = false;
  sendMove();
});

// ---------- mouse (build mode only) ----------

function cellUnderMouse(event) {
  const box = canvas.getBoundingClientRect();
  const px = ((event.clientX - box.left) * canvas.width) / box.width;
  const py = ((event.clientY - box.top) * canvas.height) / box.height;
  return cellFromPixel(tuning, px, py);
}

canvas.addEventListener("mousemove", (event) => {
  view.hover = view.build ? cellUnderMouse(event) : null;
});

canvas.addEventListener("mouseleave", () => {
  view.hover = null;
});

canvas.addEventListener("click", (event) => {
  if (!view.build) return;
  const cell = cellUnderMouse(event);
  const owned = state.cells[cell.x + "," + cell.y];
  if (owned) attempt({ type: "placePiece", piece: view.selectedPiece, x: cell.x, y: cell.y });
  else attempt({ type: "buyCell", x: cell.x, y: cell.y });
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
  view.hint = view.build ? null : suggestAction(state, content, tuning, view.selectedSpore);
  drawWorld(ctx, state, content, tuning, view);
  hudLeft -= dt;
  if (hudLeft <= 0) {
    renderHud(els, state, content, tuning, view);
    hudLeft = ui.hudSeconds;
  }
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);
