const test = require('node:test');
const assert = require('node:assert/strict');

const Zoom = require('../js/zoom.js');

test('clampZoom keeps the zoom inside the allowed range', () => {
  assert.equal(Zoom.clampZoom(0.2), Zoom.MIN);
  assert.equal(Zoom.clampZoom(99), Zoom.MAX);
  assert.equal(Zoom.clampZoom(2.5), 2.5);
});

test('stepZoom walks through the presets and stops at both ends', () => {
  const up = [];
  let zoom = Zoom.MIN;
  for (let i = 0; i < 10; i++) {
    zoom = Zoom.stepZoom(zoom, 1);
    up.push(zoom);
  }
  assert.deepEqual(up.slice(0, 5), [1.5, 2, 3, 4, 5]);
  assert.equal(up[9], Zoom.MAX);

  assert.equal(Zoom.stepZoom(2, -1), 1.5);
  assert.equal(Zoom.stepZoom(Zoom.MIN, -1), Zoom.MIN);
});

test('stepZoom moves to the next preset from an in-between value (after a pinch)', () => {
  assert.equal(Zoom.stepZoom(2.4, 1), 3);
  assert.equal(Zoom.stepZoom(2.4, -1), 2);
});

test('pinchZoom scales with the finger distance and is clamped', () => {
  assert.equal(Zoom.pinchZoom(1, 100, 200), 2);
  assert.equal(Zoom.pinchZoom(2, 100, 50), 1);
  assert.equal(Zoom.pinchZoom(2, 100, 10), Zoom.MIN);
  assert.equal(Zoom.pinchZoom(4, 100, 400), Zoom.MAX);
  assert.equal(Zoom.pinchZoom(2, 0, 50), 2); // degenerate start distance: unchanged
});

test('wheelZoom zooms in when scrolling up and out when scrolling down', () => {
  assert.ok(Zoom.wheelZoom(2, -100) > 2);
  assert.ok(Zoom.wheelZoom(2, 100) < 2);
  assert.equal(Zoom.wheelZoom(Zoom.MIN, 500), Zoom.MIN);
});

test('formatZoom shows a percentage', () => {
  assert.equal(Zoom.formatZoom(1), '100%');
  assert.equal(Zoom.formatZoom(1.5), '150%');
  assert.equal(Zoom.formatZoom(2.333), '233%');
});
