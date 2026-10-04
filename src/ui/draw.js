// Canvas drawing. Flat placeholder shapes with text labels. Reads state, never changes it.

import { cellKey, cellCentre, findById, isEdge, canBuyCell, buyerPosition } from "../engine/rules.js";
import { featureOn, bandFor, isInBand } from "../engine/conditions.js";

export function canvasSize(tuning) {
  const g = tuning.grid;
  const c = tuning.ui.cellPx;
  return { width: g.cols * c, height: (g.rows + g.stripRows * 2) * c };
}

// Canvas pixel to grid cell. The creek strip sits above row 0.
export function cellFromPixel(tuning, px, py) {
  const c = tuning.ui.cellPx;
  return { x: Math.floor(px / c), y: Math.floor(py / c) - tuning.grid.stripRows };
}

export function formatClock(tuning, seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const spm = tuning.secondsPerMinute;
  return Math.floor(whole / spm) + ":" + String(whole % spm).padStart(2, "0");
}

function drawLabel(ctx, tuning, lines, cx, cy, color, px) {
  const ui = tuning.ui;
  const lineH = px * ui.lineHeight;
  ctx.font = px + "px sans-serif";
  ctx.fillStyle = color;
  const top = cy - (lineH * (lines.length - 1)) / 2;
  for (let i = 0; i < lines.length; i += 1) ctx.fillText(lines[i], cx, top + i * lineH);
}

function fullCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

// Three small bars for an established colony: moisture, air, light from top to bottom.
// The lighter stretch is the band the species likes; the marker is where it is now.
function drawCondBars(ctx, content, tuning, colony, cx, top) {
  const ui = tuning.ui;
  const bars = ui.condBars;
  const width = bars.width * ui.cellPx;
  const left = cx - width / 2;
  let y = top;
  for (const condition of content.conditions) {
    const band = bandFor(content, tuning, colony.species, condition);
    ctx.fillStyle = ui.colors.barTrack;
    ctx.fillRect(left, y, width, bars.height);
    ctx.fillStyle = ui.colors.barBand;
    ctx.fillRect(left + band.low * width, y, (band.high - band.low) * width, bars.height);
    ctx.fillStyle = isInBand(content, tuning, colony, condition) ? ui.colors.outline : ui.colors.barBad;
    ctx.fillRect(left + colony[condition] * width - bars.marker / 2, y - 1, bars.marker, bars.height + 2);
    y += bars.height + bars.gap;
  }
}

