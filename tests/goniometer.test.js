// Run with: node --test tests/*.test.js
// Reads the generated protractor SVG the way a student would (reading direction from the
// numbering, whole degrees on the main scale, minutes from the vernier coincidence) and
// checks it against the stored answer. Answers are minutes of arc; a value above
// REVERSE_FLAG means the reading runs to the left.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/measure.js');
require('../js/svg-kit.js');
const goniometer = require('../js/goniometer.js');

const { center, rim } = goniometer.layout;
const LEFT = 10000;

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

test('goniometer: the reading direction does not change the answer', () => {
  assert.equal(goniometer.answerOf(2245), 2245);
  assert.equal(goniometer.answerOf(LEFT + 2245), 2245);
});

test('goniometer: random readings are multiples of 5′ inside the drawn scale, in both directions', () => {
  const sides = new Set();
  for (let i = 0; i < 2000; i++) {
    const value = goniometer.random();
    sides.add(value >= LEFT);
    const answer = goniometer.answerOf(value);
    assert.equal(answer % 5, 0);
    assert.ok(answer >= 60 && answer <= 4015, `answer ${answer}`);
  }
  assert.deepEqual([...sides].sort(), [false, true]);
});

test('goniometer: with a fixed direction every reading runs to the right', () => {
  for (let i = 0; i < 500; i++) assert.ok(goniometer.random(false) < LEFT);
});

const phiOf = (x, y) => (Math.atan2(x - center.x, center.y - y) * 180) / Math.PI;
const radiusOf = (x, y) => Math.hypot(x - center.x, y - center.y);

/** Radial marks that start on the rim: inward ones belong to the main scale, outward ones to the vernier. */
function marks(svg) {
  return [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" class="tick"/g)]
    .map((m) => m.slice(1).map(Number))
    .filter(([x1, y1]) => Math.abs(radiusOf(x1, y1) - rim) < 0.05)
    .map(([x1, y1, x2, y2]) => ({ phi: phiOf(x1, y1), main: radiusOf(x2, y2) < rim }));
}

function numerals(svg, cls) {
  return [...svg.matchAll(new RegExp(`<text x="([-\\d.]+)" y="([-\\d.]+)" class="${cls}"[^>]*>(\\d+)</text>`, 'g'))].map((m) => ({
    phi: phiOf(Number(m[1]), Number(m[2])),
    n: Number(m[3]),
  }));
}

/** What a student does: direction from the numbering, degrees from the main scale, minutes from the coincidence. */
function read(svg) {
  const all = marks(svg);
  const main = all.filter((t) => t.main).map((t) => t.phi);
  const vernier = all.filter((t) => !t.main).map((t) => t.phi);
  const labels = numerals(svg, 'gon-num');

  const zero = labels.find((l) => l.n === 0); // the main-scale 0 is in view
  let direction;
  let anchor;
  if (zero) {
    direction = zero.phi < 0 ? 1 : -1; // the vernier zero (phi = 0) lies on that side of the main zero
    anchor = zero;
  } else {
    const [a, b] = labels.filter((l) => l.n > 0).sort((p, q) => p.n - q.n);
    direction = Math.sign(b.phi - a.phi); // the numbers grow towards the reading side
    anchor = a;
  }

  // whole degrees: the last main-scale line before the vernier zero, along the reading direction
  const before = main.filter((p) => direction * p <= 0.01);
  const tick = direction > 0 ? Math.max(...before) : Math.min(...before);
  const degrees = Math.round(anchor.n + direction * (tick - anchor.phi));

  // minutes: the first vernier line of that side that sits on a main-scale line
  const side = vernier.filter((p) => direction * p >= -0.001).sort((p, q) => Math.abs(p) - Math.abs(q));
  const division = side.findIndex((p) => main.some((m) => Math.abs(m - p) < 0.03));
  return { direction, minutes: degrees * 60 + division * 5 };
}

test('goniometer: main scale + vernier coincidence give the stored answer, whichever way it reads', () => {
  const failures = [];
  for (let answer = 60; answer <= 4015; answer += 5) {
    for (const [value, direction] of [[answer, 1], [LEFT + answer, -1]]) {
      const reading = read(goniometer.render(value));
      if (reading.minutes !== answer || reading.direction !== direction) {
        failures.push(`${value}: reads ${reading.minutes} (${reading.direction})`);
      }
    }
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} mismatches`);
});

test('goniometer: the vernier zero is carried down across the main scale by a thin red index line, always', () => {
  for (const value of [60, 2245, LEFT + 2245, 4015]) {
    for (const options of [undefined, { revealed: true }]) {
      const svg = goniometer.render(value, options);
      const found = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" class="gon-index"/g)];
      assert.equal(found.length, 1, `value ${value}`);
      const [x1, y1, x2, y2] = found[0].slice(1).map(Number);
      assert.ok(Math.abs(x1 - center.x) < 0.05 && Math.abs(x2 - center.x) < 0.05, 'straight under the vernier zero');
      assert.ok(radiusOf(x1, y1) < rim && radiusOf(x2, y2) < radiusOf(x1, y1), 'runs from the main scale downwards');
    }
  }
});

test('goniometer: the answer is only marked in red once revealed', () => {
  assert.ok(!goniometer.render(2245).includes('gon-hit'));
  assert.ok(!goniometer.render(2245, { revealed: false }).includes('gon-hit'));
  assert.equal(goniometer.render(2245, { revealed: true }).match(/class="gon-hit[" ]/g).length, 2);
});

test('goniometer: explanation spells out the reading and its direction', () => {
  assert.equal(goniometer.explain(2245), 'Hacia la derecha: escala principal 37° + nonio 5 × 5′ (25′) = 37° 25′');
  assert.equal(goniometer.explain(LEFT + 2245), 'Hacia la izquierda: escala principal 37° + nonio 5 × 5′ (25′) = 37° 25′');
});
