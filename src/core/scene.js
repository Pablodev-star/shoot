/**
 * SHOOT! — Shared canvas surface.
 *
 * One full-window canvas sits behind the HTML UI for the whole session. Screens
 * hand it a renderer (`setRenderer`) and it drives the frame loop, handles
 * resize/DPI and keeps nearest-neighbour sampling on.
 *
 * A renderer is `{ update(dt, t), render(ctx, view) }` where `view` is
 * `{ w, h, scale }` in CSS pixels — `scale` is the pixel-art upscale factor the
 * scene should draw at (derived from the window height so the art stays chunky
 * on every display).
 */

import { crisp } from '../art/pixel.js';

let canvas = null;
let ctx = null;
let renderer = null;
let running = false;
let last = 0;
let elapsed = 0;
const view = { w: 0, h: 0, scale: 3, dpr: 1 };

/** Design height in source pixels — the scale factor targets this. */
const DESIGN_H = 180;

export function initScene(canvasNode) {
  canvas = canvasNode;
  ctx = canvas.getContext('2d');
  crisp(ctx);
  resize();
  window.addEventListener('resize', resize);
  start();
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  view.w = Math.max(1, Math.round(rect.width));
  view.h = Math.max(1, Math.round(rect.height));
  view.dpr = dpr;
  canvas.width = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);
  crisp(ctx);
  // Integer upscale keeps pixels square; clamp so tiny windows still work.
  view.scale = Math.max(2, Math.min(6, Math.round(view.h / DESIGN_H)));
  if (renderer && renderer.onResize) renderer.onResize(view);
}

/** Install the active renderer. Pass null to clear the canvas. */
export function setRenderer(next) {
  if (renderer && renderer.dispose) renderer.dispose();
  renderer = next;
  if (renderer && renderer.onResize) renderer.onResize(view);
}

export function getView() {
  return view;
}

function frame(now) {
  if (!running) return;
  const dt = Math.min(64, now - last); // clamp so alt-tab does not fast-forward
  last = now;
  elapsed += dt;

  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);

  if (renderer) {
    if (renderer.update) renderer.update(dt, elapsed);
    if (renderer.render) renderer.render(ctx, view, elapsed);
  }
  requestAnimationFrame(frame);
}

export function start() {
  if (running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

export function stop() {
  running = false;
}
