// Run with: node --test tests/
// Reads the generated protractor SVG the way a student would (main scale + vernier
// coincidence) and checks it against the stored answer. Values are minutes of arc.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/measure.js');
require('../js/svg-kit.js');
const goniometer = require('../js/goniometer.js');

const { vz, scale, baseline } = goniometer.layout;

test('goniometer: parses degrees and minutes in the usual spellings', () => {
  for (const [raw, minutes] of [
    ['37 25', 2245],
    ['37°25′', 2245],
    ["37º 25'", 2245],
    ['37:25', 2245],
    ['37°', 2220],
    ['37', 2220],
    ['0 5', 5],
  ]) {
    assert.equal(goniometer.parse(raw), minutes, raw);
  }
});

test('goniometer: rejects anything that is not degrees and minutes', () => {
  for (const bad of ['', 'abc', '37 60', '37,5', '-3', '1 2 3', '37 25 10']) {
    assert.equal(goniometer.parse(bad), null, bad);
  }
});

test('goniometer: the answer must match exactly', () => {
  assert.equal(goniometer.isCorrect('37 25', 2245), true);
  assert.equal(goniometer.isCorrect("37° 25'", 2245), true);
  assert.equal(goniometer.isCorrect('37 20', 2245), false);
  assert.equal(goniometer.isCorrect('38 25', 2245), false);
  assert.equal(goniometer.isCorrect('', 2245), false);
  assert.equal(goniometer.isCorrect('abc', 2245), false);
});

test('goniometer: formats minutes of arc as degrees and minutes', () => {
  assert.equal(goniometer.format(2245), '37° 25′');
  assert.equal(goniometer.format(60), '1° 00′');
  assert.equal(goniometer.format(5), '0° 05′');
});

test('goniometer: random readings are multiples of 5′ inside the drawn scale', () => {
  for (let i = 0; i < 2000; i++) {
    const value = goniometer.random();
    assert.equal(value % 5, 0);
    assert.ok(value >= 60 && value <= 4015, `value ${value}`);
  }
});

function ticks(svg, y1) {
  return [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="[-\d.]+" y2="([-\d.]+)" class="tick"/g)]
    .filter((m) => Math.abs(Number(m[2]) - y1) < 1e-6 && Number(m[3]) !== y1)
    .map((m) => Number(m[1]));
}

function labels(svg) {
  return [...svg.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" class="svg-num" text-anchor="middle">(\d+)<\/text>/g)].map((m) => ({
    x: Number(m[1]),
    degrees: Number(m[2]),
  }));
}

test('goniometer: main scale + vernier coincidence give the stored answer', () => {
  const failures = [];
  for (let value = 60; value <= 4015; value += 5) {
    const svg = goniometer.render(value);
    const main = ticks(svg, baseline);
    const vernier = ticks(svg, baseline + 4);

    // whole degrees: the last main-scale line at or left of the vernier zero
    const left = Math.max(...main.filter((x) => x <= vz + 0.5));
    const anchor = labels(svg).reduce((best, l) => (Math.abs(l.x - left) < Math.abs(best.x - left) ? l : best));
    const degrees = anchor.degrees + Math.round((left - anchor.x) / scale);

    // minutes: the first vernier line that sits exactly on a main-scale line
    const division = vernier.findIndex((x) => main.some((mx) => Math.abs(mx - x) < 0.6));
    const total = degrees * 60 + division * 5;
    if (total !== value) failures.push(`${value}: reads ${total}`);
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} mismatches`);
});

test('goniometer: explanation spells out the reading', () => {
  assert.equal(
    goniometer.explain(2245),
    'Escala principal: 37° + nonio: 5 × 5′ (25′) = 37° 25′',
  );
});
