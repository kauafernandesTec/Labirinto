"use strict";
/* ---------- Lógica do labirinto (sem DOM) ---------- */
const N = MAZE_DATA.N, H = MAZE_DATA.H, V = MAZE_DATA.V;
const wallH = (j, i) => H[j][i] === "1"; // parede acima da linha j
const wallV = (j, i) => V[j][i] === "1"; // parede à esquerda da coluna i

// Colisão: só existe passagem entre células vizinhas se não houver parede entre elas.
function neighbors(r, c) {
  const out = [];
  if (r > 0 && !wallH(r, c)) out.push([r - 1, c]);
  if (r < N - 1 && !wallH(r + 1, c)) out.push([r + 1, c]);
  if (c > 0 && !wallV(r, c)) out.push([r, c - 1]);
  if (c < N - 1 && !wallV(r, c + 1)) out.push([r, c + 1]);
  return out;
}
// Menor caminho (BFS) calculado sobre as MESMAS paredes usadas no jogo.
function solve(from, to) {
  const key = (r, c) => r * N + c, prev = new Map([[key(...from), null]]), q = [from];
  for (let k = 0; k < q.length; k++) {
    const [r, c] = q[k];
    if (r === to[0] && c === to[1]) break;
    for (const [nr, nc] of neighbors(r, c))
      if (!prev.has(key(nr, nc))) { prev.set(key(nr, nc), [r, c]); q.push([nr, nc]); }
  }
  if (!prev.has(key(...to))) return null;
  const path = []; let u = to;
  while (u) { path.push(u); u = prev.get(key(...u)); }
  return path.reverse();
}
const START = [0, 0], EXIT = [N - 1, N - 1];

if (typeof document === "undefined") { module.exports = { neighbors, solve, N, START, EXIT }; }
else {
/* ---------- Interface ---------- */
const cv = document.getElementById("tela"), ctx = cv.getContext("2d");
const area = document.getElementById("area");
const btnG = document.getElementById("btn-gabarito");
const modal = document.getElementById("vitoria");
let path = [START], showSolution = false, won = false;
let cell = 20, offX = 0, offY = 0;

function layout() {
  const w = area.clientWidth, h = area.clientHeight, padY = 22, padX = 6;
  cell = Math.max(8, Math.floor(Math.min((w - padX * 2) / N, (h - padY * 2) / N)));
  const dpr = window.devicePixelRatio || 1, cw = cell * N + padX * 2, ch = cell * N + padY * 2;
  cv.style.width = cw + "px"; cv.style.height = ch + "px";
  cv.width = cw * dpr; cv.height = ch * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  offX = padX; offY = padY; draw();
}
const cx = c => offX + (c + .5) * cell, cy = r => offY + (r + .5) * cell;

function trace(points, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath(); points.forEach(([r, c], i) => i ? ctx.lineTo(cx(c), cy(r)) : ctx.moveTo(cx(c), cy(r)));
  ctx.stroke();
}
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Caminho do jogador (começa na entrada, acima da primeira célula)
  if (!showSolution) {
    ctx.save(); ctx.globalAlpha = .9;
    trace([[-0.5, 0], ...path], "#3f9a4a", cell * .34);
    ctx.restore();
  } else {
    const solution = solve(START, EXIT);
    if (solution) {
      trace([[-0.5, 0], ...solution, [N - 1 + .5, N - 1]], "#c8202f", Math.max(3, cell * .28));
    }
  }
  // Paredes
  ctx.strokeStyle = "#1c3a44"; ctx.lineWidth = Math.max(2, cell * .09); ctx.lineCap = "round";
  ctx.beginPath();
  for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++)
    if (wallH(j, i)) { ctx.moveTo(offX + i * cell, offY + j * cell); ctx.lineTo(offX + (i + 1) * cell, offY + j * cell); }
  for (let j = 0; j < N; j++) for (let i = 0; i <= N; i++)
    if (wallV(j, i)) { ctx.moveTo(offX + i * cell, offY + j * cell); ctx.lineTo(offX + i * cell, offY + (j + 1) * cell); }
  ctx.stroke();
  // Rótulos
  ctx.fillStyle = "#c8202f"; ctx.font = "700 " + Math.max(10, Math.min(14, cell * .5)) + "px system-ui,sans-serif";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText("▼ ENTRADA", offX + 2, offY - 10);
  ctx.textAlign = "right"; ctx.fillText("SAÍDA ➜", offX + N * cell, offY + N * cell + 11);
  // Marcador do Curupira (cabelo vermelho)
  if (!showSolution) {
    const [r, c] = path[path.length - 1], R = cell * .3;
    ctx.fillStyle = "#c98a4f"; ctx.beginPath(); ctx.arc(cx(c), cy(r) + R * .2, R, 0, 7); ctx.fill();
    ctx.fillStyle = "#d6352b"; ctx.beginPath(); ctx.arc(cx(c), cy(r) + R * .1, R, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#222"; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(cx(c) + s * R * .35, cy(r) + R * .35, R * .12, 0, 7); ctx.fill(); });
  }
}

function stepTo(r, c) {
  const [pr, pc] = path[path.length - 1];
  if (!neighbors(pr, pc).some(([a, b]) => a === r && b === c)) return false; // parede: bloqueia
  const before = path[path.length - 2];
  if (before && before[0] === r && before[1] === c) path.pop(); else path.push([r, c]);
  if (r === EXIT[0] && c === EXIT[1]) { won = true; setTimeout(() => { modal.hidden = false; }, 350); }
  return true;
}
function move(dr, dc) {
  if (won || showSolution) return;
  const [r, c] = path[path.length - 1];
  if (stepTo(r + dr, c + dc)) draw();
}
function goToward(r, c) { // mouse/toque: segue o dedo, sempre por passagens abertas
  if (won || showSolution) return;
  const cur = path[path.length - 1], route = solve(cur, [r, c]);
  if (!route || route.length > 5) return;
  route.slice(1).forEach(([a, b]) => stepTo(a, b)); draw();
}
function cellAt(e) {
  const b = cv.getBoundingClientRect(), c = Math.floor((e.clientX - b.left - offX) / cell), r = Math.floor((e.clientY - b.top - offY) / cell);
  return r >= 0 && c >= 0 && r < N && c < N ? [r, c] : null;
}
let dragging = false;
cv.addEventListener("pointerdown", e => { dragging = true; cv.setPointerCapture(e.pointerId); const p = cellAt(e); p && goToward(...p); });
cv.addEventListener("pointermove", e => { if (dragging) { const p = cellAt(e); p && goToward(...p); } });
cv.addEventListener("pointerup", () => dragging = false);
cv.addEventListener("pointercancel", () => dragging = false);
const keys = { ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1] };
window.addEventListener("keydown", e => { const k = keys[e.key]; if (k) { e.preventDefault(); move(...k); } });

function reset() { path = [START]; won = false; modal.hidden = true; draw(); }
btnG.onclick = () => { showSolution = !showSolution; btnG.textContent = showSolution ? "Voltar ao jogo" : "Ver gabarito"; draw(); };
document.getElementById("btn-reiniciar").onclick = reset;
document.getElementById("btn-novamente").onclick = () => { showSolution = false; btnG.textContent = "Ver gabarito"; reset(); };
new ResizeObserver(layout).observe(area); layout();
}