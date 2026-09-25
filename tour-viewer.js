(() => {
  'use strict';

  const root = document.querySelector('[data-tour-viewer]');
  if (!root) return;

  // The tour fills the rest of the first screen: style.css sets its height to the
  // window height minus --tour-offset, the distance from the top of the page.
  function fitToScreen() {
    if (root.classList.contains('is-pseudo-fullscreen') || document.fullscreenElement || document.webkitFullscreenElement) return;
    root.style.setProperty('--tour-offset', `${Math.round(root.getBoundingClientRect().top + window.scrollY + 16)}px`);
  }
  fitToScreen();
  window.addEventListener('resize', fitToScreen, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(fitToScreen);
    for (const element of [document.querySelector('header'), document.querySelector('.tour-intro')]) if (element) observer.observe(element);
  }

  const canvas = root.querySelector('canvas');
  const fallback = root.querySelector('[data-tour-fallback]');
  const statusLine = root.querySelector('[data-vr-status]');
  const announcer = root.querySelector('[data-tour-announce]');
  let statusTimer = 0;
  const setStatus = text => {
    if (!statusLine) return;
    statusLine.textContent = text;
    clearTimeout(statusTimer);
    if (text) statusTimer = setTimeout(() => { statusLine.textContent = ''; }, 6000);
  };
  const announce = text => { if (announcer) announcer.textContent = text; };
  function showFallback(title, text, canRetry = false) {
    fallback.hidden = false;
    fallback.querySelector('strong').textContent = title;
    fallback.querySelector('span').textContent = text;
    const retry = fallback.querySelector('[data-tour-retry]');
    if (retry) retry.hidden = !canRetry;
    root.classList.remove('is-loading', 'is-switching', 'is-sharpening');
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
      image: '/assets/tour-exterior-demo.jpg?v=d4aa91a5fc',
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
      image: '/assets/tour-interior-demo.jpg?v=f97e5ef272',
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
      image: '/assets/tour-exterior-demo.jpg?v=d4aa91a5fc',
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
      image: '/assets/tour-interior-demo.jpg?v=f97e5ef272',
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
  const datasetKey = (prefix, name) => prefix + name.replace(/(?:^|-)(\w)/g, (match, letter) => letter.toUpperCase());

  // Panorama files and their previews come from the page (TOUR_PANORAMAS in
  // build_pages.py); the paths in `scenes` above are defaults for older markup.
  for (const name of Object.keys(scenes)) {
    const image = root.dataset[datasetKey('panorama', name)];
    if (image) scenes[name].image = image;
    scenes[name].preview = root.dataset[datasetKey('preview', name)] || null;
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

  // Numbers in the page introduction follow the scene data.
  const tourScenes = Object.values(scenes).filter(scene => (mode === 'demo') === (scene.vehicle === 'demo'));
  const plural = (n, forms) => forms[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];
  const stats = {
    scenes: [tourScenes.length, ['панорама', 'панорамы', 'панорам'], ' 360°'],
    points: [tourScenes.reduce((sum, scene) => sum + scene.hotspots.length, 0), ['интерактивная точка', 'интерактивные точки', 'интерактивных точек'], '']
  };
  for (const [key, [count, forms, suffix]] of Object.entries(stats)) {
    const value = document.querySelector(`[data-stat="${key}"]`), label = document.querySelector(`[data-stat-label="${key}"]`);
    if (value) value.textContent = String(count);
    if (label) label.textContent = plural(count, forms) + suffix;
  }

  const TAU = Math.PI * 2;
  const DEFAULT_FOV = Math.PI / 2.25, MIN_FOV = 0.58, MAX_FOV = 1.72, MAX_PITCH = 1.28;
  const clampFov = value => Math.max(MIN_FOV, Math.min(MAX_FOV, value));
  const clampPitch = value => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value));
  // `state` holds the view on screen. The camera eases towards `goal`; `flight`
  // is a scripted move (to a point, into another scene, the opening reveal).
  const state = { vehicle: 'b', scene: 'b-exterior', yaw: 0, pitch: -0.03, fov: DEFAULT_FOV, dragging: false, auto: false, gyro: false, presence: false };
  const goal = { yaw: 0, pitch: -0.03, fov: DEFAULT_FOV };
  const velocity = { yaw: 0, pitch: 0 };
  let flight = null;
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
  // High precision where available: with mediump, texture coordinates of large
  // panoramas are rounded on many phone GPUs and fine detail turns blocky.
  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
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

  // Textures. Power-of-two sizes allow mipmaps (no shimmer when zoomed out or near
  // the poles) and a repeating horizontal wrap (no seam behind the viewer) in WebGL 1.
  const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  // Phones get at most 4096 px: an 8K panorama with mipmaps needs about 170 MB of video memory.
  const lightDevice = matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory || 8) < 8;
  const textureLimit = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), lightDevice ? 4096 : 8192);
  const powerOfTwo = n => 2 ** Math.round(Math.log2(Math.max(1, n)));
  function upload(image, w, h) {
    let source = image;
    if (image.naturalWidth !== w || image.naturalHeight !== h) {
      source = document.createElement('canvas');
      source.width = w; source.height = h;
      const context = source.getContext('2d', { alpha: false });
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, w, h);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  }
  function setTexture(image) {
    if (!texture) texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    let w = Math.min(textureLimit, powerOfTwo(image.naturalWidth)), h = Math.min(textureLimit, powerOfTwo(image.naturalHeight));
    gl.getError();
    upload(image, w, h);
    let error = gl.getError();
    // Not enough video memory: try again at half the size.
    while (error === gl.OUT_OF_MEMORY && w > 1024) {
      w /= 2; h = Math.max(1, h / 2);
      upload(image, w, h);
      error = gl.getError();
    }
    if (error !== gl.NO_ERROR) throw new Error(`WebGL texture error: ${error}`);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (anisotropic) gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    textureVersion++;
  }

  // Camera motion.
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches || document.documentElement.classList.contains('no-motion');
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const easeOut = t => 1 - (1 - t) ** 3;
  const nearestYaw = (target, from) => target + TAU * Math.round((from - target) / TAU);
  let gyroYawOffset = null;
  function stopMotion() { velocity.yaw = velocity.pitch = 0; }
  function setView(view) {
    state.yaw = goal.yaw = view.yaw;
    state.pitch = goal.pitch = view.pitch;
    state.fov = goal.fov = view.fov;
  }
  // Scripted move; `done` runs on arrival. A locked move (walking into another
  // scene) is not interrupted by dragging.
  function flyTo(target, done = null, { duration = 0, ease = easeInOut, locked = false, from = null } = {}) {
    stopMotion();
    const start = from || { yaw: state.yaw, pitch: state.pitch, fov: state.fov };
    const to = { yaw: nearestYaw(target.yaw, start.yaw), pitch: clampPitch(target.pitch), fov: clampFov(target.fov ?? Math.min(state.fov, DEFAULT_FOV)) };
    if (state.gyro) gyroYawOffset = null;
    if (reducedMotion() || !inView || document.hidden || state.gyro) {
      flight = null;
      setView(to);
      done?.();
      return;
    }
    const distance = Math.hypot(to.yaw - start.yaw, to.pitch - start.pitch, (to.fov - start.fov) * 2);
    flight = { from: start, to, start: performance.now(), duration: duration || Math.min(1100, 400 + distance * 320), ease, done, locked };
  }
  // Where to aim at a point so that the description card does not cover it:
  // left of centre on wide screens (card on the right), above centre on phones (card at the bottom).
  const narrowLayout = matchMedia('(max-width: 800px)');
  function framing(spot) {
    const fov = Math.min(state.fov, DEFAULT_FOV), t = Math.tan(fov / 2), aspect = root.clientWidth / Math.max(1, root.clientHeight);
    if (narrowLayout.matches) return { yaw: spot.yaw, pitch: spot.pitch - Math.atan(0.42 * t), fov };
    return { yaw: spot.yaw + Math.atan(0.3 * t * aspect), pitch: spot.pitch, fov };
  }
  function stepCamera(now, dt) {
    if (flight) {
      const t = Math.min(1, (now - flight.start) / flight.duration), e = flight.ease(t), { from, to } = flight;
      setView({ yaw: from.yaw + (to.yaw - from.yaw) * e, pitch: from.pitch + (to.pitch - from.pitch) * e, fov: from.fov + (to.fov - from.fov) * e });
      if (t === 1) {
        const { done } = flight;
        flight = null;
        done?.();
      }
      return;
    }
    if (state.auto && !state.dragging) goal.yaw += dt * 0.08;
    if (!state.dragging && (velocity.yaw || velocity.pitch)) {
      goal.yaw += velocity.yaw * dt;
      goal.pitch = clampPitch(goal.pitch + velocity.pitch * dt);
      const decay = Math.exp(-dt * 4);
      velocity.yaw *= decay; velocity.pitch *= decay;
      if (Math.hypot(velocity.yaw, velocity.pitch) < 0.01) stopMotion();
    }
    // Keep angles small: the view and the goal move by whole turns together, so nothing jumps.
    const turns = Math.round(goal.yaw / TAU);
    if (turns) { goal.yaw -= turns * TAU; state.yaw -= turns * TAU; }
    const k = state.gyro || reducedMotion() ? 1 : 1 - Math.exp(-dt * (state.dragging ? 22 : 11));
    for (const axis of ['yaw', 'pitch', 'fov']) {
      const diff = goal[axis] - state[axis];
      state[axis] = Math.abs(diff) < 1e-4 ? goal[axis] : state[axis] + diff * k;
    }
  }

  // Hotspots. Buttons are always paired with the scene they were built for,
  // so a scene switch can never read hotspots of another scene.
  const hotspotsLayer = root.querySelector('[data-hotspots]');
  const hotspotList = document.querySelector('[data-hotspot-list]');
  const infoCard = root.querySelector('[data-tour-card]');
  const infoTitle = infoCard.querySelector('[data-card-title]');
  const infoText = infoCard.querySelector('[data-card-text]');
  const infoAction = infoCard.querySelector('[data-card-action]');
  const infoIndex = infoCard.querySelector('[data-card-index]');
  const prevButton = infoCard.querySelector('[data-card-prev]');
  const nextButton = infoCard.querySelector('[data-card-next]');
  const guideTimer = infoCard.querySelector('.tour-guide-timer');
  const speakButton = infoCard.querySelector('[data-card-speak]');
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (speakButton) speakButton.hidden = !canSpeak;
  let activeHotspot = null, cardOpener = null, placedHotspots = [];
  const infoSpots = scene => scene.hotspots.filter(spot => !spot.next);

  function chevron() {
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), path = document.createElementNS(ns, 'path');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '16', height: '16', 'aria-hidden': 'true' })) svg.setAttribute(name, value);
    for (const [name, value] of Object.entries({ d: 'M9 6l6 6-6 6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(name, value);
    svg.append(path);
    return svg;
  }
  function clearHotspots() {
    placedHotspots = [];
    hotspotsLayer.replaceChildren();
    hotspotList?.replaceChildren();
  }
  function buildHotspots(scene) {
    clearHotspots();
    let number = 0;
    scene.hotspots.forEach((spot, order) => {
      const button = document.createElement('button');
      button.className = spot.next ? 'tour-hotspot is-transition' : 'tour-hotspot';
      button.type = 'button';
      button.hidden = true;
      button.setAttribute('aria-label', spot.title);
      button.style.setProperty('--order', String(order));
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      if (spot.next) mark.append(chevron()); else mark.textContent = String(++number);
      const label = document.createElement('b');
      label.textContent = spot.title;
      button.append(mark, label);
      if (spot.next) {
        const action = document.createElement('small');
        action.textContent = spot.action;
        button.append(action);
      }
      button.addEventListener('click', () => { stopGuide(); openHotspot(spot, button); });
      hotspotsLayer.append(button);
      placedHotspots.push({ spot, button });
      if (hotspotList) {
        const item = document.createElement('li');
        if (spot.next) item.className = 'is-transition';
        const listButton = document.createElement('button');
        listButton.type = 'button';
        listButton.textContent = spot.next ? `${spot.title} · ${spot.action}` : spot.title;
        listButton.addEventListener('click', () => {
          stopGuide();
          flyTo(framing(spot));
          root.scrollIntoView({ block: 'nearest' });
          openHotspot(spot, listButton);
        });
        item.append(listButton);
        hotspotList.append(item);
      }
    });
  }
  function markActive() {
    for (const { spot, button } of placedHotspots) button.classList.toggle('is-active', spot === activeHotspot);
  }
  function stopSpeech() { if (canSpeak) speechSynthesis.cancel(); }
  function openHotspot(spot, opener, { focus = true } = {}) {
    activeHotspot = spot;
    cardOpener = opener || null;
    const info = infoSpots(scenes[state.scene]), index = info.indexOf(spot), canStep = !spot.next && info.length > 1;
    if (infoIndex) infoIndex.textContent = spot.next ? 'Переход' : `Точка ${index + 1} из ${info.length}`;
    if (prevButton) prevButton.hidden = !canStep;
    if (nextButton) nextButton.hidden = !canStep;
    infoTitle.textContent = spot.title;
    infoText.textContent = spot.text;
    infoAction.hidden = !spot.next;
    infoAction.textContent = spot.action || 'Перейти';
    stopSpeech();
    infoCard.hidden = false;
    if (focus) infoCard.focus({ preventScroll: true });
    markActive();
    if (state.presence && navigator.vibrate) navigator.vibrate(35);
  }
  function closeCard(restoreFocus = true) {
    if (infoCard.hidden) return;
    stopSpeech();
    infoCard.hidden = true;
    activeHotspot = null;
    markActive();
    if (!restoreFocus) return;
    const target = cardOpener && cardOpener.isConnected && !cardOpener.hidden ? cardOpener : root;
    target.focus({ preventScroll: true });
  }
  function stepHotspot(delta) {
    const info = infoSpots(scenes[state.scene]), index = info.indexOf(activeHotspot);
    if (index < 0 || info.length < 2) return;
    if (guide && delta > 0) { guideNext(); return; }
    stopGuide();
    const spot = info[(index + delta + info.length) % info.length];
    flyTo(framing(spot));
    openHotspot(spot, cardOpener, { focus: false });
  }
  prevButton?.addEventListener('click', () => stepHotspot(-1));
  nextButton?.addEventListener('click', () => stepHotspot(1));
  infoAction.addEventListener('click', () => {
    const spot = activeHotspot;
    if (!spot?.next) return;
    if (guide) {
      clearTimeout(guide.timer);
      guide.visited.add(spot.next);
      guide.pendingScene = spot.next;
    }
    goToScene(spot.next, spot);
    root.focus({ preventScroll: true });
  });
  infoCard.querySelector('[data-card-close]').addEventListener('click', () => { stopGuide(); closeCard(); });
  speakButton?.addEventListener('click', () => {
    if (!canSpeak || !activeHotspot) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(`${activeHotspot.title}. ${activeHotspot.text}`);
    utterance.lang = 'ru-RU';
    speechSynthesis.speak(utterance);
  });

  function updateHotspots(view) {
    const aspect = width / height, tan = Math.tan(state.fov / 2), w = root.clientWidth, h = root.clientHeight;
    for (const { spot, button } of placedHotspots) {
      const cp = Math.cos(spot.pitch), world = [Math.sin(spot.yaw) * cp, Math.sin(spot.pitch), -Math.cos(spot.yaw) * cp];
      const camera = applyMatrix(view, world), z = -camera[2];
      const x = camera[0] / Math.max(z, 0.001) / (tan * aspect), y = camera[1] / Math.max(z, 0.001) / tan;
      const visible = z > 0 && Math.abs(x) < 1.15 && Math.abs(y) < 1.15;
      button.hidden = !visible;
      if (visible) button.style.transform = `translate(-50%,-50%) translate(${((x + 1) * w / 2).toFixed(1)}px, ${((1 - y) * h / 2).toFixed(1)}px)`;
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
      stepCamera(now, dt);
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
  function syncThumbs(vehicle) {
    for (const tab of viewTabs) {
      const thumb = tab.querySelector('[data-scene-thumb]'), scene = scenes[`${vehicle}-${tab.dataset.view}`];
      const src = scene && (scene.preview || scene.image);
      if (thumb && src && thumb.getAttribute('src') !== src) thumb.src = src;
    }
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

  // Scene loading: the small preview appears at once, the full panorama replaces
  // it when downloaded. Afterwards the neighbouring scenes are fetched in advance.
  const vehicleTitle = document.querySelector('[data-current-vehicle]');
  const sceneName = root.querySelector('[data-scene-name]');
  const sceneIndex = root.querySelector('[data-scene-index]');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const prefetched = new Map();
  let firstLoad = true, sharpenTimer = 0;
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      const settle = () => (image.complete && image.naturalWidth ? resolve(image) : reject(new Error(url)));
      image.src = url;
      // decode() prepares the pixels off the main thread before the WebGL upload.
      // Some Safari versions reject decode() for large images that still load fine.
      if (image.decode) image.decode().then(() => resolve(image), () => { if (image.complete) settle(); else image.onload = image.onerror = settle; });
      else image.onload = image.onerror = settle;
    });
  }
  function prefetch(url) {
    if (!url || prefetched.has(url)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    prefetched.set(url, image);
  }
  function prefetchNeighbours(current) {
    for (const scene of tourScenes) {
      if (scene === current) continue;
      prefetch(scene.preview);
      if (scene.vehicle === current.vehicle && !saveData) prefetch(scene.image);
    }
  }
  function loadScene(name, fromUser = false, view = null) {
    if (!own(scenes, name)) return;
    const scene = scenes[name];
    const loadId = ++sceneLoadId;
    const target = view || { yaw: scene.yaw, pitch: scene.pitch, fov: DEFAULT_FOV };
    const intro = firstLoad;
    // A short dip to dark hides the change of picture; a walk through a door is already dark.
    const dip = !intro && !root.classList.contains('is-switching') && !reducedMotion();
    const veilReady = dip ? new Promise(resolve => setTimeout(resolve, 260)) : Promise.resolve();
    state.scene = name; state.vehicle = scene.vehicle;
    flight = null;
    stopMotion();
    if (state.gyro) gyroYawOffset = null;
    closeCard(false);
    clearHotspots();
    fallback.hidden = true;
    clearTimeout(sharpenTimer);
    sharpenTimer = 0;
    root.classList.remove('is-sharpening');
    root.classList.add('is-loading');
    root.setAttribute('aria-busy', 'true');
    let shown = '', fullFailed = false, previewFailed = !scene.preview;
    const failed = () => {
      if (loadId !== sceneLoadId) return;
      if (fullFailed && shown) {
        root.classList.remove('is-sharpening');
        setStatus('Панорама показана в сниженном качестве: полный файл не загрузился.');
      } else if (fullFailed && previewFailed) {
        showFallback('Не удалось загрузить панораму.', 'Проверьте подключение к интернету и повторите попытку.', true);
      }
    };
    const show = (image, full) => {
      if (loadId !== sceneLoadId || shown === 'full') return;
      try {
        setTexture(image);
      } catch {
        if (!shown) showFallback('Не удалось отобразить панораму.', 'Обновите страницу или откройте её в современной версии браузера.', true);
        return;
      }
      if (!shown) {
        setView(target);
        if (!reducedMotion()) flyTo(target, null, { from: { ...target, fov: clampFov(target.fov + (intro ? 0.3 : 0.16)) }, duration: intro ? 1200 : 800, ease: easeOut });
        root.classList.remove('is-loading', 'is-switching');
        root.removeAttribute('aria-busy');
        buildHotspots(scene);
        firstLoad = false;
        if (fromUser) announce(`${scene.title}. Активных точек: ${scene.hotspots.length}.`);
        if (guide && guide.pendingScene === name) continueGuide();
      }
      shown = full ? 'full' : 'preview';
      if (full) {
        clearTimeout(sharpenTimer);
        root.classList.remove('is-sharpening');
        prefetchNeighbours(scene);
      } else if (fullFailed) {
        failed();
      } else {
        sharpenTimer = setTimeout(() => { if (loadId === sceneLoadId && shown === 'preview') root.classList.add('is-sharpening'); }, 500);
      }
      startLoop();
    };
    if (scene.preview) loadImage(scene.preview).then(image => veilReady.then(() => show(image, false)), () => { previewFailed = true; failed(); });
    loadImage(scene.image).then(image => veilReady.then(() => show(image, true)), () => { fullFailed = true; failed(); });
    if (sceneName) sceneName.textContent = scene.title;
    if (sceneIndex) sceneIndex.textContent = `0${scene.view === 'exterior' ? 1 : 2} / 02`;
    syncTabs(viewTabs, tab => tab.dataset.view === scene.view);
    syncTabs(vehicleTabs, tab => tab.dataset.vehicle === scene.vehicle);
    syncThumbs(scene.vehicle);
    if (vehicleTitle) vehicleTitle.textContent = vehicles[scene.vehicle].title;
    history.replaceState(null, '', `#${name}`);
  }
  // Walking through a door: the camera moves towards it while the picture dims.
  function goToScene(name, via = null) {
    if (!own(scenes, name)) return;
    closeCard(false);
    if (via && fallback.hidden && inView && !document.hidden && !state.gyro && !reducedMotion()) {
      root.classList.add('is-switching');
      flyTo({ yaw: via.yaw, pitch: via.pitch, fov: MIN_FOV + 0.12 }, () => loadScene(name, true), { duration: 700, locked: true });
    } else {
      loadScene(name, true);
    }
  }
  fallback.querySelector('[data-tour-retry]')?.addEventListener('click', () => loadScene(state.scene, true));
  viewTabs.forEach(button => button.addEventListener('click', () => {
    const name = `${state.vehicle}-${button.dataset.view}`;
    if (name === state.scene && fallback.hidden) return;
    stopGuide();
    loadScene(name, true);
  }));
  vehicleTabs.forEach(button => button.addEventListener('click', () => {
    const currentView = scenes[state.scene]?.view || 'exterior';
    const name = `${button.dataset.vehicle}-${currentView}`;
    if (name === state.scene && fallback.hidden) return;
    stopGuide();
    loadScene(name, true);
  }));

  // Links to a view: #scene or #scene@yaw,pitch,fov (degrees), made by the «share» button.
  const toRadians = degrees => degrees * Math.PI / 180;
  const toDegrees = radians => Math.round(radians * 180 / Math.PI);
  function parseHash(raw) {
    const match = /^([a-z]+-[a-z]+)(?:@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,2}(?:\.\d+)?)(?:,(\d{1,3}(?:\.\d+)?))?)?$/.exec(raw);
    const scene = match && sceneFromHash(match[1]);
    if (!scene || !own(scenes, scene)) return null;
    const view = match[2] === undefined ? null : { yaw: toRadians(+match[2]), pitch: clampPitch(toRadians(+match[3])), fov: match[4] ? clampFov(toRadians(+match[4])) : DEFAULT_FOV };
    return { scene, view };
  }
  window.addEventListener('hashchange', () => {
    const target = parseHash(location.hash.slice(1));
    if (!target) return;
    if (target.scene !== state.scene || !fallback.hidden) { stopGuide(); loadScene(target.scene, true, target.view); }
    else if (target.view) { stopGuide(); flyTo(target.view); }
  });
  const shareButton = root.querySelector('[data-share]');
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch {}
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'copy-buffer';
    root.append(area);
    area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    area.remove();
    return copied;
  }
  shareButton?.addEventListener('click', async () => {
    const yaw = Math.atan2(Math.sin(state.yaw), Math.cos(state.yaw));
    const url = `${location.origin}${location.pathname}#${state.scene}@${toDegrees(yaw)},${toDegrees(state.pitch)},${toDegrees(state.fov)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: document.title, url }); return; } catch (error) { if (error && error.name === 'AbortError') return; }
    }
    const copied = await copyText(url);
    shareButton.focus({ preventScroll: true });
    setStatus(copied ? 'Ссылка на этот вид скопирована.' : `Скопируйте ссылку вручную: ${url}`);
  });

  // Guided tour («Экскурсия»): the camera visits every point of the scene, then
  // walks through the door into the next scene. Any direct input stops it.
  const guideButton = root.querySelector('[data-guide]');
  const autoButton = root.querySelector('[data-auto]');
  let guide = null;
  const dwellTime = spot => Math.min(12000, Math.max(5000, 2500 + spot.text.length * 45));
  function setAuto(on) {
    state.auto = on;
    autoButton?.setAttribute('aria-pressed', String(on));
  }
  function runGuideTimer(ms) {
    if (!guideTimer) return;
    guideTimer.style.setProperty('--dwell', `${ms}ms`);
    guideTimer.classList.remove('is-running');
    void guideTimer.offsetWidth;
    guideTimer.classList.add('is-running');
  }
  function startGuide() {
    if (!fallback.hidden || root.classList.contains('is-loading')) return;
    setAuto(false);
    guide = { visited: new Set([state.scene]), queue: infoSpots(scenes[state.scene]), timer: 0, pendingScene: null };
    guideButton?.setAttribute('aria-pressed', 'true');
    root.classList.add('is-guided');
    announce('Экскурсия началась. Перемещение панорамы остановит её.');
    guideNext();
  }
  function stopGuide(message = '') {
    if (!guide) return;
    clearTimeout(guide.timer);
    guide = null;
    guideButton?.setAttribute('aria-pressed', 'false');
    root.classList.remove('is-guided');
    guideTimer?.classList.remove('is-running');
    if (message) announce(message);
  }
  function guideShow(spot, then) {
    flyTo(framing(spot), () => {
      if (!guide) return;
      openHotspot(spot, null, { focus: false });
      announce(spot.title);
      const dwell = spot.next ? 3000 : dwellTime(spot);
      runGuideTimer(dwell);
      guide.timer = setTimeout(then, dwell);
    });
  }
  function guideNext() {
    if (!guide) return;
    clearTimeout(guide.timer);
    const spot = guide.queue.shift();
    if (spot) { guideShow(spot, guideNext); return; }
    const exit = scenes[state.scene].hotspots.find(item => item.next && !guide.visited.has(item.next));
    if (exit) {
      guideShow(exit, () => {
        if (!guide) return;
        guide.visited.add(exit.next);
        guide.pendingScene = exit.next;
        goToScene(exit.next, exit);
      });
      return;
    }
    closeCard(false);
    stopGuide('Экскурсия завершена.');
  }
  function continueGuide() {
    guide.pendingScene = null;
    guide.queue = infoSpots(scenes[state.scene]);
    guide.timer = setTimeout(guideNext, 900);
  }
  guideButton?.addEventListener('click', () => (guide ? stopGuide('Экскурсия остановлена.') : startGuide()));
  autoButton?.addEventListener('click', () => {
    if (!state.auto) stopGuide();
    setAuto(!state.auto);
  });

  // Mouse, touch and pen. One pointer turns the view, two pointers zoom; a flick keeps turning briefly.
  const pointers = new Map();
  let pinch = null, pinched = false, lastMove = 0;
  const pointerDistance = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  // Direct input ends the guided tour and any scripted move except walking through a door.
  function takeControl() {
    if (flight && flight.locked) return false;
    stopGuide();
    flight = null;
    stopMotion();
    root.classList.add('has-interacted');
    return true;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!takeControl()) return;
    if (pointers.size === 0) pinched = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: event.timeStamp });
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    if (pointers.size === 2) { pinch = { distance: pointerDistance(), fov: goal.fov }; pinched = true; }
    state.dragging = true;
    root.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y, seconds = Math.max(8, event.timeStamp - pointer.t) / 1000;
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.t = event.timeStamp;
    if (pinch && pointers.size >= 2) {
      const distance = pointerDistance();
      if (distance > 0) goal.fov = clampFov(pinch.fov * pinch.distance / distance);
      return;
    }
    const speed = state.fov / DEFAULT_FOV, dYaw = -dx * 0.0052 * speed, dPitch = dy * 0.0043 * speed;
    if (state.gyro && gyroYawOffset !== null) gyroYawOffset += dYaw;
    else goal.yaw += dYaw;
    if (!state.gyro) goal.pitch = clampPitch(goal.pitch + dPitch);
    velocity.yaw = velocity.yaw * 0.5 + dYaw / seconds * 0.5;
    velocity.pitch = velocity.pitch * 0.5 + dPitch / seconds * 0.5;
    lastMove = event.timeStamp;
  });
  const stopDrag = event => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    if (pointers.size > 0) return;
    state.dragging = false;
    root.classList.remove('is-dragging');
    // No inertia if the pointer rested before release, after a pinch, with the gyroscope or reduced motion.
    if (event.timeStamp - lastMove > 90 || pinched || state.gyro || reducedMotion()) stopMotion();
    else {
      velocity.yaw = Math.max(-3, Math.min(3, velocity.yaw));
      velocity.pitch = Math.max(-1.5, Math.min(1.5, velocity.pitch));
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('lostpointercapture', stopDrag);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (!takeControl()) return;
    const scale = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 400 : 1;
    goal.fov = clampFov(goal.fov + event.deltaY * scale * 0.001);
  }, { passive: false });
  root.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    if (takeControl()) goal.fov = clampFov(goal.fov + (button.dataset.zoom === 'in' ? -0.22 : 0.22));
  }));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!infoCard.hidden) { event.preventDefault(); stopGuide(); closeCard(); return; }
      if (guide) { event.preventDefault(); stopGuide('Экскурсия остановлена.'); return; }
      if (root.classList.contains('is-pseudo-fullscreen')) { event.preventDefault(); setPseudoFullscreen(false); fullscreenButton.focus(); return; }
    }
    if (event.target.closest('[role="tablist"], input, textarea')) return;
    const step = event.shiftKey ? 0.18 : 0.08;
    const moves = {
      ArrowLeft: () => { goal.yaw -= step; },
      ArrowRight: () => { goal.yaw += step; },
      ArrowUp: () => { goal.pitch = clampPitch(goal.pitch + step); },
      ArrowDown: () => { goal.pitch = clampPitch(goal.pitch - step); },
      '+': () => { goal.fov = clampFov(goal.fov - 0.08); },
      '=': () => { goal.fov = clampFov(goal.fov - 0.08); },
      '-': () => { goal.fov = clampFov(goal.fov + 0.08); }
    };
    if (!own(moves, event.key)) return;
    event.preventDefault();
    if (takeControl()) moves[event.key]();
  });

  // Fullscreen. iPhone Safari has no element fullscreen, so the viewer expands
  // over the page instead.
  const fullscreenButton = root.querySelector('[data-fullscreen]');
  const nativeFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const canUseNativeFullscreen = () => Boolean((root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true));
  function syncFullscreenButton() {
    const active = nativeFullscreen() === root || root.classList.contains('is-pseudo-fullscreen');
    fullscreenButton.setAttribute('aria-label', active ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран');
    root.classList.toggle('is-fullscreen', active);
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
    stopGuide();
    flight = null;
    stopMotion();
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
    state.yaw = goal.yaw = sensor.yaw + gyroYawOffset;
    state.pitch = goal.pitch = clampPitch(sensor.pitch);
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
      stopGuide();
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

  const requested = parseHash(location.hash.slice(1));
  loadScene(requested ? requested.scene : defaultScene, false, requested ? requested.view : null);
  setupVR();
  startLoop();
})();
