/* ============================================================
   EXPERT INTERPRINT — Cinematic 3D Printer Hero
   Three.js (importmap). Procedural printer that continuously
   prints product sheets textured with real mock images.
   Mouse-parallax tilt, CMYK rollers, particles, ink splashes.
   Mobile/low-end gets a lightweight 2D canvas fallback.
   ============================================================ */

const SHEET_LABELS = [
  'Business Cards', 'Flyers', 'Brochures', 'Packaging',
  'Labels', 'Stickers', 'Posters', 'Roll-up Banners'
];

// local mock images used as sheet textures
const SHEET_IMAGES = [
  'img/mock/7.jpg',  // namecard
  'img/mock/8.jpg',  // poster/flyer
  'img/mock/4.jpg',  // brochure
  'img/mock/6.jpg',  // packaging
  'img/mock/5.jpg',  // labels
  'img/mock/10.jpg', // stickers
  'img/mock/15.png', // poster
  'img/mock/12.jpg'  // catalog/rollup
];

const CMYK = [0x00c2e8, 0xe6007e, 0xffd400, 0x0d0d12];

/* ------------------------------------------------------------
   Entry — pick tier and mount
   ------------------------------------------------------------ */
export function mountHero(opts = {}) {
  const mount = document.querySelector(opts.mount || '#heroCanvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tier = window.EXPERT_TIER || 1;

  if (!mount) return;

  // Decide: real 3D vs 2D fallback
  if (!reduceMotion && tier >= 2 && supportsWebGL()) {
    try { mount3D(mount); }
    catch (e) { console.warn('3D hero failed, fallback', e); mount2D(mount); }
  } else {
    mount2D(mount);
  }
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

/* ============================================================
   3D SCENE (Three.js, imported via importmap)
   ============================================================ */
async function mount3D(mount) {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
  const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');

  let W = mount.clientWidth, H = mount.clientHeight;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070b, 0.045);

  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 2.2, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  // ---------- Lights ----------
  scene.add(new THREE.AmbientLight(0x404a66, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 9, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const rimWarm = new THREE.PointLight(0xff6b35, 6, 22, 2); rimWarm.position.set(-5, 2, -3); scene.add(rimWarm);
  const rimCool = new THREE.PointLight(0x00c2e8, 5, 22, 2); rimCool.position.set(5, 1, -4); scene.add(rimCool);
  const fillTop = new THREE.PointLight(0xe6007e, 2.4, 18, 2); fillTop.position.set(0, 5, 3); scene.add(fillTop);

  // ---------- Floor (reflection-ish dark glossy) ----------
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.5, roughness: 0.45 })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.0; floor.receiveShadow = true;
  scene.add(floor);

  // soft contact shadow blob
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
  );
  blob.rotation.x = -Math.PI / 2; blob.position.y = -1.99; scene.add(blob);

  // ---------- Printer group ----------
  const printer = new THREE.Group();
  scene.add(printer);

  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe9ecf2, metalness: 0.85, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x20242e, metalness: 0.6, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xff6b35, metalness: 0.5, roughness: 0.3, emissive: 0xff6b35, emissiveIntensity: 0.25 });

  // main body
  const body = new THREE.Mesh(new RoundedBoxGeometry(6.4, 3.4, 4.2, 6, 0.35), metalMat);
  body.position.y = 0; body.castShadow = true; body.receiveShadow = true;
  printer.add(body);

  // lower platen/base
  const base = new THREE.Mesh(new RoundedBoxGeometry(6.8, 0.7, 4.6, 5, 0.18), darkMat);
  base.position.y = -1.85; base.castShadow = true; base.receiveShadow = true;
  printer.add(base);

  // top hood accent strip
  const hood = new THREE.Mesh(new RoundedBoxGeometry(6.5, 0.35, 0.5, 4, 0.1), accentMat);
  hood.position.set(0, 1.55, -1.9); printer.add(hood);

  // control panel (angled glass)
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.3, roughness: 0.15, emissive: 0x00c2e8, emissiveIntensity: 0.18 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.0), panelMat);
  panel.position.set(-1.6, 1.2, 2.06); panel.rotation.x = -0.5; printer.add(panel);
  // panel glowing dot row
  for (let i = 0; i < 5; i++) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24),
      new THREE.MeshStandardMaterial({ color: CMYK[i % 4], emissive: CMYK[i % 4], emissiveIntensity: 2 }));
    dot.position.set(-2.5 + i * 0.22, 1.45, 2.06); dot.rotation.x = -0.5; printer.add(dot);
  }

  // output slot (dark recess) on front
  const slot = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: 0x000000 }));
  slot.position.set(0, -0.95, 2.12); printer.add(slot);

  // paper tray below slot
  const tray = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.18, 1.4, 3, 0.06), darkMat);
  tray.position.set(0, -1.35, 2.4); tray.castShadow = true; printer.add(tray);

  // ---------- CMYK glowing rollers ----------
  const rollers = [];
  const rollerGeo = new THREE.CylinderGeometry(0.22, 0.22, 4.6, 32);
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: CMYK[i], emissive: CMYK[i], emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
    const r = new THREE.Mesh(rollerGeo, mat);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.55 - i * 0.34, 1.7 + i * 0.02);
    r.castShadow = true;
    printer.add(r);
    // small glow point light on first two for richness (cheap)
    rollers.push({ mesh: r, mat });
  }
  // roller cover glass (front) so they read as "inside" the machine
  const glassFront = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.7, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.35 }));
  glassFront.position.set(0, 0.1, 2.1); printer.add(glassFront);

  // ---------- Paper sheets (queue) ----------
  const SHEET_W = 3.2, SHEET_H = 4.3, SHEET_T = 0.04;
  const sheetGeo = new RoundedBoxGeometry(SHEET_W, SHEET_H, SHEET_T, 2, 0.02);

  const texLoader = new THREE.TextureLoader();
  texLoader.crossOrigin = 'anonymous';
  const textures = SHEET_IMAGES.map(src => {
    const t = texLoader.load(src, tx => { tx.colorSpace = THREE.SRGBColorSpace; });
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });

  const sheetMat = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide });

  const sheets = [];
  const QUEUE = 3;
  for (let i = 0; i < QUEUE; i++) {
    const m = sheetMat();
    m.map = textures[i % textures.length];
    const s = new THREE.Mesh(sheetGeo, m);
    s.castShadow = true; s.receiveShadow = true;
    // start position depends on i (staggered queue coming out)
    s.userData = { idx: i, progress: -i * 0.5 };
    setSheetTransform(s);
    printer.add(s);
    sheets.push(s);
  }

  function setSheetTransform(s) {
    const p = s.userData.progress; // 0 = inside slot, 1 = fully out + dropping
    // emerging from z = 2.1 slot, moving +z and slightly down
    const out = Math.max(0, p);     // 0..1+
    const yShift = -out * out * 1.2; // gentle drop (gravity feel)
    s.position.set(0, -0.95 + yShift, 2.18 + out * 2.4);
    s.rotation.x = -0.04 - out * 0.12;
    s.rotation.z = Math.sin(p * 1.5) * 0.05;
    // clip-ish: fade before fully gone handled by opacity near end
  }

  // ---------- Floating ink particles ----------
  const PCOUNT = 260;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PCOUNT * 3);
  const pCol = new Float32Array(PCOUNT * 3);
  const pSpd = new Float32Array(PCOUNT);
  const palette = [new THREE.Color(0xff6b35), new THREE.Color(0x00c2e8), new THREE.Color(0xe6007e), new THREE.Color(0xffd400), new THREE.Color(0x00d4aa)];
  for (let i = 0; i < PCOUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 16;
    pPos[i * 3 + 1] = Math.random() * 8 - 2;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    const c = palette[(Math.random() * palette.length) | 0];
    pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
    pSpd[i] = 0.2 + Math.random() * 0.6;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---------- Ink splash sprites (decals on floor occasionally) ----------
  // use simple ring meshes as "splashes"
  const splashes = [];
  function spawnSplash() {
    const color = palette[(Math.random() * palette.length) | 0];
    const geo = new THREE.RingGeometry(0.02, 0.05 + Math.random() * 0.08, 24);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((Math.random() - 0.5) * 7, -1.98, 2 + Math.random() * 4);
    m.userData.life = 0;
    scene.add(m);
    splashes.push(m);
  }

  // ---------- Mouse parallax ----------
  const target = { rx: 0, ry: 0 };
  const cur = { rx: 0, ry: 0 };
  function onMove(e) {
    const x = (e.clientX / window.innerWidth - 0.5);
    const y = (e.clientY / window.innerHeight - 0.5);
    target.ry = x * 0.5;
    target.rx = y * 0.25;
  }
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    target.ry = THREE.MathUtils.clamp(e.gamma / 40, -0.5, 0.5);
    target.rx = THREE.MathUtils.clamp(e.beta / 90 - 0.5, -0.3, 0.3);
  }, { passive: true });

  // ---------- Composer + bloom ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.7, 0.2);
  composer.addPass(bloom);

  // ---------- Resize ----------
  function resize() {
    W = mount.clientWidth; H = mount.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H); composer.setSize(W, H);
  }
  window.addEventListener('resize', resize);

  // ---------- Visibility/pause ----------
  let running = true;
  const io = new IntersectionObserver(es => es.forEach(en => running = en.isIntersecting), { threshold: 0.05 });
  io.observe(mount);

  // ---------- Animate ----------
  const clock = new THREE.Clock();
  let splashTimer = 0;
  let labelIdx = 0;
  const labelEl = document.querySelector('#heroSheetLabel');

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // printer parallax tilt (lerped)
    cur.rx += (target.rx - cur.rx) * 0.06;
    cur.ry += (target.ry - cur.ry) * 0.06;
    printer.rotation.x = cur.rx;
    printer.rotation.y = cur.ry;
    printer.position.y = Math.sin(t * 0.8) * 0.08;

    // rollers spin
    rollers.forEach((r, i) => { r.mesh.rotation.x += dt * (2.2 + i * 0.4); });

    // advance sheets
    sheets.forEach(s => {
      s.userData.progress += dt * 0.32;
      setSheetTransform(s);
      // when fully out, recycle to next texture
      if (s.userData.progress > 1.5) {
        s.userData.progress -= 1.5 * QUEUE;
        const next = (labelIdx + s.userData.idx) % textures.length;
        s.material.map = textures[next];
        s.material.needsUpdate = true;
      }
    });
    // rotate label occasionally to match printed product
    if (t > (labelIdx + 1) * 2.6) { labelIdx = (labelIdx + 1) % SHEET_LABELS.length; if (labelEl) { labelEl.textContent = SHEET_LABELS[labelIdx]; labelEl.classList.remove('flip'); void labelEl.offsetWidth; labelEl.classList.add('flip'); } }

    // particles drift up + recycle
    const arr = particles.geometry.attributes.position.array;
    for (let i = 0; i < PCOUNT; i++) {
      arr[i * 3 + 1] += pSpd[i] * dt * 0.6;
      arr[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.15;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -2;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.02;

    // splashes spawn + grow/fade
    splashTimer += dt;
    if (splashTimer > 0.7) { splashTimer = 0; spawnSplash(); }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const m = splashes[i];
      m.userData.life += dt;
      const s = 1 + m.userData.life * 6;
      m.scale.set(s, s, s);
      m.material.opacity = Math.max(0, 0.6 - m.userData.life * 0.5);
      if (m.userData.life > 1.4) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); splashes.splice(i, 1); }
    }

    // subtle camera breathe
    camera.position.x = Math.sin(t * 0.2) * 0.4;
    camera.lookAt(0, 0.3, 0);

    composer.render();
  }
  animate();
}

