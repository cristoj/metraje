/*
 * Dial indicator, 0.01 mm resolution, 10 mm travel (1 mm per needle revolution).
 * The printed numerals are fixed (clockwise, like the physical dial). The measurement
 * direction is random: an arrow on each dial shows which way the needles travel from
 * the zero as the measurement grows. Clockwise reads the numbers as printed;
 * counter-clockwise means counting from the zero the other way (100 - printed value).
 * A measurement is an integer: answer (hundredths of mm, 0-999) plus 1000 when the
 * needles travel counter-clockwise.
 */
(function (root) {
  'use strict';

  const { randomInt, formatMillimetres } = root.Measure;
  const { r, line, text, gradients } = root.SvgKit;
  const P = 'dial';
  const CX = 320;
  const CY = 270;
  const SUB = { x: 320, y: 346, radius: 50 };

  const REVERSE_FLAG = 1000;

  /** Hundredths of a millimetre shown by the dial, whichever way it runs. */
  function answerOf(value) {
    return value % REVERSE_FLAG;
  }

  function isReverse(value) {
    return value >= REVERSE_FLAG;
  }

  /**
   * 0.00 .. 9.99 mm in 0.01 mm steps. With the direction switch on (default) the needles
   * travel clockwise or counter-clockwise at random; off, always clockwise.
   */
  function random(variableDirection = true) {
    const reverse = variableDirection ? randomInt(0, 1) : 0;
    return reverse * REVERSE_FLAG + randomInt(0, 999);
  }

  function polar(cx, cy, radius, degrees) {
    const angle = ((degrees - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  function radialTick(cx, cy, outer, inner, degrees, width) {
    const [x1, y1] = polar(cx, cy, outer, degrees);
    const [x2, y2] = polar(cx, cy, inner, degrees);
    return line(x1, y1, x2, y2, 'tick', width);
  }

  /** Curved arrow centred on the top of a dial; sign 1 = clockwise, -1 = counter-clockwise. */
  function arrow(cx, cy, radius, sweepDegrees, sign) {
    const to = sign * sweepDegrees;
    const [x1, y1] = polar(cx, cy, radius, -to);
    const [x2, y2] = polar(cx, cy, radius, to);
    const a = ((to - 90) * Math.PI) / 180;
    const travel = [-Math.sin(a) * sign, Math.cos(a) * sign];
    const normal = [Math.cos(a), Math.sin(a)];
    const head = [
      [x2 + travel[0] * 9, y2 + travel[1] * 9],
      [x2 - travel[0] * 3 + normal[0] * 7, y2 - travel[1] * 3 + normal[1] * 7],
      [x2 - travel[0] * 3 - normal[0] * 7, y2 - travel[1] * 3 - normal[1] * 7],
    ];
    const points = head.map(([x, y]) => `${r(x)},${r(y)}`).join(' ');
    return `<g class="dial-arrow" data-direction="${sign > 0 ? 'cw' : 'ccw'}">
      <path d="M${r(x1)} ${r(y1)} A${radius} ${radius} 0 0 ${sign > 0 ? 1 : 0} ${r(x2)} ${r(y2)}"/>
      <polygon points="${points}"/></g>`;
  }

  function needle(cx, cy, length, tail, degrees, cls, hubRadius) {
    return `<g transform="rotate(${r(degrees)} ${cx} ${cy})">
      <polygon points="${cx - 4},${cy + tail} ${cx - 1.6},${cy - length + 20} ${cx},${cy - length} ${cx + 1.6},${cy - length + 20} ${cx + 4},${cy + tail}" class="${cls}"/>
      <circle cx="${cx}" cy="${cy + tail - 4}" r="${hubRadius - 1}" class="${cls}"/></g>
      <circle cx="${cx}" cy="${cy}" r="${hubRadius}" fill="#20262b" stroke="#000" stroke-width=".8"/>`;
  }

  function stem(hundredths) {
    const tipY = 566 - (hundredths / 100) * 3.6;
    return `<rect x="200" y="${r(tipY + 16)}" width="240" height="${r(620 - tipY - 16)}" fill="url(#${P}-work)"/>
      <rect x="311" y="520" width="18" height="${r(tipY - 520)}" fill="url(#${P}-steel)" stroke="#59636a" stroke-width=".8"/>
      <polygon points="311,${r(tipY)} 329,${r(tipY)} 320,${r(tipY + 16)}" fill="url(#${P}-dark)"/>`;
  }

  function face(value) {
    const hundredths = answerOf(value);
    const sign = isReverse(value) ? -1 : 1;
    let s = `<rect x="300" y="16" width="40" height="32" rx="5" fill="url(#${P}-dark)"/>`;
    s += `<rect x="296" y="494" width="48" height="30" rx="4" fill="url(#${P}-dark)" stroke="#1c2328"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="232" fill="url(#${P}-dark)" stroke="#12171a" stroke-width="2"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="226" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="8" stroke-dasharray="2 3.2"/>`;
    s += `<circle cx="${CX}" cy="${CY}" r="208" fill="#f3f0e8" stroke="#12171a" stroke-width="3"/>`;

    for (let i = 0; i < 100; i++) {
      const long = i % 10 === 0;
      const medium = i % 5 === 0;
      s += radialTick(CX, CY, 200, long ? 170 : medium ? 182 : 189, i * 3.6, long ? 2.4 : medium ? 1.8 : 1.1);
      if (long) {
        const [x, y] = polar(CX, CY, 146, i * 3.6);
        s += `<text x="${r(x)}" y="${r(y)}" class="dial-num" text-anchor="middle" dy=".35em">${i}</text>`;
      }
    }

    // mm revolution counter
    s += `<circle cx="${SUB.x}" cy="${SUB.y}" r="${SUB.radius + 4}" fill="#e7e3d8" stroke="#12171a" stroke-width="1.5"/>`;
    for (let j = 0; j < 10; j++) {
      s += radialTick(SUB.x, SUB.y, SUB.radius, SUB.radius - 8, j * 36, 1.8);
      const [x, y] = polar(SUB.x, SUB.y, SUB.radius - 21, j * 36);
      s += `<text x="${r(x)}" y="${r(y)}" class="dial-num-s" text-anchor="middle" dy=".35em">${j}</text>`;
    }
    s += text(CX, 206, '0,01 mm', 'dial-brand');

    s += arrow(CX, CY, 118, 26, sign);
    s += arrow(SUB.x, SUB.y, 62, 34, sign);

    s += needle(SUB.x, SUB.y, 40, 8, sign * (hundredths / 100) * 36, 'needle-small', 4);
    s += needle(CX, CY, 192, 34, sign * (hundredths % 100) * 3.6, 'needle-big', 10);
    return s;
  }

  function render(value) {
    return `<svg viewBox="0 0 640 620" role="img" aria-label="Reloj comparador mostrando una medida" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradients(P)}</defs>${stem(answerOf(value))}${face(value)}</svg>`;
  }

  function explain(value) {
    const hundredths = answerOf(value);
    const mm = Math.floor(hundredths / 100);
    const hundreds = hundredths % 100;
    const sense = isReverse(value) ? 'antihorario' : 'horario';
    const printed = 100 - hundreds;
    const hint = isReverse(value) && hundreds > 0 ? `; la aguja señala el ${printed} impreso: 100 − ${printed} = ${hundreds}` : '';
    return `Sentido ${sense}: esfera pequeña: ${mm} mm + esfera grande: ${hundreds} × 0,01 mm (${formatMillimetres(hundreds)} mm${hint}) = ${formatMillimetres(hundredths)} mm`;
  }

  const help = {
    title: 'Cómo leer el reloj comparador',
    steps: [
      'Sentido de la medición: la flecha de cada esfera indica hacia dónde se desplazan las agujas desde el 0 a medida que aumenta la medida. Los números impresos no cambian nunca: siempre crecen en sentido horario. Con la flecha horaria lees los números tal cual; con la flecha antihoraria tienes que contar desde el 0 hacia la izquierda. El interruptor «Sentido aleatorio» (arriba a la izquierda) permite que la flecha cambie al azar o dejarla siempre en sentido horario.',
      'Esfera pequeña (milímetros enteros): cada número es 1 mm recorrido por la aguja desde el 0, en el sentido de la flecha. Con flecha antihoraria, una aguja entre el 3 y el 4 ha recorrido 10 − 3,6 = 6,4 mm, es decir, 6 mm enteros. Su aguja avanza de forma continua: si parece estar justo en un número pero la aguja grande indica un valor próximo a 100 (90–99 contando en el sentido de la flecha), el milímetro entero es el anterior.',
      'Esfera grande (centésimas): una vuelta completa de la aguja roja equivale a 1 mm; tiene 100 divisiones de 0,01 mm. Con flecha horaria, el número al que apunta es la lectura (en el 95 son 95 centésimas). Con flecha antihoraria, ese número no es la lectura: réstalo a 100 (en el 63 son 100 − 63 = 37 centésimas) o cuenta las divisiones desde el 0 hacia la izquierda.',
      'Suma los milímetros de la esfera pequeña y las centésimas de la grande. Ejemplo con flecha horaria: 6 mm + 95 × 0,01 mm = 6,95 mm. Ejemplo con flecha antihoraria: aguja grande en el 63 y pequeña entre el 3 y el 4: 6 mm + 37 × 0,01 mm = 6,37 mm.',
    ],
  };

  root.Tools = root.Tools || {};
  root.Tools.dial = {
    id: 'dial',
    title: 'Reloj comparador',
    resolution: '0,01 mm',
    range: '0 – 10 mm',
    random,
    render,
    explain,
    answerOf,
    toggle: {
      label: 'Sentido aleatorio',
      title: 'Activa o desactiva el cambio aleatorio del sentido de la medición',
      enabled: true,
    },
    help,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Tools.dial;
})(typeof window !== 'undefined' ? window : globalThis);
