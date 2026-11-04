// Reads the generated micrometer SVG the way a student would and checks it
// against the stored answer, for every possible measurement.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/measure.js');
require('../js/svg-kit.js');
const micrometer = require('../js/micrometer.js');

const DATUM = 292;
const EDGE = 600;
const EPS = 1e-6;

function numberAttr(tag, name) {
  return Number(new RegExp(`${name}="([-\\d.]+)"`).exec(tag)[1]);
}

/** Pulls the detail view out of the SVG: sleeve ticks, thimble lines and numerals. */
function parseDetail(svg) {
  const detail = svg.slice(svg.indexOf('<g clip-path="url(#mic-clip)">'));
  const lines = (detail.match(/<line [^>]*>/g) || []).map((tag) => ({
    x1: numberAttr(tag, 'x1'),
    y1: numberAttr(tag, 'y1'),
    x2: numberAttr(tag, 'x2'),
    y2: numberAttr(tag, 'y2'),
  }));
  const sleeveLabels = [...detail.matchAll(/<text x="([-\d.]+)" y="[-\d.]+" class="svg-num"[^>]*>(\d+)<\/text>/g)].map((m) => ({
    x: Number(m[1]),
    value: Number(m[2]),
  }));
  const thimbleLabels = [...detail.matchAll(/translate\([-\d.]+ ([-\d.]+)\)[^>]*>(\d+)<\/text>/g)].map((m) => ({
    y: Number(m[1]),
    value: Number(m[2]),
  }));
  return { lines, sleeveLabels, thimbleLabels };
}

function readSleeve({ lines, sleeveLabels }) {
  const vertical = lines.filter((l) => l.x1 === l.x2 && l.x1 <= EDGE + EPS);
  const whole = vertical.filter((l) => l.y2 < DATUM).map((l) => l.x1).sort((a, b) => a - b);
  const half = vertical.filter((l) => l.y2 > DATUM).map((l) => l.x1);

  const last = whole[whole.length - 1];
  const spacing = whole.length > 1 ? whole[1] - whole[0] : Infinity;
  const label = sleeveLabels.filter((l) => l.x <= last + EPS).sort((a, b) => b.x - a.x)[0];
  const millimetres = label.value + (spacing === Infinity ? 0 : Math.round((last - label.x) / spacing));
  const hasHalf = half.some((x) => x > last + EPS);
  return millimetres * 100 + (hasHalf ? 50 : 0);
}

function readThimble({ lines, thimbleLabels }) {
  const thimble = lines.filter((l) => l.y1 === l.y2 && l.x1 >= EDGE - EPS && l.x2 > l.x1 + 30);
  const sorted = [...thimble].sort((a, b) => a.y1 - b.y1);
  const position = (y) => sorted.findIndex((l) => Math.abs(l.y1 - y) < 0.011);
  const target = position(DATUM);
  assert.ok(target >= 0, 'no thimble line on the datum');

  const nearest = thimbleLabels
    .map((l) => ({ ...l, at: position(l.y) }))
    .filter((l) => l.at >= 0)
    .sort((a, b) => Math.abs(a.at - target) - Math.abs(b.at - target))[0];
  const steps = target - nearest.at; // positive: datum is below the numeral, so the value is lower
  return (((nearest.value - steps) % 50) + 50) % 50;
}

/** The range engraved on the frame, e.g. "25 – 50 mm" -> 2500 (hundredths). */
function readRange(svg) {
  const match = /class="svg-engrave"[^>]*>(\d+) – (\d+) mm</.exec(svg);
  assert.ok(match, 'no range engraved on the frame');
  assert.equal(Number(match[2]) - Number(match[1]), 25);
  return Number(match[1]) * 100;
}

test('micrometer: the drawing reads the same as the stored answer for every value in every range', () => {
  const failures = [];
  for (let base = 0; base < 10000; base += 2500) {
    for (let reading = 0; reading <= 2499; reading++) {
      const value = base + reading;
      const svg = micrometer.render(value);
      const detail = parseDetail(svg);
      const read = readRange(svg) + readSleeve(detail) + readThimble(detail);
      if (read !== value) failures.push(`${value}: drawing reads ${read}`);
    }
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} mismatches`);
});
