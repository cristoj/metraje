/* Pure zoom maths for the instrument figure (buttons, pinch and Ctrl + wheel). */
(function (root) {
  'use strict';

  const MIN = 1;
  const MAX = 5;
  const STEPS = [1, 1.5, 2, 3, 4, 5];

  function clampZoom(zoom) {
    return Math.min(MAX, Math.max(MIN, zoom));
  }

  /** Next preset above (direction > 0) or below the current zoom. */
  function stepZoom(zoom, direction) {
    if (direction > 0) {
      const next = STEPS.find((step) => step > zoom + 1e-6);
      return next === undefined ? MAX : next;
    }
    const previous = [...STEPS].reverse().find((step) => step < zoom - 1e-6);
    return previous === undefined ? MIN : previous;
  }

  function pinchZoom(startZoom, startDistance, distance) {
    if (!(startDistance > 0)) return startZoom;
    return clampZoom((startZoom * distance) / startDistance);
  }

  /** deltaY < 0 (wheel up) zooms in. */
  function wheelZoom(zoom, deltaY) {
    return clampZoom(zoom * Math.exp(-deltaY * 0.002));
  }

  function formatZoom(zoom) {
    return `${Math.round(zoom * 100)}%`;
  }

  const api = { MIN, MAX, clampZoom, stepZoom, pinchZoom, wheelZoom, formatZoom };
  root.Zoom = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
