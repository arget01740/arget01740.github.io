(() => {
  'use strict';

  const root = document.querySelector('[data-tour-viewer]');
  if (!root) return;

  const canvas = root.querySelector('canvas');
  const fallback = root.querySelector('[data-tour-fallback]');
  const statusLine = root.querySelector('[data-vr-status]');
  const announcer = root.querySelector('[data-tour-announce]');
  const setStatus = text => { if (statusLine) statusLine.textContent = text; };
  const announce = text => { if (announcer) announcer.textContent = text; };
  function showFallback(title, text, canRetry = false) {
    fallback.hidden = false;
    fallback.querySelector('strong').textContent = title;
    fallback.querySelector('span').textContent = text;
    const retry = fallback.querySelector('[data-tour-retry]');
    if (retry) retry.hidden = !canRetry;
    root.classList.remove('is-loading');
    root.removeAttribute('aria-busy');
    announce(`${title} ${text}`);
  }

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, xrCompatible: true }) || canvas.getContext('experimental-webgl');
  } catch {}
  if (!gl) {
    fallback.hidden = false;
    canvas.hidden = true;
    return;
  }

  const vehicles = {
    b: { title: 'Автомобиль класса B', short: 'Класс B' },
    c: { title: 'Реанимобиль класса C', short: 'Класс C' }
  };

  const scenes = {
    'b-exterior': {
      vehicle: 'b', view: 'exterior',
      title: 'Автомобиль класса B · снаружи',
      image: '/assets/tour-exterior-demo.png?v=e7b7a6830c',
      yaw: 0,
      pitch: -0.03,
      hotspots: [
        { yaw: 0.08, pitch: -0.02, title: 'Автомобиль класса B', text: 'Автомобиль скорой медицинской помощи для работы выездной бригады. Реальная модель и комплектация будут указаны после съёмки автомобиля станции.', next: 'b-interior', action: 'Перейти в салон' },
        { yaw: -0.92, pitch: 0.03, title: 'Светозвуковая сигнализация', text: 'Специальные световые и звуковые сигналы применяются при выполнении экстренного вызова в установленном порядке.' },
        { yaw: 0.84, pitch: 0.01, title: 'Доступ в медицинский салон', text: 'Двери и ступень обеспечивают доступ бригады к медицинскому салону и перемещение пациента.' },
        { yaw: 1.48, pitch: -0.04, title: 'Внешние отсеки', text: 'В зависимости от модели автомобиля в защищённых отсеках может размещаться часть переносного оснащения.' }
      ]
    },
    'b-interior': {
      vehicle: 'b', view: 'interior',
      title: 'Автомобиль класса B · медицинский салон',
      image: '/assets/tour-interior-demo.png?v=260ecf66a2',
      yaw: 0,
      pitch: -0.02,
      hotspots: [
        { yaw: 0.04, pitch: 0.02, title: 'Монитор пациента', text: 'Применяется для наблюдения за показателями пациента. Название модели и доступные режимы будут указаны по паспорту оборудования станции.' },
        { yaw: -0.72, pitch: -0.17, title: 'Система носилок', text: 'Предназначена для перемещения пациента и фиксации носилок в медицинском салоне.' },
        { yaw: 1.04, pitch: 0.04, title: 'Кислородная система', text: 'Обеспечивает размещение и подключение кислородного оборудования. Точный состав зависит от комплектации автомобиля.' },
        { yaw: -1.25, pitch: 0.06, title: 'Сумка экстренной помощи', text: 'Переносная медицинская укладка позволяет доставить необходимые средства непосредственно к пациенту.' },
        { yaw: 1.72, pitch: -0.08, title: 'Иммобилизационное оснащение', text: 'Используется для ограничения движения повреждённой области при переноске и транспортировке пациента.' },
        { yaw: -2.02, pitch: 0.08, title: 'Аспиратор', text: 'Медицинский аспиратор применяется для удаления жидкостей из дыхательных путей. Конкретная модель требует подтверждения станции.' },
        { yaw: 2.38, pitch: 0.02, title: 'Выход наружу', text: 'Вернуться к внешнему осмотру автомобиля класса B.', next: 'b-exterior', action: 'Выйти наружу' }
      ]
    },
    'c-exterior': {
      vehicle: 'c', view: 'exterior',
      title: 'Реанимобиль класса C · снаружи',
      image: '/assets/tour-exterior-demo.png?v=e7b7a6830c',
      yaw: 0.18,
      pitch: -0.03,
      hotspots: [
        { yaw: 0.08, pitch: -0.02, title: 'Реанимобиль класса C', text: 'Автомобиль для работы специализированной бригады. Марка, модель и фактическая комплектация будут указаны после съёмки.', next: 'c-interior', action: 'Перейти в салон' },
        { yaw: -0.92, pitch: 0.03, title: 'Светозвуковая сигнализация', text: 'Комплекс специальных сигналов делает автомобиль заметным при выполнении экстренного вызова.' },
        { yaw: 0.84, pitch: 0.01, title: 'Зона загрузки пациента', text: 'Задняя часть автомобиля обеспечивает установку и фиксацию транспортировочной системы.' },
        { yaw: 1.48, pitch: -0.04, title: 'Подключение внешнего питания', text: 'На некоторых моделях используется для поддержания готовности бортового медицинского оборудования. Наличие уточняется по автомобилю станции.' }
      ]
    },
    'c-interior': {
      vehicle: 'c', view: 'interior',
      title: 'Реанимобиль класса C · медицинский салон',
      image: '/assets/tour-interior-demo.png?v=260ecf66a2',
      yaw: 0.1,
      pitch: -0.02,
      hotspots: [
        { yaw: 0.04, pitch: 0.02, title: 'Монитор-дефибриллятор', text: 'Комплекс для мониторинга показателей пациента и проведения предусмотренных моделью лечебных мероприятий. Точная модель будет указана после инвентаризации.' },
        { yaw: 0.55, pitch: 0.08, title: 'Аппарат искусственной вентиляции лёгких', text: 'Предназначен для респираторной поддержки пациента. Режимы работы зависят от конкретной модели.' },
        { yaw: 1.02, pitch: -0.02, title: 'Инфузионное оборудование', text: 'Оборудование для контролируемого введения растворов. Фактический состав необходимо подтвердить по комплектации реанимобиля.' },
        { yaw: 1.54, pitch: 0.04, title: 'Кислородная система', text: 'Стационарные крепления, редукторы и точки подключения обеспечивают использование кислородного оборудования.' },
        { yaw: -0.68, pitch: -0.16, title: 'Система носилок', text: 'Обеспечивает перемещение пациента и надёжное крепление во время транспортировки.' },
        { yaw: -1.22, pitch: 0.04, title: 'Реанимационная сумка', text: 'Переносная укладка с оборудованием и материалами для оказания помощи вне автомобиля. Состав будет описан по описи станции.' },
        { yaw: -1.82, pitch: 0.07, title: 'Аспиратор', text: 'Предназначен для удаления жидкостей из дыхательных путей. На странице будет указана фактическая модель станции.' },
        { yaw: 2.38, pitch: 0.02, title: 'Выход наружу', text: 'Вернуться к внешнему осмотру реанимобиля класса C.', next: 'c-exterior', action: 'Выйти наружу' }
      ]
    }
  };

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  // Panorama files come from the page (TOUR_PANORAMAS in build_pages.py);
  // the paths in `scenes` above are defaults for older markup.
  for (const name of Object.keys(scenes)) {
    const key = 'panorama' + name.replace(/(?:^|-)(\w)/g, (match, letter) => letter.toUpperCase());
    if (root.dataset[key]) scenes[name].image = root.dataset[key];
  }
  // While classes B and C share the same demonstration panoramas, the page shows
  // one demonstration tour without a class choice. With four separate files the
  // B/C selector is used. The build sets the mode by comparing file contents.
  const separateVehicles = ['exterior', 'interior'].every(view => scenes[`b-${view}`].image !== scenes[`c-${view}`].image);
  const mode = ['demo', 'vehicles'].includes(root.dataset.tourMode) ? root.dataset.tourMode : (separateVehicles ? 'vehicles' : 'demo');
  if (mode === 'demo') {
    vehicles.demo = { title: 'Демонстрационный тур', short: 'Демо' };
    const demoTransitions = {
      exterior: { title: 'Автомобиль скорой помощи', text: 'Демонстрационная панорама показывает возможности тура. Модели и комплектация автомобилей классов B и C будут указаны после съёмки автомобилей станции.' },
      interior: { title: 'Выход наружу', text: 'Вернуться к внешнему осмотру автомобиля.' }
    };
    for (const view of ['exterior', 'interior']) {
      const source = scenes[`b-${view}`];
      scenes[`demo-${view}`] = {
        ...source,
        vehicle: 'demo',
        title: view === 'exterior' ? 'Демонстрационная панорама · снаружи' : 'Демонстрационная панорама · салон',
        hotspots: source.hotspots.map(spot => spot.next ? { ...spot, ...demoTransitions[view], next: `demo-${spot.next.split('-')[1]}` } : spot)
      };
    }
    document.querySelector('.tour-vehicle-selector')?.setAttribute('hidden', '');
  }
  // Links shared earlier (#b-interior, #c-exterior …) open the same view in the current mode.
  function sceneFromHash(hash) {
    const match = /^(b|c|demo)-(exterior|interior)$/.exec(hash);
    if (!match) return null;
    if (mode === 'demo') return `demo-${match[2]}`;
    return match[1] === 'demo' ? `b-${match[2]}` : hash;
  }
  const defaultScene = mode === 'demo' ? 'demo-exterior' : 'b-exterior';
  const DEFAULT_FOV = Math.PI / 2.25, MIN_FOV = 0.58, MAX_FOV = 1.72, MAX_PITCH = 1.28;
  const clampFov = value => Math.max(MIN_FOV, Math.min(MAX_FOV, value));
  const clampPitch = value => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value));
  const state = { vehicle: 'b', scene: 'b-exterior', yaw: 0, pitch: -0.03, fov: DEFAULT_FOV, dragging: false, auto: false, gyro: false, presence: false };
  let width = 1, height = 1, needsResize = true, texture = null, xrSession = null, ambient = null;
  let lastFrame = performance.now(), sceneLoadId = 0, rafId = 0, inView = true, contextLost = false;
  // The picture is redrawn only when the view, size, texture or hotspots change.
  let drawnKey = '', textureVersion = 0;

  // WebGL setup. Any failure here shows a readable message instead of an empty frame.
  const vertexSource = `
    attribute vec3 a_position;
    attribute vec2 a_uv;
    uniform mat4 u_projection;
    uniform mat4 u_view;
    varying vec2 v_uv;
    void main(){
      v_uv = a_uv;
      gl_Position = u_projection * u_view * vec4(a_position, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform float u_exposure;
    void main(){
      vec4 color = texture2D(u_texture, v_uv);
      color.rgb *= u_exposure;
      gl_FragColor = color;
    }
  `;
  let program, indexCount = 0, projectionLocation, viewLocation, exposureLocation, indexBuffer;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
    return shader;
  }
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link');
    gl.useProgram(program);

    const positions = [], uvs = [], indices = [];
    const segments = 80, rings = 48;
    for (let y = 0; y <= rings; y++) {
      const v = y / rings, phi = v * Math.PI;
      for (let x = 0; x <= segments; x++) {
        const u = x / segments, theta = u * Math.PI * 2;
        positions.push(-Math.sin(theta) * Math.sin(phi) * 10, Math.cos(phi) * 10, Math.cos(theta) * Math.sin(phi) * 10);
        // DOM images have their first row at the top. Mapping v directly keeps
        // the panorama upright without relying on driver-specific unpack flips.
        uvs.push(u, v);
      }
    }
    for (let y = 0; y < rings; y++) for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x, b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const bufferData = (data, itemSize, location) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, itemSize, gl.FLOAT, false, 0, 0);
    };
    bufferData(positions, 3, gl.getAttribLocation(program, 'a_position'));
    bufferData(uvs, 2, gl.getAttribLocation(program, 'a_uv'));
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    indexCount = indices.length;
    projectionLocation = gl.getUniformLocation(program, 'u_projection');
    viewLocation = gl.getUniformLocation(program, 'u_view');
    exposureLocation = gl.getUniformLocation(program, 'u_exposure');
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
  } catch {
    showFallback('Не удалось запустить 3D-графику.', 'Откройте страницу в современной версии Chrome, Safari, Firefox или Edge.');
    canvas.hidden = true;
    return;
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    stopLoop();
    showFallback('3D-графика временно остановлена.', 'Обновите страницу, чтобы восстановить панорамный тур.');
  });
  canvas.addEventListener('webglcontextrestored', () => location.reload());

  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return out;
  }
  function viewMatrix(yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(-pitch), sx = Math.sin(-pitch);
    const ry = new Float32Array([cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]);
    const rx = new Float32Array([1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1]);
    return multiply(rx, ry);
  }
  function perspective(fov, aspect, near = 0.1, far = 100) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far), out = new Float32Array(16);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  }
  function applyMatrix(m, v) {
    return [m[0]*v[0]+m[4]*v[1]+m[8]*v[2], m[1]*v[0]+m[5]*v[1]+m[9]*v[2], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]];
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2), rect = canvas.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width * dpr)), nextH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== nextW || canvas.height !== nextH) { canvas.width = nextW; canvas.height = nextH; }
    width = canvas.width; height = canvas.height;
    needsResize = false;
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => { needsResize = true; }).observe(canvas);
  window.addEventListener('resize', () => { needsResize = true; }, { passive: true });

  function setTexture(image) {
    let source = image;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (image.naturalWidth > maxSize || image.naturalHeight > maxSize) {
      const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
      const resized = document.createElement('canvas');
      resized.width = Math.max(1, Math.floor(image.naturalWidth * scale));
      resized.height = Math.max(1, Math.floor(image.naturalHeight * scale));
      resized.getContext('2d', { alpha: false }).drawImage(image, 0, 0, resized.width, resized.height);
      source = resized;
    }
    if (!texture) texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textureVersion++;
  }

  // Hotspots. Buttons are always paired with the scene they were built for,
  // so a scene switch can never read hotspots of another scene.
  const hotspotsLayer = root.querySelector('[data-hotspots]');
  const hotspotList = document.querySelector('[data-hotspot-list]');
  const infoCard = root.querySelector('[data-tour-card]');
  const infoTitle = infoCard.querySelector('[data-card-title]');
  const infoText = infoCard.querySelector('[data-card-text]');
  const infoAction = infoCard.querySelector('[data-card-action]');
  const speakButton = infoCard.querySelector('[data-card-speak]');
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (speakButton) speakButton.hidden = !canSpeak;
  let activeHotspot = null, cardOpener = null, placedHotspots = [];

  function clearHotspots() {
    placedHotspots = [];
    hotspotsLayer.replaceChildren();
    hotspotList?.replaceChildren();
  }
  function buildHotspots(scene) {
    clearHotspots();
    scene.hotspots.forEach(spot => {
      const button = document.createElement('button');
      button.className = 'tour-hotspot';
      button.type = 'button';
      button.hidden = true;
      button.setAttribute('aria-label', spot.title);
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '+';
      const label = document.createElement('b');
      label.textContent = spot.title;
      button.append(mark, label);
      button.addEventListener('click', () => openHotspot(spot, button));
      hotspotsLayer.append(button);
      placedHotspots.push({ spot, button });
      if (hotspotList) {
        const item = document.createElement('li');
        const listButton = document.createElement('button');
        listButton.type = 'button';
        listButton.textContent = spot.next ? `${spot.title} · ${spot.action}` : spot.title;
        listButton.addEventListener('click', () => { lookAt(spot); root.scrollIntoView({ block: 'nearest' }); openHotspot(spot, listButton); });
        item.append(listButton);
        hotspotList.append(item);
      }
    });
  }
  function lookAt(spot) {
    state.auto = false;
    autoButton?.setAttribute('aria-pressed', 'false');
    state.yaw = spot.yaw;
    state.pitch = clampPitch(spot.pitch);
    if (state.gyro) gyroYawOffset = null;
  }
  function stopSpeech() { if (canSpeak) speechSynthesis.cancel(); }
  function openHotspot(spot, opener) {
    activeHotspot = spot;
    cardOpener = opener || null;
    infoTitle.textContent = spot.title;
    infoText.textContent = spot.text;
    infoAction.hidden = !spot.next;
    infoAction.textContent = spot.action || 'Перейти';
    stopSpeech();
    infoCard.hidden = false;
    infoCard.focus({ preventScroll: true });
    if (state.presence && navigator.vibrate) navigator.vibrate(35);
  }
  function closeCard(restoreFocus = true) {
    if (infoCard.hidden) return;
    stopSpeech();
    infoCard.hidden = true;
    activeHotspot = null;
    if (!restoreFocus) return;
    const target = cardOpener && cardOpener.isConnected && !cardOpener.hidden ? cardOpener : root;
    target.focus({ preventScroll: true });
  }
  infoAction.addEventListener('click', () => {
    if (!activeHotspot?.next) return;
    loadScene(activeHotspot.next, true);
    root.focus({ preventScroll: true });
  });
  infoCard.querySelector('[data-card-close]').addEventListener('click', () => closeCard());
  speakButton?.addEventListener('click', () => {
    if (!canSpeak || !activeHotspot) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(`${activeHotspot.title}. ${activeHotspot.text}`);
    utterance.lang = 'ru-RU';
    speechSynthesis.speak(utterance);
  });

  function updateHotspots(view) {
    const aspect = width / height, tan = Math.tan(state.fov / 2);
    for (const { spot, button } of placedHotspots) {
      const cp = Math.cos(spot.pitch), world = [Math.sin(spot.yaw) * cp, Math.sin(spot.pitch), -Math.cos(spot.yaw) * cp];
      const camera = applyMatrix(view, world), z = -camera[2];
      const x = camera[0] / Math.max(z, 0.001) / (tan * aspect), y = camera[1] / Math.max(z, 0.001) / tan;
      const visible = z > 0 && Math.abs(x) < 1.15 && Math.abs(y) < 1.15;
      button.hidden = !visible;
      if (visible) button.style.transform = `translate(-50%,-50%) translate(${(x + 1) * 50 * root.clientWidth / 100}px, ${(1 - y) * 50 * root.clientHeight / 100}px)`;
    }
  }

  function draw(projection, view, viewport) {
    gl.viewport(...viewport);
    gl.clearColor(0.02, 0.055, 0.045, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniformMatrix4fv(projectionLocation, false, projection);
    gl.uniformMatrix4fv(viewLocation, false, view);
    gl.uniform1f(exposureLocation, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }

  function frame(now) {
    rafId = 0;
    if (xrSession || contextLost) return;
    try {
      if (needsResize) resize();
      const dt = Math.min((now - lastFrame) / 1000, 0.05); lastFrame = now;
      if (state.auto && !state.dragging) state.yaw = (state.yaw + dt * 0.08) % (Math.PI * 2);
      if (ambient?.panner) ambient.panner.pan.value = Math.sin(state.yaw) * 0.7;
      const key = [state.yaw, state.pitch, state.fov, width, height, root.clientWidth, root.clientHeight, textureVersion, placedHotspots.length].join('|');
      if (key !== drawnKey) {
        drawnKey = key;
        const view = viewMatrix(state.yaw, state.pitch);
        // After a VR session the XR framebuffer may still be bound; draw to the page canvas.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        draw(perspective(state.fov, width / height), view, [0, 0, width, height]);
        updateHotspots(view);
      }
    } catch {
      showFallback('Не удалось отобразить панораму.', 'Обновите страницу или откройте её в современной версии браузера.');
      return;
    }
    startLoop();
  }
  function startLoop() {
    if (rafId || xrSession || contextLost || !inView) return;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }
  // Do not spend GPU time while the panorama is scrolled out of view.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView) { lastFrame = performance.now(); drawnKey = ''; startLoop(); } else stopLoop();
    }).observe(root);
  }

  // Tabs: vehicle and view selectors follow the ARIA tabs pattern.
  const vehicleTabs = [...document.querySelectorAll('[data-vehicle]')];
  const viewTabs = [...root.querySelectorAll('[data-view]')];
  if (!root.id) root.id = 'tour-viewport';
  function syncTabs(tabs, isSelected) {
    tabs.forEach(tab => {
      const selected = isSelected(tab);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (!tab.hasAttribute('aria-controls')) tab.setAttribute('aria-controls', root.id);
    });
  }
  function tabKeys(tabs) {
    tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
      const keys = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      event.stopPropagation();
      const next = tabs[(keys[event.key] + tabs.length) % tabs.length];
      next.focus();
      next.click();
    }));
  }
  tabKeys(vehicleTabs);
  tabKeys(viewTabs);

  const vehicleTitle = document.querySelector('[data-current-vehicle]');
  function loadScene(name, fromUser = false) {
    if (!own(scenes, name)) return;
    const scene = scenes[name];
    const loadId = ++sceneLoadId;
    state.scene = name; state.vehicle = scene.vehicle; state.yaw = scene.yaw; state.pitch = scene.pitch;
    if (state.gyro) gyroYawOffset = null;
    closeCard(false);
    clearHotspots();
    fallback.hidden = true;
    root.classList.add('is-loading');
    root.setAttribute('aria-busy', 'true');
    const image = new Image();
    image.decoding = 'async';
    const onReady = () => {
      if (loadId !== sceneLoadId) return;
      try {
        setTexture(image);
        const textureError = gl.getError();
        if (textureError !== gl.NO_ERROR) throw new Error(`WebGL texture error: ${textureError}`);
        root.classList.remove('is-loading');
        root.removeAttribute('aria-busy');
        buildHotspots(scene);
        if (fromUser) announce(`${scene.title}. Активных точек: ${scene.hotspots.length}.`);
        startLoop();
      } catch {
        showFallback('Не удалось отобразить панораму.', 'Обновите страницу или откройте её в современной версии браузера.', true);
      }
    };
    const onError = () => {
      if (loadId !== sceneLoadId) return;
      showFallback('Не удалось загрузить панораму.', 'Проверьте подключение к интернету и повторите попытку.', true);
    };
    image.src = scene.image;
    // decode() prepares the pixels off the main thread before the WebGL upload.
    // Some Safari versions reject decode() for large images that still load fine.
    if (image.decode) image.decode().then(onReady, () => (image.complete && image.naturalWidth ? onReady() : onError()));
    else { image.onload = onReady; image.onerror = onError; }
    root.querySelector('[data-scene-name]').textContent = scene.title;
    syncTabs(viewTabs, tab => tab.dataset.view === scene.view);
    syncTabs(vehicleTabs, tab => tab.dataset.vehicle === scene.vehicle);
    if (vehicleTitle) vehicleTitle.textContent = vehicles[scene.vehicle].title;
    history.replaceState(null, '', `#${name}`);
  }
  fallback.querySelector('[data-tour-retry]')?.addEventListener('click', () => loadScene(state.scene, true));
  viewTabs.forEach(button => button.addEventListener('click', () => {
    const name = `${state.vehicle}-${button.dataset.view}`;
    if (name !== state.scene || !fallback.hidden) loadScene(name, true);
  }));
  vehicleTabs.forEach(button => button.addEventListener('click', () => {
    const currentView = scenes[state.scene]?.view || 'exterior';
    const name = `${button.dataset.vehicle}-${currentView}`;
    if (name !== state.scene || !fallback.hidden) loadScene(name, true);
  }));
  window.addEventListener('hashchange', () => {
    const name = sceneFromHash(location.hash.slice(1));
    if (name && own(scenes, name) && name !== state.scene) loadScene(name, true);
  });

  // Mouse, touch and pen. One pointer turns the view, two pointers zoom.
  const pointers = new Map();
  let pinch = null, gyroYawOffset = null;
  const pointerDistance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    if (pointers.size === 2) pinch = { distance: pointerDistance(), fov: state.fov };
    state.dragging = true;
    root.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (pinch && pointers.size >= 2) {
      const distance = pointerDistance();
      if (distance > 0) state.fov = clampFov(pinch.fov * pinch.distance / distance);
      return;
    }
    const speed = state.fov / DEFAULT_FOV;
    if (state.gyro && gyroYawOffset !== null) gyroYawOffset -= dx * 0.0052 * speed;
    else state.yaw -= dx * 0.0052 * speed;
    if (!state.gyro) state.pitch = clampPitch(state.pitch + dy * 0.0043 * speed);
  });
  const stopDrag = event => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) { state.dragging = false; root.classList.remove('is-dragging'); }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', stopDrag);
  canvas.addEventListener('wheel', event => { event.preventDefault(); state.fov = clampFov(state.fov + event.deltaY * 0.001); }, { passive: false });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!infoCard.hidden) { event.preventDefault(); closeCard(); return; }
      if (root.classList.contains('is-pseudo-fullscreen')) { event.preventDefault(); setPseudoFullscreen(false); fullscreenButton.focus(); return; }
    }
    if (event.target.closest('[role="tablist"], input, textarea')) return;
    const step = event.shiftKey ? 0.18 : 0.08;
    if (event.key === 'ArrowLeft') state.yaw -= step;
    else if (event.key === 'ArrowRight') state.yaw += step;
    else if (event.key === 'ArrowUp') state.pitch = clampPitch(state.pitch + step);
    else if (event.key === 'ArrowDown') state.pitch = clampPitch(state.pitch - step);
    else if (event.key === '+' || event.key === '=') state.fov = clampFov(state.fov - 0.08);
    else if (event.key === '-') state.fov = clampFov(state.fov + 0.08);
    else return;
    event.preventDefault();
  });

  // Fullscreen. iPhone Safari has no element fullscreen, so the viewer expands
  // over the page instead.
  const fullscreenButton = root.querySelector('[data-fullscreen]');
  const nativeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const canUseNativeFullscreen = () => Boolean((root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true));
  function syncFullscreenButton() {
    const active = nativeFullscreen() === root || root.classList.contains('is-pseudo-fullscreen');
    fullscreenButton.setAttribute('aria-label', active ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран');
    needsResize = true;
  }
  function setPseudoFullscreen(on) {
    root.classList.toggle('is-pseudo-fullscreen', on);
    document.documentElement.classList.toggle('tour-locked', on);
    syncFullscreenButton();
  }
  fullscreenButton.addEventListener('click', async () => {
    if (root.classList.contains('is-pseudo-fullscreen')) { setPseudoFullscreen(false); return; }
    try {
      if (nativeFullscreen()) await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
      else if (canUseNativeFullscreen()) await (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen());
      else setPseudoFullscreen(true);
    } catch {
      setPseudoFullscreen(true);
    }
  });
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  document.addEventListener('webkitfullscreenchange', syncFullscreenButton);

  const autoButton = root.querySelector('[data-auto]');
  autoButton?.addEventListener('click', event => {
    state.auto = !state.auto; event.currentTarget.setAttribute('aria-pressed', String(state.auto));
  });

  // Gyroscope: offered only on touch devices, where orientation sensors exist.
  const gyroButton = root.querySelector('[data-gyro]');
  const canGyro = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;
  if (gyroButton) gyroButton.hidden = !canGyro;
  let gyroWatchdog = 0, gyroFromPresence = false;
  // Converts W3C device orientation (Z-X'-Y'') to a viewing direction. The camera
  // looks out of the back of the device, so the result does not depend on
  // portrait or landscape screen orientation.
  function orientationToView(alpha, beta, gamma) {
    const a = alpha * Math.PI / 180, b = beta * Math.PI / 180, g = gamma * Math.PI / 180;
    const x = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
    const y = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
    const z = -Math.cos(b) * Math.cos(g);
    return { yaw: Math.atan2(x, y), pitch: Math.asin(Math.max(-1, Math.min(1, z))) };
  }
  function setGyroPressed(on) { gyroButton?.setAttribute('aria-pressed', String(on)); }
  function disableGyro() {
    state.gyro = false;
    gyroYawOffset = null;
    clearTimeout(gyroWatchdog);
    setGyroPressed(false);
  }
  async function enableGyro() {
    if (!canGyro) return false;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        if (await DeviceOrientationEvent.requestPermission() !== 'granted') {
          setStatus('Доступ к датчикам движения не разрешён.');
          return false;
        }
      } catch {
        setStatus(window.isSecureContext ? 'Не удалось включить управление движением.' : 'Гироскоп работает только при открытии сайта по HTTPS.');
        return false;
      }
    }
    state.gyro = true;
    gyroYawOffset = null;
    setGyroPressed(true);
    clearTimeout(gyroWatchdog);
    gyroWatchdog = setTimeout(() => {
      if (state.gyro && gyroYawOffset === null) {
        disableGyro();
        setStatus(window.isSecureContext ? 'Датчик движения не передаёт данные на этом устройстве.' : 'Гироскоп работает только при открытии сайта по HTTPS.');
      }
    }, 1500);
    return true;
  }
  gyroButton?.addEventListener('click', async () => {
    if (state.gyro) { disableGyro(); gyroFromPresence = false; } else { setStatus(''); await enableGyro(); }
  });
  window.addEventListener('deviceorientation', event => {
    if (!state.gyro || event.alpha == null || event.beta == null || event.gamma == null) return;
    const sensor = orientationToView(event.alpha, event.beta, event.gamma);
    // Keep the current view direction when the sensor takes over.
    if (gyroYawOffset === null) gyroYawOffset = state.yaw - sensor.yaw;
    state.yaw = sensor.yaw + gyroYawOffset;
    state.pitch = clampPitch(sensor.pitch);
  });

  // Presence effect («Эффект присутствия»): synthesized spatial sound, red/blue light accents,
  // vibration and, on phones, the gyroscope. Everything stops when it is off
  // or when the tab is hidden.
  const presenceButton = root.querySelector('[data-presence], [data-effects]');
  const legacySoundButton = root.querySelector('[data-sound]');
  let suspendTimer = 0;
  function createAmbientSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    const context = new Context();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;
    const low = context.createOscillator();
    const high = context.createOscillator();
    low.type = 'sine'; low.frequency.value = 92;
    high.type = 'sine'; high.frequency.value = 138;
    filter.type = 'lowpass'; filter.frequency.value = 420;
    master.gain.value = 0;
    low.connect(filter); high.connect(filter);
    if (panner) filter.connect(panner).connect(master); else filter.connect(master);
    master.connect(context.destination);
    low.start(); high.start();
    return { context, master, panner };
  }
  async function updateAmbient() {
    try {
      if (state.presence && !ambient) ambient = createAmbientSound();
      if (!ambient) {
        if (state.presence) setStatus('Звук недоступен, остальные эффекты продолжают работать.');
        return;
      }
      const { context, master } = ambient;
      const play = state.presence && !document.hidden;
      clearTimeout(suspendTimer);
      if (play) await context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(play ? 0.018 : 0, context.currentTime, 0.08);
      if (!play) suspendTimer = setTimeout(() => { if (!state.presence || document.hidden) context.suspend(); }, 350);
    } catch {
      setStatus('Звук недоступен, остальные эффекты продолжают работать.');
    }
  }
  async function togglePresence() {
    const on = !state.presence;
    state.presence = on;
    root.classList.toggle('presence-on', on);
    root.classList.toggle('effects-off', !on);
    presenceButton?.setAttribute('aria-pressed', String(on));
    legacySoundButton?.setAttribute('aria-pressed', String(on));
    setStatus('');
    announce(on ? 'Эффект присутствия включён.' : 'Эффект присутствия выключен.');
    if (on && navigator.vibrate) navigator.vibrate([25, 35, 25]);
    // Sound and the iOS sensor permission both need the click itself, so both start before any await.
    const sound = updateAmbient();
    const gyro = on && canGyro && !state.gyro ? enableGyro() : Promise.resolve(false);
    if (!on && gyroFromPresence) { disableGyro(); gyroFromPresence = false; }
    const [, gyroStarted] = await Promise.all([sound, gyro]);
    if (gyroStarted) {
      if (state.presence) gyroFromPresence = true;
      else disableGyro();
    }
  }
  if (presenceButton) {
    presenceButton.setAttribute('aria-pressed', 'false');
    presenceButton.addEventListener('click', togglePresence);
  }
  if (legacySoundButton) {
    legacySoundButton.setAttribute('aria-pressed', 'false');
    legacySoundButton.addEventListener('click', () => presenceButton ? presenceButton.click() : togglePresence());
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSpeech();
    if (ambient) updateAmbient();
  });
  window.addEventListener('pagehide', () => { stopSpeech(); ambient?.context.suspend(); });

  // WebXR (HTTPS and a compatible headset only)
  const vrButton = root.querySelector('[data-vr]');
  async function setupVR() {
    if (!vrButton || !navigator.xr || !window.isSecureContext) return;
    try { if (await navigator.xr.isSessionSupported('immersive-vr')) vrButton.hidden = false; } catch {}
  }
  vrButton?.addEventListener('click', async () => {
    if (xrSession) { xrSession.end().catch(() => {}); return; }
    let session = null;
    try {
      await gl.makeXRCompatible();
      session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
      xrSession = session;
      stopLoop();
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      const referenceSpace = await session.requestReferenceSpace('local');
      session.addEventListener('end', () => {
        xrSession = null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        vrButton.textContent = 'Войти в VR';
        needsResize = true;
        drawnKey = '';
        lastFrame = performance.now();
        startLoop();
      });
      const xrFrame = (time, frameData) => {
        const current = frameData.session, pose = frameData.getViewerPose(referenceSpace);
        gl.bindFramebuffer(gl.FRAMEBUFFER, current.renderState.baseLayer.framebuffer);
        if (pose) for (const view of pose.views) {
          const viewport = current.renderState.baseLayer.getViewport(view), matrix = new Float32Array(view.transform.inverse.matrix);
          matrix[12] = matrix[13] = matrix[14] = 0;
          draw(view.projectionMatrix, matrix, [viewport.x, viewport.y, viewport.width, viewport.height]);
        }
        current.requestAnimationFrame(xrFrame);
      };
      session.requestAnimationFrame(xrFrame);
      vrButton.textContent = 'Выйти из VR';
    } catch {
      if (session) session.end().catch(() => {});
      xrSession = null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      startLoop();
      setStatus('VR-режим недоступен на этом устройстве.');
    }
  });

  const requestedScene = sceneFromHash(location.hash.slice(1));
  loadScene(requestedScene && own(scenes, requestedScene) ? requestedScene : defaultScene);
  setupVR();
  startLoop();
})();
