/* Tiny helpers to build SVG strings for the instruments. */
(function (root) {
  'use strict';

  const r = (n) => Math.round(n * 100) / 100;

  function line(x1, y1, x2, y2, cls, width) {
    const w = width ? ` stroke-width="${width}"` : '';
    return `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" class="${cls || 'tick'}"${w}/>`;
  }

  function text(x, y, content, cls, anchor) {
    return `<text x="${r(x)}" y="${r(y)}" class="${cls}" text-anchor="${anchor || 'middle'}">${content}</text>`;
  }

  /** Gradients shared by every instrument; ids are prefixed to stay unique in the DOM. */
  function gradients(p) {
    return `
      <linearGradient id="${p}-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f5f7f8"/><stop offset=".42" stop-color="#cdd4d9"/>
        <stop offset=".58" stop-color="#b1bac1"/><stop offset="1" stop-color="#8a959c"/>
      </linearGradient>
      <linearGradient id="${p}-dark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6b767d"/><stop offset=".5" stop-color="#3b444a"/>
        <stop offset="1" stop-color="#262d32"/>
      </linearGradient>
      <linearGradient id="${p}-work" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f0b55e"/><stop offset="1" stop-color="#b3772c"/>
      </linearGradient>`;
  }

  root.SvgKit = { r, line, text, gradients };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SvgKit;
})(typeof window !== 'undefined' ? window : globalThis);
