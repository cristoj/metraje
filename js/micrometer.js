/* Outside micrometers, 0.01 mm resolution. Each one covers 25 mm: 0-25, 25-50, 50-75 or 75-100. */
(function (root) {
  'use strict';

  const { randomInt, formatMillimetres } = root.Measure;
  const { r, line, text, gradients } = root.SvgKit;
  const P = 'mic';
  const RANGE_SIZE = 2500; // hundredths of a millimetre covered by one micrometer

  /** Start of the range that contains a measurement, in hundredths: 0, 2500, 5000 or 7500. */
  function rangeStart(hundredths) {
    return Math.floor(hundredths / RANGE_SIZE) * RANGE_SIZE;
  }

  /** "25 – 50 mm" */
  function rangeFor(hundredths) {
    const low = rangeStart(hundredths) / 100;
    return `${low} – ${low + 25} mm`;
  }

  /** A random micrometer range plus a 0.50 .. 24.99 mm reading inside it. */
  function random() {
    return randomInt(0, 3) * RANGE_SIZE + randomInt(50, 2499);
  }

  function overview(hundredths) {
    const base = rangeStart(hundredths) / 100; // mm, start of the range
    const v = (hundredths - rangeStart(hundredths)) / 100; // mm, reading inside the range
    const scale = 6;
    const axis = 80;
    const anvilFace = 70;
    // the frame grows with the range: the gap between the faces is base + reading
    const sleeveStart = anvilFace + (base + 25) * scale + 10;
    const zero = sleeveStart + 20;
    const edge = zero + v * scale;
    const spindleFace = anvilFace + (base + v) * scale;
    // shrink big frames so the whole instrument keeps fitting the overview
    const k = Math.min(1, 720 / (570 + scale * base));
    const toX = (x) => 28 + (x - 28) * k;
    const toY = (y) => axis + (y - axis) * k;

    let s = text(40, 22, 'VISTA GENERAL', 'svg-cap', 'start');
    s += `<g transform="translate(28 ${axis}) scale(${r(k)}) translate(-28 ${-axis})">`;
    s += `<rect x="${anvilFace}" y="62" width="${r(spindleFace - anvilFace)}" height="36" fill="url(#${P}-work)"/>`;
    s += `<rect x="${r(spindleFace)}" y="74" width="${r(sleeveStart + 10 - spindleFace)}" height="12" fill="url(#${P}-steel)" stroke="#59636a" stroke-width=".8"/>`;
    s += `<g fill="url(#${P}-dark)" stroke="#1c2328" stroke-width=".8">
      <rect x="28" y="44" width="22" height="92" rx="3"/>
      <rect x="50" y="71" width="20" height="18"/>
      <rect x="28" y="118" width="${r(sleeveStart + 26 - 28)}" height="18" rx="3"/>
      <rect x="${r(sleeveStart - 6)}" y="90" width="28" height="46"/></g>`;
    s += text((28 + sleeveStart + 26) / 2, 131, rangeFor(hundredths), 'svg-engrave');
    s += `<rect x="${r(sleeveStart)}" y="62" width="${r(zero + 25 * scale + 10 - sleeveStart)}" height="36" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let m = 0; m <= 25; m++) {
      s += line(zero + m * scale, 62, zero + m * scale, m % 5 ? 67 : 72, 'tick', 1);
    }
    s += line(zero, axis, zero + 25 * scale, axis, 'tick', 0.8);
    s += `<rect x="${r(edge)}" y="56" width="160" height="48" rx="3" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let n = 1; n < 16; n++) s += line(edge + n * 10, 58, edge + n * 10, 102, 'tick', 0.6);
    s += `<rect x="${r(edge + 160)}" y="61" width="38" height="38" rx="5" fill="url(#${P}-dark)" stroke="#1c2328"/>`;
    s += `<rect x="${r(edge - 17 * scale)}" y="46" width="${r(17 * scale + 11.2 * scale)}" height="68" rx="3" class="zoom-box"/>`;
    s += '</g>';
    s += `<path d="M${r(toX(edge - 17 * scale))} ${r(toY(114))} L20 170 M${r(toX(edge + 11.2 * scale))} ${r(toY(114))} L980 170" class="zoom-line"/>`;
    return s;
  }

  function detail(hundredths) {
    const v = hundredths / 100;
    const scale = 34;
    const edge = 600; // fixed x of the thimble edge
    const datum = 292; // y of the sleeve datum line
    const radius = 84;
    const bevelStart = radius - 15; // where the chamfer begins
    const sleeveHalf = 72;
    const thimbleReading = hundredths % 50;
    const sleeveEnd = edge - v * scale - 3.5 * scale;

    let s = `<defs><clipPath id="${P}-clip"><rect x="20" y="170" width="960" height="240" rx="6"/></clipPath>
      <linearGradient id="${P}-cyl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".28" stop-color="#000" stop-opacity="0"/>
        <stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/>
      </linearGradient></defs>`;
    s += `<rect x="20" y="170" width="960" height="240" rx="6" class="lens"/>`;
    s += '<g clip-path="url(#mic-clip)">';
    s += text(34, 192, 'DETALLE · MANGUITO Y TAMBOR', 'svg-cap', 'start');

    if (sleeveEnd > 0) {
      s += `<rect x="0" y="${datum - 14}" width="${r(sleeveEnd)}" height="28" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    }
    s += `<rect x="${r(sleeveEnd)}" y="${datum - sleeveHalf}" width="${r(720 - sleeveEnd)}" height="${sleeveHalf * 2}" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    s += line(Math.max(22, sleeveEnd), datum, edge, datum, 'tick', 2);

    for (let m = 0; m <= 25; m++) {
      const x = edge - (v - m) * scale;
      if (x <= edge + 0.5 && x > 22) {
        const len = m % 5 === 0 ? 40 : 26;
        s += line(x, datum, x, datum - len, 'tick', m % 5 === 0 ? 2.2 : 1.6);
        if (m % 5 === 0) s += text(x, datum - len - 10, m, 'svg-num');
      }
      const half = x + 0.5 * scale;
      if (m < 25 && half <= edge + 0.5 && half > 22) s += line(half, datum, half, datum + 26, 'tick', 1.6);
    }

    // thimble: bevelled edge, numbers increase upwards (front of the drum moves up when closing)
    const bevel = 40;
    s += `<path d="M${edge} ${datum - bevelStart} L${edge + bevel} ${datum - radius} H${edge + 420} V${datum + radius} H${edge + bevel} L${edge} ${datum + bevelStart} Z" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let k = -12; k <= 12; k++) {
      const index = (thimbleReading + k + 50) % 50;
      const theta = (k * 7.2 * Math.PI) / 180;
      const dy = radius * Math.sin(theta);
      const y = datum - dy;
      const startX = edge + (Math.abs(dy) > bevelStart ? ((Math.abs(dy) - bevelStart) / (radius - bevelStart)) * bevel : 0);
      const major = index % 5 === 0;
      s += line(startX, y, edge + (major ? 78 : 56), y, 'tick', major ? 2 : 1.3);
      if (major) {
        s += `<text transform="translate(${edge + 108} ${r(y)}) scale(1 ${r(Math.cos(theta))})" class="svg-num" text-anchor="middle" dy=".35em">${index}</text>`;
      }
    }
    s += `<rect x="${edge}" y="${datum - radius}" width="420" height="${radius * 2}" fill="url(#${P}-cyl)" pointer-events="none"/>`;
    s += '</g>';
    s += `<rect x="20" y="170" width="960" height="240" rx="6" class="lens-border"/>`;
    return s;
  }

  function render(hundredths) {
    const reading = hundredths - rangeStart(hundredths);
    return `<svg class="fig-linear" viewBox="0 0 1000 420" role="img" aria-label="Micrómetro mostrando una medida" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradients(P)}</defs>${overview(hundredths)}${detail(reading)}</svg>`;
  }

  function explain(hundredths) {
    const start = rangeStart(hundredths);
    const reading = hundredths - start;
    const mm = Math.floor(reading / 100);
    const half = reading % 100 >= 50;
    const drum = reading % 50;
    const base = start > 0 ? `${start / 100} mm (inicio del rango) + ` : '';
    return `Rango ${rangeFor(hundredths)}: ${base}manguito: ${mm} mm${half ? ' + 0,5 mm' : ''} + tambor: ${drum} × 0,01 mm (${formatMillimetres(drum)} mm) = ${formatMillimetres(hundredths)} mm`;
  }

  const help = {
    title: 'Cómo leer el micrómetro',
    steps: [
      'Rango: cada micrómetro mide solo 25 mm (0–25, 25–50, 50–75 o 75–100). El rango está grabado en el cuerpo del instrumento (vista general) y aparece en la etiqueta «Rango». La medida final es el inicio del rango más la lectura del manguito y del tambor.',
      'Manguito (escala fija): cuenta las rayas de milímetro que quedan descubiertas por encima de la línea central, hasta la última visible a la izquierda del borde del tambor. Los números marcan cada 5 mm.',
      'Media marca: si la raya de 0,5 mm (debajo de la línea central) que sigue a esa marca también está descubierta, suma 0,5 mm.',
      'Tambor: lee el número del tambor que coincide con la línea central del manguito. Cada división vale 0,01 mm. Los números aumentan hacia arriba; si la línea cae entre dos números, cuenta las divisiones desde el más cercano.',
      'Suma todo. Ejemplo con rango 25–50: 25 mm + 8 mm + 0,5 mm + 3 × 0,01 mm = 33,53 mm.',
    ],
  };

  root.Tools = root.Tools || {};
  root.Tools.micrometer = {
    id: 'micrometer',
    title: 'Micrómetro',
    resolution: '0,01 mm',
    range: '0 – 100 mm',
    random,
    render,
    explain,
    rangeFor,
    help,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Tools.micrometer;
})(typeof window !== 'undefined' ? window : globalThis);
