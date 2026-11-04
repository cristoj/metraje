/*
 * Pure helpers shared by the app and the tests.
 * All measurements are stored as integer hundredths of a millimetre
 * (e.g. 23.67 mm -> 2367) to avoid floating point comparison issues.
 */
(function (root) {
  'use strict';

  /** Parses "12,34", "12.34" or "12,34 mm". Returns hundredths (may be fractional) or null. */
  function parseMillimetres(raw) {
    const text = String(raw == null ? '' : raw)
      .trim()
      .replace(/\s*mm$/i, '')
      .replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    return Math.round(Number(text) * 1e6) / 1e4;
  }

  /** True only when the typed value matches the shown measurement exactly. */
  function isCorrect(raw, hundredths) {
    const parsed = parseMillimetres(raw);
    return parsed !== null && Math.abs(parsed - hundredths) < 1e-6;
  }

  /** 2367 -> "23,67" */
  function formatMillimetres(hundredths) {
    return (hundredths / 100).toFixed(2).replace('.', ',');
  }

  function randomInt(min, max, rng) {
    const next = rng || Math.random;
    return min + Math.floor(next() * (max - min + 1));
  }

  /** Calls generate() until it yields something different from previous. */
  function randomDifferent(generate, previous) {
    let value;
    do {
      value = generate();
    } while (value === previous);
    return value;
  }

  const api = { parseMillimetres, isCorrect, formatMillimetres, randomInt, randomDifferent };
  root.Measure = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
