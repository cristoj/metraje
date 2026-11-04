// Reads the generated dial indicator SVG the way a student would (following the
// direction arrow) and checks it against the stored answer, in both directions.
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/measure.js');
require('../js/svg-kit.js');
const dial = require('../js/dial.js');

const CX = 320;
const CY = 270;
const SUB_CY = 346;

function needleAngle(svg, cls) {
  const match = new RegExp(`<g transform="rotate\\(([-\\d.]+) [\\d.]+ [\\d.]+\\)">\\s*<polygon[^>]*class="${cls}"`).exec(svg);
  assert.ok(match, `no ${cls}`);
  return Number(match[1]);
}

/** Angle in degrees, clockwise from the top, of a point around (cx, cy). */
function clockwiseAngle(x, y, cx, cy) {
  return (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI;
}

function numeralAngle(svg, cls, label, cx, cy) {
  const match = new RegExp(`<text x="([-\\d.]+)" y="([-\\d.]+)" class="${cls}"[^>]*>${label}</text>`).exec(svg);
  assert.ok(match, `no numeral ${label}`);
  return clockwiseAngle(Number(match[1]), Number(match[2]), cx, cy);
}

function arrows(svg) {
  return [...svg.matchAll(/<g class="dial-arrow" data-direction="(cw|ccw)">/g)].map((m) => m[1]);
}

const wrap = (degrees) => ((((degrees + 180) % 360) + 360) % 360) - 180;

test('dial: the printed numerals are fixed (always clockwise); only the arrows change', () => {
  for (let value = 0; value < 2000; value += 7) {
    const svg = dial.render(value);
    const expected = value >= 1000 ? 'ccw' : 'cw';
    assert.deepEqual(arrows(svg), [expected, expected], `value ${value}`);

    // the physical dial never changes: numerals grow clockwise whatever the arrow says
    assert.ok(Math.abs(wrap(numeralAngle(svg, 'dial-num', 10, CX, CY) - 36)) < 0.5, `big numerals, value ${value}`);
    assert.ok(Math.abs(wrap(numeralAngle(svg, 'dial-num-s', 1, CX, SUB_CY) - 36)) < 0.5, `small numerals, value ${value}`);
  }
});

test('dial: reading the needles on the fixed numerals, counting along the arrow, gives the stored answer', () => {
  const failures = [];
  for (let value = 0; value < 2000; value++) {
    const svg = dial.render(value);
    const clockwise = arrows(svg)[0] === 'cw';
    const answer = dial.answerOf(value);

    // positions printed on the fixed scales
    const printedBig = (((needleAngle(svg, 'needle-big') / 3.6) % 100) + 100) % 100;
    const printedSmall = (((needleAngle(svg, 'needle-small') / 36) % 10) + 10) % 10;
    // student's rule: clockwise reads the numbers as printed; counter-clockwise counts from the zero the other way
    const hundredths = Math.round(clockwise ? printedBig : (100 - printedBig) % 100);
    const travelled = clockwise ? printedSmall : (10 - printedSmall) % 10;
    // the small needle is continuous: the whole millimetre is its travel minus the fraction the big needle shows
    const total = Math.round(travelled - hundredths / 100) * 100 + hundredths;
    if (total !== answer) failures.push(`${value}: reads ${total}`);
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} mismatches`);
});
