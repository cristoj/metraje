/*
 * Universal bevel protractor with vernier, 5' resolution, 0-90 degree scale.
 *
 * An answer is an integer number of minutes of arc (37 deg 25' -> 2245). The reading can run
 * to the right or to the left of the main-scale zero (both scales are numbered outwards from
 * it, and the vernier carries 0-60 on both sides). A measurement is the answer plus
 * REVERSE_FLAG when the reading runs to the left.
 *
 * The vernier has 12 divisions spanning 23 main-scale degrees, so each division is
 * 2 deg - 23/12 deg = 5' shorter than two main divisions.
 */
(function (root) {
  'use strict';

  const { randomInt } = root.Measure;
  const { r, line, gradients } = root.SvgKit;
  const P = 'gon';

  const MIN_ANSWER = 60;
  const MAX_ANSWER = 4015; // 66 deg 55': keeps the 23-degree vernier span inside the 90-degree scale
  const STEP = 5;
  const REVERSE_FLAG = 10000;

  // Detail (magnified) view: curved scales around a far-away centre, vernier zero straight up.
  const DETAIL_TOP = 290;
  const DETAIL_HEIGHT = 310;
  const RIM_DROP = 120; // rim height under the top of the detail box
  const RIM = 1090; // radius of the main scale (about 19 px per degree)
  const CENTER = { x: 500, y: DETAIL_TOP + RIM_DROP + RIM };
  const VISIBLE = 26; // degrees drawn on each side of the vernier zero
  const PLATE = { height: 86, span: 24.6 };
  const VERNIER_DIVISIONS = 12;
  const VERNIER_STEP = 23 / VERNIER_DIVISIONS; // degrees of main scale per vernier division
  const layout = { center: CENTER, rim: RIM };

  // Overview
  const VIEW_HEIGHT = DETAIL_TOP + DETAIL_HEIGHT + 10;
  const PIVOT = { x: 240, y: 255 };
  const DISC_RADIUS = 140;
  const WEDGE_RADIUS = 200;
  const BLADE_LENGTH = 255;

  function answerOf(value) {
    return value % REVERSE_FLAG;
  }

  function isLeft(value) {
    return value >= REVERSE_FLAG;
  }

  /**
   * 1 deg 00' .. 66 deg 55' in 5' steps. With the direction switch on (default) the reading
   * runs to the right or to the left at random; off, always to the right.
   */
  function random(variableDirection = true) {
    const left = variableDirection ? randomInt(0, 1) : 0;
    return left * REVERSE_FLAG + MIN_ANSWER + STEP * randomInt(0, (MAX_ANSWER - MIN_ANSWER) / STEP);
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

  function isCorrect(raw, answer) {
    const parsed = parse(raw);
    return parsed !== null && parsed === answer;
  }

  /** 2245 -> "37° 25′" */
  function format(answer) {
    return `${Math.floor(answer / 60)}° ${String(answer % 60).padStart(2, '0')}′`;
  }

  /** Point at `radius` from the pivot, `degrees` counter-clockwise from the fixed blade. */
  function around(radius, degrees) {
    const angle = (degrees * Math.PI) / 180;
    return [PIVOT.x + radius * Math.cos(angle), PIVOT.y - radius * Math.sin(angle)];
  }

  function overview(answer) {
    const theta = answer / 60;
    const [wx, wy] = around(WEDGE_RADIUS, theta);
    const [dx, dy] = around(DISC_RADIUS, 90);
    const [ex, ey] = around(DISC_RADIUS, 0);

    let s = `<text x="110" y="18" class="svg-cap" text-anchor="start">VISTA GENERAL</text>`;
    // workpiece: the wedge between both blades
    s += `<path d="M${PIVOT.x} ${PIVOT.y} L${r(PIVOT.x + WEDGE_RADIUS)} ${PIVOT.y} A${WEDGE_RADIUS} ${WEDGE_RADIUS} 0 0 0 ${r(wx)} ${r(wy)} Z" fill="url(#${P}-work)"/>`;
    // dial segment with the 0-90 scale
    s += `<path d="M${PIVOT.x} ${PIVOT.y} L${r(ex)} ${r(ey)} A${DISC_RADIUS} ${DISC_RADIUS} 0 0 0 ${r(dx)} ${r(dy)} Z" fill="url(#${P}-steel)" stroke="#59636a"/>`;
    for (let a = 0; a <= 90; a++) {
      const len = a % 10 === 0 ? 16 : a % 5 === 0 ? 12 : 7;
      const [x1, y1] = around(DISC_RADIUS, a);
      const [x2, y2] = around(DISC_RADIUS - len, a);
      s += line(x1, y1, x2, y2, 'overview-tick', a % 10 === 0 ? 1.6 : 1);
      if (a % 10 === 0 && a > 0 && a < 90) {
        const [tx, ty] = around(DISC_RADIUS - 32, a);
        s += `<text x="${r(tx)}" y="${r(ty)}" class="svg-scale" text-anchor="middle" dy=".35em">${a}</text>`;
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

  /** Point at `radius` from the detail centre, `degrees` clockwise from straight up. */
  function at(radius, degrees) {
    const angle = (degrees * Math.PI) / 180;
    return [CENTER.x + radius * Math.sin(angle), CENTER.y - radius * Math.cos(angle)];
  }

  function radial(from, to, degrees, width, cls) {
    const [x1, y1] = at(from, degrees);
    const [x2, y2] = at(to, degrees);
    return line(x1, y1, x2, y2, cls || 'tick', width);
  }

  /** Numeral standing on the radius at `degrees`, upright with respect to the scale. */
  function numeral(radius, degrees, content, cls) {
    const [x, y] = at(radius, degrees);
    return `<text x="${r(x)}" y="${r(y)}" class="${cls}" transform="rotate(${r(degrees)} ${r(x)} ${r(y)})" text-anchor="middle" dy=".35em">${content}</text>`;
  }

  function detail(value, revealed) {
    const answer = answerOf(value);
    const direction = isLeft(value) ? -1 : 1;
    const degrees = answer / 60;
    const zero = -direction * degrees; // where the main-scale 0 sits, relative to the vernier zero
    const top = DETAIL_TOP;
    const outer = RIM + PLATE.height;

    let s = `<defs><clipPath id="${P}-clip"><rect x="20" y="${top}" width="960" height="${DETAIL_HEIGHT}" rx="6"/></clipPath></defs>`;
    s += `<rect x="20" y="${top}" width="960" height="${DETAIL_HEIGHT}" rx="6" class="lens"/>`;
    s += `<g clip-path="url(#${P}-clip)">`;
    s += `<text x="34" y="${top + 18}" class="svg-cap" text-anchor="start">DETALLE · LECTURA DEL NONIO</text>`;

    // vernier plate (outside the rim) and main-scale disc
    const [ax, ay] = at(RIM, -PLATE.span);
    const [bx, by] = at(RIM, PLATE.span);
    const [cx, cy] = at(outer, PLATE.span);
    const [dx, dy] = at(outer, -PLATE.span);
    s += `<path d="M${r(ax)} ${r(ay)} A${RIM} ${RIM} 0 0 1 ${r(bx)} ${r(by)} L${r(cx)} ${r(cy)} A${outer} ${outer} 0 0 0 ${r(dx)} ${r(dy)} Z" class="gon-plate"/>`;
    s += `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="${RIM}" class="gon-disc"/>`;

    // main scale: 1 degree per line, numbered outwards from its own zero on both sides
    const first = Math.ceil(-VISIBLE - zero);
    const last = Math.floor(VISIBLE - zero);
    for (let n = first; n <= last; n++) {
      const distance = Math.abs(n);
      if (distance > 90) continue;
      const phi = zero + n;
      const len = distance % 10 === 0 ? 56 : distance % 5 === 0 ? 40 : 28;
      s += radial(RIM, RIM - len, phi, 1.3);
      if (distance % 10 === 0) s += numeral(RIM - 84, phi, distance, 'gon-num');
    }

    // vernier: 12 divisions of 5' on each side of its zero, numbered every 15'
    for (let j = 0; j <= VERNIER_DIVISIONS; j++) {
      const len = j === 0 ? 40 : j % 3 === 0 ? 34 : 20;
      for (const side of j === 0 ? [1] : [-1, 1]) {
        const phi = side * j * VERNIER_STEP;
        s += radial(RIM, RIM + len, phi, j % 3 === 0 ? 1.6 : 1.1);
        if (j % 3 === 0) s += numeral(RIM + 56, phi, j * 5, 'gon-num-s');
      }
    }

    if (revealed) {
      // the vernier line that sits on a main-scale line, followed down through the main scale
      const phi = direction * ((answer % 60) / STEP) * VERNIER_STEP;
      s += radial(RIM + 44, RIM - 44, phi, 7, 'gon-hit');
      s += radial(RIM + 44, RIM - 44, phi, 1.4, 'gon-hit gon-core');
    }
    s += '</g>';
    s += `<rect x="20" y="${top}" width="960" height="${DETAIL_HEIGHT}" rx="6" class="lens-border"/>`;
    return s;
  }

  function render(value, options) {
    const revealed = Boolean(options && options.revealed);
    return `<svg class="fig-gon" viewBox="0 0 1000 ${VIEW_HEIGHT}" role="img" aria-label="Goniómetro con nonio mostrando una medida" xmlns="http://www.w3.org/2000/svg">
      <defs>${gradients(P)}</defs>${overview(answerOf(value))}${detail(value, revealed)}</svg>`;
  }

  function explain(value) {
    const answer = answerOf(value);
    const rest = answer % 60;
    const side = isLeft(value) ? 'izquierda' : 'derecha';
    return `Hacia la ${side}: escala principal ${Math.floor(answer / 60)}° + nonio ${rest / STEP} × 5′ (${rest}′) = ${format(answer)}`;
  }

  const help = {
    title: 'Cómo leer el goniómetro',
    steps: [
      'Sentido de lectura: la escala principal está numerada hacia los dos lados a partir de su propio 0, y el nonio (la placa gris de arriba) lleva 0–60 a derecha e izquierda. Mira hacia dónde crecen los números de la escala principal junto al 0 del nonio: ese es el sentido de lectura y es el lado del nonio que tienes que usar. El interruptor «Sentido aleatorio» (arriba a la izquierda) permite que el sentido cambie al azar o dejarlo siempre hacia la derecha.',
      'Grados enteros: mira la raya de la escala principal que queda justo antes del 0 del nonio, contando en el sentido de lectura. Cada raya es 1° y los números grandes son decenas de grados (el 30 son 30°). Esa es la parte entera, en grados.',
      'Minutos (nonio): en el lado de lectura, busca la raya del nonio que coincide exactamente con una raya de la escala principal. Cada división del nonio vale 5′ (minutos de arco; 60′ = 1°). Cuenta las divisiones desde el 0 del nonio hasta esa raya y multiplícalas por 5′; los números del nonio (0, 15, 30, 45, 60) marcan cada 3 divisiones, es decir, cada 15′. No uses el lado contrario: allí hay rayas casi alineadas que dan una lectura falsa.',
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
    answerOf,
    parse,
    isCorrect,
    format,
    render,
    markOnReveal: true,
    explain,
    toggle: {
      label: 'Sentido aleatorio',
      title: 'Activa o desactiva el cambio aleatorio del sentido de lectura',
      enabled: true,
    },
    help,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Tools.goniometer;
})(typeof window !== 'undefined' ? window : globalThis);
