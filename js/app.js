/* UI wiring: tabs (hash routing), one panel per instrument, answer checking. */
(function () {
  'use strict';

  const { parseMillimetres, isCorrect, formatMillimetres, randomDifferent } = window.Measure;
  const { MIN: ZOOM_MIN, MAX: ZOOM_MAX, clampZoom, stepZoom, pinchZoom, wheelZoom, formatZoom } = window.Zoom;
  const tools = window.Tools;
  const order = ['caliper', 'micrometer', 'dial', 'goniometer'];

  const ICONS = {
    ok: '<svg class="verdict-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#2ed47a"/><path d="M13 25l8 8 15-17" fill="none" stroke="#06210f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg class="verdict-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#ff5252"/><path d="M16 16l16 16M32 16L16 32" fill="none" stroke="#2a0606" stroke-width="5" stroke-linecap="round"/></svg>',
    info: '<svg class="verdict-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#8e9aa4"/><path d="M24 14v13" stroke="#10161a" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="34" r="3" fill="#10161a"/></svg>',
  };

  const DEFAULT_INPUT_HELP = 'Escribe la lectura en milímetros (vale coma o punto, por ejemplo 12,34).';
  const DEFAULT_INVALID_HINT = 'Escribe un número en mm, por ejemplo 12,34';

  const USAGE = [
    'Observa la medida que muestra el instrumento.',
    null, // how to type the reading: depends on the tool's unit
    'Responder comprueba tu lectura: tiene que coincidir exactamente con la del instrumento.',
    'Ver respuesta muestra la medida correcta y cómo se obtiene.',
    'Otra medida genera una nueva medición aleatoria.',
    'Para ver mejor las marcas, amplía el instrumento con los botones + y −, pellizcando la figura o con Ctrl + rueda del ratón. Arrastra para moverte por la figura ampliada; el porcentaje restablece el zoom.',
  ];

  const stage = document.getElementById('stage');
  const helpDialog = document.getElementById('help-dialog');
  const template = document.getElementById('tool-template');
  const links = Array.from(document.querySelectorAll('#tool-nav a'));
  const panels = {};
  let activeId = order[0];

  function showVerdict(panel, kind, title, detail) {
    panel.feedback.innerHTML = `<div class="verdict verdict--${kind}">${ICONS[kind]}<div><strong></strong><span></span></div></div>`;
    panel.feedback.querySelector('strong').textContent = title;
    panel.feedback.querySelector('span').textContent = detail;
  }

  function clearResult(panel) {
    panel.feedback.innerHTML = '';
    panel.answer.hidden = true;
    panel.answer.textContent = '';
  }

  /** Sizes the figure for the panel's zoom level; 1 = fit the box, > 1 = bigger and scrollable. */
  function applyZoom(panel) {
    const box = panel.figure;
    const svg = box.querySelector('svg');
    const zoomed = panel.zoom > ZOOM_MIN;
    box.classList.toggle('is-zoomed', zoomed);
    panel.zoomLevel.textContent = formatZoom(panel.zoom);
    panel.zoomOut.disabled = panel.zoom <= ZOOM_MIN;
    panel.zoomIn.disabled = panel.zoom >= ZOOM_MAX;
    if (!svg) return;
    if (!zoomed) {
      svg.style.width = '';
      svg.style.height = '';
      box.scrollLeft = 0;
      box.scrollTop = 0;
      return;
    }
    if (!box.offsetWidth) return; // hidden panel: applied when it is shown
    const viewBox = svg.viewBox.baseVal;
    const fit = Math.min(box.offsetWidth / viewBox.width, box.offsetHeight / viewBox.height);
    svg.style.width = `${viewBox.width * fit * panel.zoom}px`;
    svg.style.height = `${viewBox.height * fit * panel.zoom}px`;
  }

  /** Changes the zoom keeping the point under (clientX, clientY) where it is (default: the centre). */
  function setZoom(panel, zoom, clientX, clientY) {
    const box = panel.figure;
    const rect = box.getBoundingClientRect();
    const localX = (clientX === undefined ? rect.left + rect.width / 2 : clientX) - rect.left;
    const localY = (clientY === undefined ? rect.top + rect.height / 2 : clientY) - rect.top;
    const fractionX = (box.scrollLeft + localX) / (box.scrollWidth || 1);
    const fractionY = (box.scrollTop + localY) / (box.scrollHeight || 1);
    panel.zoom = clampZoom(zoom);
    applyZoom(panel);
    if (panel.zoom > ZOOM_MIN) {
      box.scrollLeft = fractionX * box.scrollWidth - localX;
      box.scrollTop = fractionY * box.scrollHeight - localY;
    }
  }

  function bindZoom(panel) {
    const box = panel.figure;
    const pointers = new Map();
    let pinch = null;

    panel.zoomIn.addEventListener('click', () => setZoom(panel, stepZoom(panel.zoom, 1)));
    panel.zoomOut.addEventListener('click', () => setZoom(panel, stepZoom(panel.zoom, -1)));
    panel.zoomLevel.addEventListener('click', () => setZoom(panel, ZOOM_MIN));

    box.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      try {
        box.setPointerCapture(event.pointerId);
      } catch (error) {
        // synthetic pointers cannot be captured; gestures still work without it
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { zoom: panel.zoom, distance: Math.hypot(a.x - b.x, a.y - b.y) };
      }
    });

    box.addEventListener('pointermove', (event) => {
      const point = pointers.get(event.pointerId);
      if (!point) return;
      const dx = event.clientX - point.x;
      const dy = event.clientY - point.y;
      point.x = event.clientX;
      point.y = event.clientY;
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(panel, pinchZoom(pinch.zoom, pinch.distance, distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (pointers.size === 1 && panel.zoom > ZOOM_MIN) {
        box.scrollLeft -= dx;
        box.scrollTop -= dy;
        box.classList.add('is-panning');
      }
    });

    const release = (event) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) box.classList.remove('is-panning');
    };
    box.addEventListener('pointerup', release);
    box.addEventListener('pointercancel', release);

    box.addEventListener(
      'wheel',
      (event) => {
        if (!event.ctrlKey && !event.metaKey) return; // plain wheel keeps scrolling the zoomed figure
        event.preventDefault();
        setZoom(panel, wheelZoom(panel.zoom, event.deltaY), event.clientX, event.clientY);
      },
      { passive: false },
    );

    box.addEventListener('dblclick', (event) => {
      setZoom(panel, panel.zoom > ZOOM_MIN ? ZOOM_MIN : 2.5, event.clientX, event.clientY);
    });
  }

  function newMeasurement(panel) {
    panel.value = randomDifferent(() => panel.tool.random(panel.toggleOn), panel.value);
    panel.figure.innerHTML = panel.tool.render(panel.value);
    panel.rangeLabel.textContent = panel.tool.rangeFor ? panel.tool.rangeFor(panel.value) : panel.tool.range;
    applyZoom(panel);
    panel.input.value = '';
    clearResult(panel);
  }

  /** Hundredths of a millimetre the student has to type (tools may encode extra state in the value). */
  function answerOf(panel) {
    return panel.tool.answerOf ? panel.tool.answerOf(panel.value) : panel.value;
  }

  /** Answer as shown to the student; tools with their own unit (degrees) provide `format`. */
  function formatAnswer(panel) {
    const answer = answerOf(panel);
    return panel.tool.format ? panel.tool.format(answer) : `${formatMillimetres(answer)} mm`;
  }

  function check(panel) {
    const { tool, input } = panel;
    const parse = tool.parse || parseMillimetres;
    if (parse(input.value) === null) {
      showVerdict(panel, 'info', 'Medida no válida', tool.invalidHint || DEFAULT_INVALID_HINT);
      return;
    }
    const matches = tool.isCorrect || isCorrect;
    if (matches(input.value, answerOf(panel))) {
      showVerdict(panel, 'ok', 'Correcto', formatAnswer(panel));
    } else {
      showVerdict(panel, 'bad', 'Incorrecto', 'La medida no coincide con la del instrumento');
    }
  }

  function reveal(panel) {
    panel.answer.hidden = false;
    panel.answer.innerHTML = '<span class="answer-label">Respuesta</span><strong></strong><p></p>';
    panel.answer.querySelector('strong').textContent = formatAnswer(panel);
    panel.answer.querySelector('p').textContent = panel.tool.explain(panel.value);
  }

  function listOf(items) {
    const list = document.createElement('ol');
    items.forEach((item) => {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.appendChild(entry);
    });
    return list;
  }

  function section(title, items) {
    const wrapper = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    wrapper.append(heading, listOf(items));
    return wrapper;
  }

  function openHelp(tool) {
    document.getElementById('help-title').textContent = tool.help.title;
    document.getElementById('help-body').replaceChildren(
      section('Cómo se lee', tool.help.steps),
      section(
        'Cómo usar el simulador',
        USAGE.map((step) => step || tool.inputHelp || DEFAULT_INPUT_HELP),
      ),
    );
    helpDialog.showModal();
  }

  function buildPanel(tool) {
    const root = template.content.firstElementChild.cloneNode(true);
    root.id = `panel-${tool.id}`;
    root.querySelector('[data-title]').textContent = tool.title;
    root.querySelector('[data-resolution]').textContent = tool.resolution;
    root.querySelector('[data-range]').textContent = tool.range;
    root.querySelector('[data-unit]').textContent = tool.unit || 'mm';
    if (tool.placeholder) root.querySelector('input[name="answer"]').placeholder = tool.placeholder;

    const panel = {
      tool,
      root,
      value: null,
      figure: root.querySelector('[data-figure]'),
      feedback: root.querySelector('[data-feedback]'),
      answer: root.querySelector('[data-answer]'),
      input: root.querySelector('input[name="answer"]'),
      rangeLabel: root.querySelector('[data-range]'),
      toggleOn: true,
      zoom: ZOOM_MIN,
      zoomIn: root.querySelector('[data-action="zoom-in"]'),
      zoomOut: root.querySelector('[data-action="zoom-out"]'),
      zoomLevel: root.querySelector('[data-action="zoom-reset"]'),
    };

    const toggle = root.querySelector('[data-action="toggle"]');
    if (tool.toggle) {
      panel.toggleOn = tool.toggle.enabled;
      toggle.hidden = false;
      toggle.title = tool.toggle.title;
      toggle.querySelector('.toggle-label').textContent = tool.toggle.label;
      toggle.setAttribute('aria-checked', String(panel.toggleOn));
      toggle.addEventListener('click', () => {
        panel.toggleOn = !panel.toggleOn;
        toggle.setAttribute('aria-checked', String(panel.toggleOn));
        newMeasurement(panel); // the new setting applies to a fresh measurement
      });
    }

    root.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      check(panel);
    });
    root.querySelector('[data-action="help"]').addEventListener('click', () => openHelp(tool));
    root.querySelector('[data-action="reveal"]').addEventListener('click', () => reveal(panel));
    root.querySelector('[data-action="next"]').addEventListener('click', () => {
      newMeasurement(panel);
      panel.input.focus();
    });

    bindZoom(panel);
    newMeasurement(panel);
    stage.appendChild(root);
    return panel;
  }

  function route() {
    const id = location.hash.slice(1);
    const active = order.includes(id) ? id : order[0];
    activeId = active;
    order.forEach((toolId) => {
      panels[toolId].root.hidden = toolId !== active;
    });
    links.forEach((link) => {
      if (link.dataset.tool === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${tools[active].title} · Simulador de metrología`;
    applyZoom(panels[active]); // the panel just became visible: size the zoomed figure
  }

  order.forEach((id) => {
    panels[id] = buildPanel(tools[id]);
  });
  helpDialog.addEventListener('click', (event) => {
    if (event.target === helpDialog) helpDialog.close(); // click on the backdrop
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => applyZoom(panels[activeId]));
  route();
})();
