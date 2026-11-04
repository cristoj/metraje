// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');

const Measure = require('../js/measure.js');
require('../js/svg-kit.js');
const caliper = require('../js/caliper.js');
const micrometer = require('../js/micrometer.js');
const dial = require('../js/dial.js');

test('parses comma and dot decimals into hundredths', () => {
  assert.equal(Measure.parseMillimetres('23,67'), 2367);
  assert.equal(Measure.parseMillimetres('23.67'), 2367);
  assert.equal(Measure.parseMillimetres(' 5 mm '), 500);
});

test('rejects non numeric input', () => {
  for (const bad of ['', 'abc', '1,2,3', '-4', '12,', '1e3']) {
    assert.equal(Measure.parseMillimetres(bad), null, bad);
  }
});

test('isCorrect needs an exact match', () => {
  assert.equal(Measure.isCorrect('23,67', 2367), true);
  assert.equal(Measure.isCorrect('23.670', 2367), true);
  assert.equal(Measure.isCorrect('23,66', 2367), false);
  assert.equal(Measure.isCorrect('23,675', 2367), false);
  assert.equal(Measure.isCorrect('', 2367), false);
});

test('formatMillimetres uses a decimal comma', () => {
  assert.equal(Measure.formatMillimetres(2367), '23,67');
  assert.equal(Measure.formatMillimetres(500), '5,00');
});

test('randomDifferent never repeats the previous value', () => {
  let calls = 0;
  const values = [3, 3, 3, 7];
  const result = Measure.randomDifferent(() => values[calls++], 3);
  assert.equal(result, 7);
});

const resolutionStep = { caliper: 2, micrometer: 1, dial: 1 };
const ranges = { caliper: [100, 11000], micrometer: [0, 10000], dial: [0, 2000] };
const answerOf = (tool, value) => (tool.answerOf ? tool.answerOf(value) : value);

for (const tool of [caliper, micrometer, dial]) {
  test(`${tool.id}: random values stay on the resolution grid and in range`, () => {
    for (let i = 0; i < 2000; i++) {
      const value = tool.random();
      assert.equal(value % resolutionStep[tool.id], 0);
      assert.ok(value >= ranges[tool.id][0] && value < ranges[tool.id][1]);
    }
  });

  test(`${tool.id}: render produces a clean svg`, () => {
    for (let i = 0; i < 200; i++) {
      const svg = tool.render(tool.random());
      assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    }
  });

  test(`${tool.id}: explanation reconstructs the same measurement`, () => {
    for (let i = 0; i < 200; i++) {
      const value = tool.random();
      assert.ok(tool.explain(value).endsWith(`= ${Measure.formatMillimetres(answerOf(tool, value))} mm`));
    }
  });
}

test('micrometer: every 25 mm range is generated and labelled', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const value = micrometer.random();
    const label = micrometer.rangeFor(value);
    const low = Math.floor(value / 2500) * 25;
    assert.equal(label, `${low} – ${low + 25} mm`);
    seen.add(label);
  }
  assert.deepEqual([...seen].sort(), ['0 – 25 mm', '25 – 50 mm', '50 – 75 mm', '75 – 100 mm']);
});

test('micrometer: the explanation includes the start of the range', () => {
  assert.match(micrometer.explain(5000 + 853), /Rango 50 – 75 mm: 50 mm \(inicio del rango\) \+ manguito: 8 mm \+ 0,5 mm/);
  assert.doesNotMatch(micrometer.explain(853), /inicio del rango/);
});

for (const tool of [caliper, micrometer, dial]) {
  test(`${tool.id}: has help content for the help dialog`, () => {
    assert.ok(tool.help.title.length > 0);
    assert.ok(tool.help.steps.length >= 3);
    for (const step of tool.help.steps) assert.ok(typeof step === 'string' && step.length > 20);
  });
}

test('dial: both reading directions are generated and the answer ignores the direction', () => {
  const directions = new Set();
  for (let i = 0; i < 2000; i++) {
    const value = dial.random();
    directions.add(value >= 1000 ? 'ccw' : 'cw');
    const answer = dial.answerOf(value);
    assert.ok(answer >= 0 && answer <= 999);
    assert.equal(answer, value % 1000);
  }
  assert.deepEqual([...directions].sort(), ['ccw', 'cw']);
});

test('dial: the explanation names the direction', () => {
  assert.match(dial.explain(695), /^Sentido horario: .*= 6,95 mm$/);
  assert.match(dial.explain(1695), /^Sentido antihorario: .*= 6,95 mm$/);
});

test('dial: counter-clockwise explanation says which printed number the needle points at', () => {
  assert.match(dial.explain(1637), /la aguja señala el 63 impreso: 100 − 63 = 37/);
  assert.doesNotMatch(dial.explain(1600), /impreso/); // needle on the 0: nothing to subtract
  assert.doesNotMatch(dial.explain(637), /impreso/); // clockwise: numbers are read as printed
});

test('dial: the direction switch fixes the arrows clockwise when it is off', () => {
  assert.equal(dial.toggle.enabled, true);
  assert.ok(dial.toggle.label.length > 0);

  for (let i = 0; i < 2000; i++) {
    assert.ok(dial.random(false) < 1000, 'switch off must never produce counter-clockwise');
  }

  const withSwitchOn = new Set();
  for (let i = 0; i < 2000; i++) withSwitchOn.add(dial.random(true) >= 1000 ? 'ccw' : 'cw');
  assert.deepEqual([...withSwitchOn].sort(), ['ccw', 'cw']);
});

test('only the dial has a direction switch', () => {
  assert.equal(caliper.toggle, undefined);
  assert.equal(micrometer.toggle, undefined);
});
