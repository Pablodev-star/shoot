/**
 * SHOOT! — Minimal DOM helpers.
 *
 * The UI layer is plain HTML/CSS (no framework, no build step — it has to run
 * straight off GitHub Pages), so these four helpers stand in for one.
 */

/**
 * el('div.card#id', { onclick }, [children])
 * Tag string supports .class and #id shorthands.
 */
export function el(spec, props = {}, children = []) {
  const [tagAndId, ...classes] = String(spec).split('.');
  const [tag, id] = tagAndId.split('#');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = `${node.className} ${value}`.trim();
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : value);
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Append children, skipping null/false/undefined.
 *
 * Native `node.append(null)` inserts the *text* "null", which is exactly the
 * kind of bug that reaches a screenshot, so conditional children must always go
 * through here (or through `el`, which filters the same way).
 */
export function appendAll(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Wrap a baked pixel canvas in an <img>-like element that scales crisply. */
export function pixelImg(canvas, scale = 2, className = '') {
  const img = document.createElement('img');
  img.src = canvas.toDataURL('image/png');
  img.width = canvas.width * scale;
  img.height = canvas.height * scale;
  img.className = `pixel ${className}`.trim();
  img.draggable = false;
  return img;
}

/** Promise that resolves after `ms`. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
