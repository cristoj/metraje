/*
 * Universal bevel protractor with vernier, 5' resolution, 0-90 degree scale.
 * A measurement is an integer number of minutes of arc (37 deg 25' -> 2245).
 * The vernier has 12 divisions spanning 23 main-scale degrees, so each division
 * is 2 deg - 23/12 deg = 5' shorter than two main divisions.
 */
(function (root) {
  'use strict';

  const { randomInt } = root.Measure;
  const { r, line, text, gradients } = root.SvgKit;
  const P = 'gon';

  const MIN_VALUE = 60;
  const MAX_VALUE = 4015; // 66 deg 55': keeps the 23-degree vernier span inside the 90-degree scale
  const STEP = 5;

  // detail (magnified) view geometry; shared with the tests
  const DETAIL_TOP = 270;
  const layout = { vz: 70, scale: 34, baseline: DETAIL_TOP + 112 };

  const VIEW_HEIGHT = DETAIL_TOP + 255;
  const PIVOT = { x: 260, y: 240 };
  const DISC_RADIUS = 125;
  const WEDGE_RADIUS = 185;
  const BLADE_LENGTH = 235;

  /** 1 deg 00' .. 66 deg 55' in 5' steps. */
  function random() {
    return MIN_VALUE + STEP * randomInt(0, (MAX_VALUE - MIN_VALUE) / STEP);
  }

  /** "37 25", "37°25′", "37:25", "37" -> minutes of arc, or null when it is not degrees and minutes. */
  function parse(raw) {
    const cleaned = String(raw == null ? '' : raw)
      .toLowerCase()
      .replace(/[°º˚:′’'´`]/g, ' ')
      .trim();
    const match = /^(\d+)(?:\s+(\d+))?$/.exec(cleaned);
    if (!match) return null;
    const minutes = match[2] === undefined ? 0 : Number(match[2]);
    if (minutes >= 60) return null;
    return Number(match[1]) * 60 + minutes;
  }

  function isCorrect(raw, value) {
    const parsed = parse(raw);
    return parsed !== null && parsed === value;
  }

  /** 2245 -> "37° 25′" */
  function format(value) {
    return `${Math.floor(value / 60)}° ${String(value % 60).padStart(2, '0')}′`;
  }

  /** Point at `radius` from the pivot, `degrees` counter-clockwise from the fixed blade. */
  function around(radius, degrees) {
    const angle = (degrees * Math.PI) / 180;
    return [PIVOT.x + radius * Math.cos(angle), PIVOT.y - radius * Math.sin(angle)];
  }

  function overview(value) {
    const theta = value / 60;
    const [wx, wy] = around(WEDGE_RADIUS, theta);
    const [dx, dy] = around(DISC_RADIUS, 90);
    const [ex, ey] = around(DISC_RADIUS, 0);

    let s = text(40, 18, 'VISTA GENERAL', 'svg-cap', 'start');
    // workpiece: the wedge between both blades
    s += `<path d="M${PIVOT.x} ${PIVOT.y} L${r(PIVOT.x + WEDGE_RADIUS)} ${PIVOT.y} A${WEDGE_RADIUS} ${WEDGE_RADIUS} 0 0 0 ${r(wx)} ${r(wy)} Z" fill="url(#${P}-work)"/>`;
    // dial segment with the 0-90 scale
    s += `<path d="M${PIVOT.x} ${PIVOT.y} L${r(ex)} ${r(ey)} A${DISC_RADIUS} ${DISC_RADIUS} 0 0 0 ${r(dx)} ${r(dy)} Z" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let a = 0; a <= 90; a++) {
      const len = a % 10 === 0 ? 14 : a % 5 === 0 ? 10 : 6;
      const [x1, y1] = around(DISC_RADIUS, a);
      const [x2, y2] = around(DISC_RADIUS - len, a);
      s += line(x1, y1, x2, y2, 'tick', a % 10 === 0 ? 1.6 : 1);
      if (a % 10 === 0 && a > 0 && a < 90) {
        const [tx, ty] = around(DISC_RADIUS - 30, a);
        s += `<text x="${r(tx)}" y="${r(ty)}" class="svg-num-s" text-anchor="middle" dy=".35em">${a}</text>`;
      }
    }
    // fixed blade, below the zero line
    s += `<rect x="${PIVOT.x - 20}" y="${PIVOT.y}" width="${BLADE_LENGTH + 100}" height="12" rx="2" fill="url(#${P}-dark)" stroke="#1c2328" stroke-width=".8"/>`;
    // rotating blade: its lower edge lies on the measured angle
    s += `<g transform="rotate(${r(-theta)} ${PIVOT.x} ${PIVOT.y})"><rect x="${PIVOT.x - 20}" y="${PIVOT.y - 12}" width="${BLADE_LENGTH}" height="12" rx="2" fill="url(#${P}-dark)" stroke="#1c2328" stroke-width=".8"/></g>`;
    s += `<circle cx="${PIVOT.x}" cy="${PIVOT.y}" r="14" fill="url(#${P}-steel)" stroke="#1c2328"/>`;
    s += `<circle cx="${PIVOT.x}" cy="${PIVOT.y}" r="4" fill="#3b444a"/>`;

    // magnified region
    const [ax, ay] = around(DISC_RADIUS - 10, theta);
    const left = ax - 44;
    const right = ax + 44;
    const bottom = ay + 34;
    s += `<rect x="${r(left)}" y="${r(ay - 34)}" width="88" height="68" rx="3" class="zoom-box"/>`;
    s += `<path d="M${r(left)} ${r(bottom)} L20 ${DETAIL_TOP} M${r(right)} ${r(bottom)} L980 ${DETAIL_TOP}" class="zoom-line"/>`;
    return s;
  }

  function detail(value) {
    const v = value / 60;
    const { vz, scale, baseline } = layout;
    const top = DETAIL_TOP;
    const vernierStep = (23 / 12) * scale;

    let s = `<defs><clipPath id="${P}-clip"><rect x="20" y="${top}" width="960" height="245" rx="6"/></clipPath></defs>`;
    s += `<rect x="20" y="${top}" width="960" height="245" rx="6" class="lens"/>`;
    s += `<g clip-path="url(#${P}-clip)">`;
    s += text(34, top + 18, 'DETALLE · LECTURA DEL NONIO', 'svg-cap', 'start');

    // main scale: 1 degree per line
    s += `<rect x="20" y="${top + 22}" width="960" height="${baseline - top - 22}" fill="url(#${P}-steel)"/>`;
    s += text(34, baseline - 16, 'grados', 'svg-num-s', 'start');
    const dMin = Math.max(0, Math.floor(v - (vz - 20) / scale) - 1);
    const dMax = Math.min(90, Math.ceil(v + (980 - vz) / scale) + 1);
    for (let d = dMin; d <= dMax; d++) {
      const x = vz + (d - v) * scale;
      const len = d % 10 === 0 ? 34 : d % 5 === 0 ? 24 : 16;
      s += line(x, baseline, x, baseline - len, 'tick', d % 5 === 0 ? 2 : 1.3);
      if (d % 10 === 0) s += text(x, baseline - len - 8, d, 'svg-num');
    }
    s += line(20, baseline + 0.5, 980, baseline + 0.5, 'tick', 1.5);

    // vernier plate: 12 divisions of 5', numbered every 15'
    const plateWidth = 12 * vernierStep + 76;
    s += `<rect x="${vz - 42}" y="${baseline + 4}" width="${r(plateWidth)}" height="108" rx="4" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let i = 0; i <= 12; i++) {
      const x = vz + i * vernierStep;
      const len = i % 3 === 0 ? 30 : 16;
      s += line(x, baseline + 4, x, baseline + 4 + len, 'tick', i === 0 ? 2.4 : i % 3 === 0 ? 2 : 1.3);
      if (i % 3 === 0) s += text(x, baseline + 4 + len + 20, i * 5, 'svg-num-s');
    }
    s += text(vz + 12 * vernierStep + 8, baseline + 100, '5′', 'svg-num-s', 'start');
    s += '</g>';
    s += `<rect x="20" y="${top}" width="960" height="245" rx="6" class="lens-border"/>`;
    return s;
  }

  function render(value) {
    return `<svg class="fig-linear" viewBox="0 0 1000 ${VIEW_HEIGHT}" role="img" aria-label="Goniómetro con nonio mostrando una medida" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradients(P)}</defs>${overview(value)}${detail(value)}</svg>`;
  }

  function explain(value) {
    const rest = value % 60;
    return `Escala principal: ${Math.floor(value / 60)}° + nonio: ${rest / STEP} × 5′ (${rest}′) = ${format(value)}`;
  }

  const help = {
    title: 'Cómo leer el goniómetro',
    steps: [
      'Grados enteros: mira la raya de la escala principal que queda justo a la izquierda del 0 del nonio. Cada raya es 1° y los números grandes son decenas de grados (el 30 son 30°). Esa es la parte entera, en grados.',
      'Minutos (nonio): busca la raya del nonio que coincide exactamente con una raya de la escala principal. Cada división del nonio vale 5′ (minutos de arco; 60′ = 1°).',
      'Cuenta las divisiones del nonio desde el 0 hasta esa raya y multiplícalas por 5′. Los números del nonio (0, 15, 30, 45, 60) marcan cada 3 divisiones, es decir, cada 15′.',
      'Suma las dos partes. Ejemplo: 37° + 5 × 5′ = 37° 25′. Escríbelo como grados y minutos separados por un espacio: 37 25.',
    ],
  };

  root.Tools = root.Tools || {};
  root.Tools.goniometer = {
    id: 'goniometer',
    title: 'Goniómetro',
    resolution: '5′ (0° 05′)',
    range: '0 – 90°',
    unit: '° ′',
    placeholder: '0 00',
    inputHelp: 'Escribe la lectura en grados y minutos separados por un espacio (por ejemplo 37 25 para 37° 25′).',
    invalidHint: 'Escribe grados y minutos, por ejemplo 37 25',
    layout,
    random,
    parse,
    isCorrect,
    format,
    render,
    explain,
    help,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Tools.goniometer;
})(typeof window !== 'undefined' ? window : globalThis);