/* ============================================================
   2D FALLBACK — lightweight animated printer on canvas
   ============================================================ */
function mount2D(mount) {
  const canvas = document.createElement('canvas');
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = mount.clientWidth; H = mount.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize(); window.addEventListener('resize', resize);

  // particles
  const P = 60;
  const cols = ['#ff6b35', '#00c2e8', '#e6007e', '#ffd400', '#00d4aa'];
  const parts = Array.from({ length: P }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: 1 + Math.random() * 3, vy: 0.2 + Math.random() * 0.8,
    c: cols[(Math.random() * cols.length) | 0]
  }));

  // sheets falling
  const sheets = SHEET_IMAGES.map((src, i) => ({ src, label: SHEET_LABELS[i], x: 0, y: -40, v: 0, rot: 0 }));
  const imgCache = {};
  sheets.forEach(s => { const im = new Image(); im.src = s.src; imgCache[s.src] = im; });

  let idx = 0;
  let active = null;
  let timer = 0;
  const labelEl = document.querySelector('#heroSheetLabel');

  function spawn() {
    active = { ...sheets[idx % sheets.length], x: W * 0.62, y: H * 0.42, v: 0, rot: (Math.random() - 0.5) * 0.2 };
    if (labelEl) { labelEl.textContent = active.label; labelEl.classList.remove('flip'); void labelEl.offsetWidth; labelEl.classList.add('flip'); }
    idx++;
  }

  function drawPrinter(cx, cy) {
    // body
    ctx.save();
    const grad = ctx.createLinearGradient(cx - 160, 0, cx + 160, 0);
    grad.addColorStop(0, '#3a3f4d'); grad.addColorStop(0.5, '#e9ecf2'); grad.addColorStop(1, '#3a3f4d');
    ctx.fillStyle = grad;
    roundRect(ctx, cx - 150, cy - 90, 300, 150, 18); ctx.fill();
    // base
    ctx.fillStyle = '#20242e'; roundRect(ctx, cx - 165, cy + 56, 330, 26, 10); ctx.fill();
    // rollers (CMYK)
    const cols2 = ['#00c2e8', '#e6007e', '#ffd400', '#ff6b35'];
    cols2.forEach((c, i) => {
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx - 90 + i * 60, cy - 30, 12, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    // slot
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 110, cy + 40, 220, 6);
    // accent strip
    ctx.fillStyle = '#ff6b35'; ctx.fillRect(cx - 150, cy - 90, 300, 8);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  let running = true;
  const io = new IntersectionObserver(es => es.forEach(e => running = e.isIntersecting), { threshold: 0.05 });
  io.observe(mount);

  function loop() {
    requestAnimationFrame(loop);
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // bg glow
    const g = ctx.createRadialGradient(W * 0.7, H * 0.5, 40, W * 0.7, H * 0.5, W * 0.5);
    g.addColorStop(0, 'rgba(255,107,53,0.18)'); g.addColorStop(1, 'rgba(7,7,11,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    drawPrinter(W * 0.62, H * 0.5);

    // active sheet sliding out
    if (!active && timer > 1400) { spawn(); timer = 0; }
    if (active) {
      active.v += 0.06; active.y += active.v; active.rot += 0.004;
      const im = imgCache[active.src];
      if (im && im.complete) {
        ctx.save(); ctx.translate(active.x, active.y); ctx.rotate(active.rot);
        const sw = 150, sh = 200;
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
        ctx.drawImage(im, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();
      }
      if (active.y > H + 120) active = null;
    }
    timer += 16;

    // particles
    parts.forEach(p => {
      p.y -= p.vy; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      ctx.fillStyle = p.c; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  spawn();
  loop();
}
