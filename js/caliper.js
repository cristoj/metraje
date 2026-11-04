/* Vernier caliper, 0.02 mm resolution, 0-150 mm range. */
(function (root) {
  'use strict';

  const { randomInt, formatMillimetres } = root.Measure;
  const { r, line, text, gradients } = root.SvgKit;
  const P = 'cal';

  /** 1.00 .. 109.98 mm in 0.02 mm steps (hundredths, always even). */
  function random() {
    return 100 + 2 * randomInt(0, 5449);
  }

  function overview(hundredths) {
    const v = hundredths / 100;
    const ox = 40;
    const scale = 5;
    const xv = ox + v * scale;
    const beamEnd = ox + 150 * scale + 10;

    let s = text(40, 18, 'VISTA GENERAL', 'svg-cap', 'start');
    s += `<rect x="${ox - 6}" y="30" width="${beamEnd - ox + 6}" height="22" rx="2" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let m = 0; m <= 150; m += 10) {
      s += line(ox + m * scale, 52, ox + m * scale, m % 50 ? 47 : 43, 'tick', 1.2);
    }
    // workpiece between the jaws
    s += `<rect x="${ox}" y="60" width="${r(xv - ox)}" height="44" fill="url(#${P}-work)"/>`;
    // fixed jaw
    s += `<rect x="${ox - 16}" y="30" width="16" height="80" rx="2" fill="url(#${P}-dark)" stroke="#1c2328" stroke-width=".8"/>`;
    // sliding jaw + body
    s += `<rect x="${r(xv)}" y="30" width="16" height="80" rx="2" fill="url(#${P}-dark)" stroke="#1c2328" stroke-width=".8"/>`;
    s += `<rect x="${r(xv)}" y="24" width="150" height="38" rx="4" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    s += `<circle cx="${r(xv + 112)}" cy="24" r="9" fill="url(#${P}-dark)" stroke="#1c2328"/>`;
    // magnified region
    s += `<rect x="${r(xv - 4 * scale)}" y="14" width="${55 * scale}" height="56" rx="3" class="zoom-box"/>`;
    s += `<path d="M${r(xv - 4 * scale)} 70 L20 150 M${r(xv + 51 * scale)} 70 L980 150" class="zoom-line"/>`;
    return s;
  }

  function detail(hundredths) {
    const v = hundredths / 100;
    const scale = 18;
    const vz = 70; // x of the vernier zero line
    const baseline = 262;
    const vernierStep = 0.98 * scale;

    let s = `<defs><clipPath id="${P}-clip"><rect x="20" y="150" width="960" height="245" rx="6"/></clipPath></defs>`;
    s += `<rect x="20" y="150" width="960" height="245" rx="6" class="lens"/>`;
    s += '<g clip-path="url(#cal-clip)">';
    s += text(34, 168, 'DETALLE · LECTURA DEL NONIO', 'svg-cap', 'start');

    // main beam
    s += `<rect x="20" y="172" width="960" height="${baseline - 172}" fill="url(#${P}-steel)"/>`;
    s += text(34, 246, 'cm', 'svg-num-s', 'start');
    const mMin = Math.max(0, Math.floor(v - (vz - 20) / scale) - 1);
    const mMax = Math.min(150, Math.ceil(v + (980 - vz) / scale) + 1);
    for (let m = mMin; m <= mMax; m++) {
      const x = vz + (m - v) * scale;
      const len = m % 10 === 0 ? 34 : m % 5 === 0 ? 24 : 16;
      s += line(x, baseline, x, baseline - len, 'tick', m % 5 === 0 ? 2 : 1.3);
      if (m % 10 === 0) s += text(x, baseline - len - 8, m / 10, 'svg-num');
    }
    s += line(20, baseline + 0.5, 980, baseline + 0.5, 'tick', 1.5);

    // vernier plate
    const plateWidth = 50 * vernierStep + 76;
    s += `<rect x="${vz - 42}" y="${baseline + 4}" width="${r(plateWidth)}" height="108" rx="4" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let i = 0; i <= 50; i++) {
      const x = vz + i * vernierStep;
      const len = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 14;
      s += line(x, baseline + 4, x, baseline + 4 + len, 'tick', i === 0 ? 2.4 : i % 5 === 0 ? 2 : 1.3);
      if (i % 10 === 0) s += text(x, baseline + 4 + len + 20, i / 5, 'svg-num-s');
    }
    s += text(vz + 540, baseline + 100, '0,02 mm', 'svg-num-s', 'start');
    s += '</g>';
    s += `<rect x="20" y="150" width="960" height="245" rx="6" class="lens-border"/>`;
    return s;
  }

  function render(hundredths) {
    return `<svg class="fig-linear" viewBox="0 0 1000 405" role="img" aria-label="Calibre con nonio mostrando una medida" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradients(P)}</defs>${overview(hundredths)}${detail(hundredths)}</svg>`;
  }

  function explain(hundredths) {
    const mm = Math.floor(hundredths / 100);
    const division = (hundredths % 100) / 2;
    return `Escala principal: ${mm} mm + nonio: ${division} × 0,02 mm (${formatMillimetres(division * 2)} mm) = ${formatMillimetres(hundredths)} mm`;
  }

  const help = {
    title: 'Cómo leer el calibre',
    steps: [
      'Escala principal: mira la raya de la regla fija que queda justo a la izquierda del 0 del nonio. Cada raya es 1 mm y los números grandes son centímetros (el 3 son 30 mm). Esa es la parte entera, en milímetros.',
      'Nonio (escala móvil): busca la raya del nonio que coincide exactamente con una raya de la regla principal. Cada división del nonio vale 0,02 mm.',
      'Cuenta las divisiones del nonio desde el 0 hasta esa raya y multiplícalas por 0,02. Los números del nonio (0, 2, 4, 6, 8, 10) marcan cada 10 divisiones, es decir, cada 0,2 mm.',
      'Suma las dos partes. Ejemplo: 30 mm + 34 × 0,02 mm = 30,68 mm.',
    ],
  };

  root.Tools = root.Tools || {};
  root.Tools.caliper = {
    id: 'caliper',
    title: 'Calibre',
    resolution: '0,02 mm',
    range: '0 – 150 mm',
    random,
    render,
    explain,
    help,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Tools.caliper;
})(typeof window !== 'undefined' ? window : globalThis);