export function drawWorld(ctx, state, content, tuning, view) {
  const ui = tuning.ui;
  const g = tuning.grid;
  const c = ui.cellPx;
  const col = ui.colors;
  const size = canvasSize(tuning);
  const strip = g.stripRows * c;
  const sx = (x) => x * c;
  const sy = (y) => strip + y * c;

  ctx.clearRect(0, 0, size.width, size.height);
  ctx.setLineDash([]);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Creek along the top, road along the bottom.
  ctx.fillStyle = col.creek;
  ctx.fillRect(0, 0, size.width, strip);
  ctx.fillStyle = col.road;
  ctx.fillRect(0, sy(g.rows), size.width, strip);
  ctx.textAlign = "right";
  drawLabel(ctx, tuning, ["creek"], size.width - ui.labelPx, strip / 2, col.outline, ui.labelPx);
  drawLabel(ctx, tuning, ["road"], size.width - ui.labelPx, sy(g.rows) + strip / 2, col.outline, ui.labelPx);
  ctx.textAlign = "center";

  // Cells, habitat pieces and colonies.
  for (let y = 0; y < g.rows; y += 1) {
    for (let x = 0; x < g.cols; x += 1) {
      const cell = state.cells[cellKey(x, y)];
      let fill = isEdge(tuning, x, y) ? col.edge : cell ? col.owned : col.unowned;
      if (view.build && !cell && canBuyCell(state, tuning, x, y) === null) fill = col.buyable;
      if (view.build && view.hover && view.hover.x === x && view.hover.y === y && !isEdge(tuning, x, y)) fill = col.hover;
      ctx.fillStyle = fill;
      ctx.fillRect(sx(x) + ui.cellGap, sy(y) + ui.cellGap, c - ui.cellGap * 2, c - ui.cellGap * 2);
      if (!cell) continue;
      const mid = cellCentre(x, y);
      const cx = sx(mid.x);
      const cy = sy(mid.y);

      if (cell.piece) {
        const inset = ui.pieceInset * c;
        const piece = findById(content.substrates, cell.piece) || findById(content.environment, cell.piece);
        ctx.fillStyle = col.piece;
        ctx.fillRect(sx(x) + inset, sy(y) + inset, c - inset * 2, c - inset * 2);
        drawLabel(ctx, tuning, piece.short.split(" "), cx, cy, col.pieceText, ui.labelPx);
      }

      if (cell.colony) {
        const colony = cell.colony;
        const species = findById(content.species, colony.species);
        let status = "growing";
        ctx.fillStyle = col.established;
        if (colony.ready) {
          ctx.fillStyle = col.ready;
          status = "READY " + formatClock(tuning, colony.ready.waitLeft);
        } else if (colony.stage === "fruiting") {
          ctx.fillStyle = col.fruiting;
          status = "fruiting " + formatClock(tuning, colony.fruitLeft);
        }
        fullCircle(ctx, cx, cy, ui.colonyRadius * c);
        ctx.fill();
        ctx.lineWidth = ui.lineWidth;
        ctx.strokeStyle = col.outline;
        ctx.setLineDash(colony.stage === "fruiting" ? ui.wildDash : []);
        ctx.stroke();
        ctx.setLineDash([]);
        const lines = [species.short, status + (colony.composted ? " +c" : "")];
        const tended = colony.stage === "established" && featureOn(tuning, "conditions");
        const lift = tended ? ui.condBars.labelLift * c : 0;
        drawLabel(ctx, tuning, lines, cx, cy - lift, col.outline, ui.smallPx);
        if (tended) drawCondBars(ctx, content, tuning, colony, cx, cy + ui.condBars.top * c);
        if (colony.pile > 0) {
          const p = ui.pileSize * c;
          ctx.fillStyle = col.pile;
          ctx.fillRect(sx(x + 1) - p - ui.cellGap, sy(y) + ui.cellGap, p, p);
          drawLabel(ctx, tuning, [String(colony.pile)], sx(x + 1) - p / 2 - ui.cellGap, sy(y) + p / 2 + ui.cellGap, col.lightText, ui.smallPx);
        }
      }
    }
  }

  // Wild mushrooms: a heavier dashed outline.
  for (const id of Object.keys(state.wild)) {
    const w = state.wild[id];
    if (!w.present) continue;
    const mid = cellCentre(w.x, w.y);
    fullCircle(ctx, sx(mid.x), sy(mid.y), ui.wildRadius * c);
    ctx.fillStyle = col.wild;
    ctx.fill();
    ctx.lineWidth = ui.wildLineWidth;
    ctx.strokeStyle = col.outline;
    ctx.setLineDash(ui.wildDash);
    ctx.stroke();
    ctx.setLineDash([]);
    drawLabel(ctx, tuning, ["wild", findById(content.species, id).short], sx(mid.x), sy(mid.y), col.outline, ui.smallPx);
  }

  // Buyers: a diamond with the name and time left beside it.
  for (const buyer of state.buyers) {
    const pos = buyerPosition(tuning, buyer);
    const bx = sx(pos.x);
    const by = sy(pos.y);
    const r = ui.buyerSize * c;
    ctx.beginPath();
    ctx.moveTo(bx, by - r);
    ctx.lineTo(bx + r, by);
    ctx.lineTo(bx, by + r);
    ctx.lineTo(bx - r, by);
    ctx.closePath();
    ctx.fillStyle = col.buyer;
    ctx.fill();
    ctx.textAlign = "left";
    const kind = findById(content.buyers, buyer.kind);
    const leaves = formatClock(tuning, buyer.total - buyer.elapsed);
    drawLabel(ctx, tuning, [kind.name, "leaves " + leaves], bx + r + ui.lineWidth * 2, by, col.outline, ui.labelPx);
    ctx.textAlign = "center";
  }

  // The character, with a faint ring showing how far it can reach. Hidden in build mode.
  if (!view.build) {
    const px = sx(state.player.x);
    const py = sy(state.player.y);
    ctx.globalAlpha = ui.reachAlpha;
    fullCircle(ctx, px, py, tuning.actReach * c);
    ctx.fillStyle = col.player;
    ctx.fill();
    ctx.globalAlpha = 1;
    fullCircle(ctx, px, py, ui.playerRadius * c);
    ctx.fillStyle = col.player;
    ctx.fill();
    ctx.lineWidth = ui.lineWidth;
    ctx.strokeStyle = col.lightText;
    ctx.stroke();
  }
}
