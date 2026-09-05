/**
 * ============================================================
 *  ROBOT COMPONENT v15.0 — Dual-Hand Upright Waving & Hello
 *
 *  - No hoop / cerceau.
 *  - Both floating hands are positioned upright (palms & fingers pointing up).
 *  - When clicked: Robot speaks "Hello! How can I help you today?" and
 *    BOTH hands raise up high, waving warmly with flexing fingers!
 * ============================================================
 */
(function () {
  'use strict';

  /* ── Math & Interpolation Helpers ─────────────────────── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  /* ══════════════════════════════════════════════════════ */
  function RobotComponent(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) { console.error('[Robot] Container not found:', containerId); return; }
    if (typeof THREE === 'undefined') { console.error('[Robot] THREE not loaded!'); return; }

    /* State */
    this.state = 'idle';   // idle | thinking | responding | happy | wink
    this.mode  = 'hero';   // hero | chat
    this.form  = 'head';   // head | hands

    /* Hands Transformation */
    this._transforming    = false;
    this._transformDir    = 1;        // 1 = deploy, -1 = retract
    this._handProgress    = 0.0;      // 0.0 (hidden) -> 1.0 (fully deployed)

    /* Camera */
    this._camZ            = 8.0;
    this._camZTarget      = 8.0;
    this._CAM_HEAD        = 7.8;
    this._CAM_HANDS       = 8.4;

    /* Physics & Float Motion */
    this._time            = 0;
    this._animFrame       = null;
    this._pos             = { x: 0, y: 0.55, z: 0 };
    this._rot             = { x: 0, y: 0, z: 0 };
    this._jumpImpulse     = 0;
    this._spinImpulse     = 0;

    /* Eye State */
    this._blinkTimer      = 0;
    this._nextBlinkTime   = 3.0;
    this._isBlinking      = false;

    /* Mouse Tracking */
    this._mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    /* Hand Gestures */
    this._isWaving        = false;
    this._waveTimer       = 0;

    /* Three.js Core */
    this._renderer = this._scene = this._camera = null;
    this._droneRoot = this._headGroup = null;
    this._antennas = [];
    this._thrusterRing = this._headThruster = this._headParticles = null;

    /* Pure Floating Hands */
    this._leftHandGroup   = this._rightHandGroup = null;
    this._leftPalmGroup   = this._rightPalmGroup = null;
    this._leftFingers     = [];
    this._rightFingers    = [];
    this._leftPalmCore    = this._rightPalmCore  = null;

    /* Face Canvas */
    this._faceCanvas = this._faceCtx = this._faceTexture = this._faceMesh = null;
    this._haloEl = null;

    this._init();
  }

  /* ── INITIALIZATION ───────────────────────────────────── */
  RobotComponent.prototype._init = function () {
    var self = this;
    this._buildOverlayDOM();
    this._createFaceCanvas();
    this._setupThree();
    this._buildModel();
    this._setupEvents();
    this._animate();
    setTimeout(function () { self._resizeRenderer(); }, 80);
  };

  /* ── GLOW HALO DOM ────────────────────────────────────── */
  RobotComponent.prototype._buildOverlayDOM = function () {
    var halo = document.createElement('div');
    halo.style.cssText = [
      'position:fixed;top:32%;left:50%;',
      'transform:translate(-50%,-50%);',
      'width:320px;height:320px;',
      'background:radial-gradient(circle,rgba(255,122,0,0.16) 0%,rgba(255,80,0,0.03) 50%,transparent 70%);',
      'border-radius:50%;pointer-events:none;z-index:10;transition:all 0.9s ease;'
    ].join('');
    document.body.appendChild(halo);
    this._haloEl = halo;
  };

  /* ── FACE CANVAS ─────────────────────────────────────── */
  RobotComponent.prototype._createFaceCanvas = function () {
    this._faceCanvas = document.createElement('canvas');
    this._faceCanvas.width  = 512;
    this._faceCanvas.height = 384;
    this._faceCtx    = this._faceCanvas.getContext('2d');
    this._faceTexture = new THREE.CanvasTexture(this._faceCanvas);
    this._drawFace();
  };

  RobotComponent.prototype._drawFace = function () {
    var ctx = this._faceCtx;
    var w = 512, h = 384, t = this._time;

    /* Cyber Screen Gradient */
    var bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 1.3);
    bg.addColorStop(0, '#221006');
    bg.addColorStop(0.65, '#120702');
    bg.addColorStop(1, '#050201');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    /* Scanlines */
    ctx.fillStyle = 'rgba(255,140,0,0.035)';
    for (var sy = 0; sy < h; sy += 4) ctx.fillRect(0, sy, w, 2);

    /* Grid */
    ctx.strokeStyle = 'rgba(255,122,0,0.06)';
    ctx.lineWidth = 1;
    for (var gx = 0; gx < w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
    for (var gy = 0; gy < h; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

    /* Corner Reticles */
    ctx.save();
    ctx.strokeStyle = 'rgba(255,140,0,0.35)';
    ctx.lineWidth = 1.8;
    [
      [20, 40, 20, 20, 40, 20],
      [w - 20, 40, w - 20, 20, w - 40, 20],
      [20, h - 40, 20, h - 20, 40, h - 20],
      [w - 20, h - 40, w - 20, h - 20, w - 40, h - 20]
    ].forEach(function (c) {
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); ctx.lineTo(c[4], c[5]); ctx.stroke();
    });

    /* Status Dot */
    var dotCol = this._transforming ? '#FF9100' : (this.form === 'hands' ? '#00E5FF' : '#00E676');
    ctx.shadowBlur = 10; ctx.shadowColor = dotCol; ctx.fillStyle = dotCol;
    ctx.beginPath(); ctx.arc(36, 30, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    /* Label */
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,190,120,0.9)';
    var lbl = this._transforming ? 'ARIA [TRANSFORMING]' : (this.form === 'hands' ? 'ARIA [HELLO!]' : 'ARIA [DRONE MODE]');
    ctx.fillText(lbl, 50, 33);

    /* State Status */
    var stat = 'ONLINE';
    if (this._transforming) stat = this._transformDir > 0 ? 'SAYING HELLO...' : 'RETRACTING...';
    else if (this.state === 'thinking') stat = 'COMPUTING...';
    else if (this.state === 'responding') stat = 'TRANSMITTING';
    else if (this.state === 'happy') stat = 'HELLO ♥';
    else if (this.state === 'wink') stat = 'HELLO ;)';
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,160,50,0.9)'; ctx.fillText(stat, w - 30, 33);
    ctx.restore();

    /* Eyes */
    var ec = '#FF9D00', eg = 'rgba(255,140,0,0.95)';
    if (this.state === 'thinking') { ec = '#FFD700'; eg = 'rgba(255,215,0,0.95)'; }
    else if (this.state === 'responding' || this.state === 'happy' || this.state === 'wink') { ec = '#FFAA1A'; eg = 'rgba(255,170,26,0.98)'; }
    if (this._transforming) { ec = '#00E5FF'; eg = 'rgba(0,229,255,0.95)'; }

    ctx.shadowBlur = 22; ctx.shadowColor = eg;
    ctx.strokeStyle = ec; ctx.fillStyle = ec; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    var tx2 = (this._mouse ? this._mouse.x : 0) * 14;
    var ty2 = (this._mouse ? -this._mouse.y : 0) * 10;
    var lx = 160 + tx2, rx = 352 + tx2, ey = 175 + ty2;

    if (this._isBlinking) {
      [lx, rx].forEach(function (ex) { ctx.beginPath(); ctx.moveTo(ex - 28, ey); ctx.lineTo(ex + 28, ey); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(220 + tx2 * 0.5, 270 + ty2 * 0.5); ctx.lineTo(292 + tx2 * 0.5, 270 + ty2 * 0.5); ctx.stroke();

    } else if (this._transforming) {
      var rot2 = t * 9;
      [[lx, 1], [rx, -1]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], ey, 26, rot2 * p[1], rot2 * p[1] + 4.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(p[0], ey, 12, -rot2 * p[1] * 1.3, -rot2 * p[1] * 1.3 + 3); ctx.stroke();
      });
      var sx3 = 180 + ((Math.sin(t * 8) + 1) / 2) * 152;
      ctx.beginPath(); ctx.moveTo(180 + tx2 * 0.4, 265 + ty2 * 0.4); ctx.lineTo(sx3 + tx2 * 0.4, 265 + ty2 * 0.4); ctx.stroke();

    } else if (this.state === 'thinking') {
      var r3 = t * 4.5;
      [[lx, 1], [rx, -1]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], ey, 28, r3 * p[1], r3 * p[1] + 4.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p[0], ey, 10, -r3 * p[1] * 1.5, -r3 * p[1] * 1.5 + 3.14); ctx.stroke();
      });
      ctx.beginPath();
      for (var wi = 0; wi < 100; wi += 5) {
        var wx = 206 + wi + tx2 * 0.4, wy = 268 + Math.sin(t * 10 + wi * 0.15) * 8;
        wi === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
      }
      ctx.stroke();

    } else if (this.state === 'responding') {
      var eb = Math.sin(t * 8) * 2.5, es = 34;
      [[lx], [rx]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] - es, ey + 10 + eb); ctx.quadraticCurveTo(p[0], ey - es + eb, p[0] + es, ey + 10 + eb); ctx.stroke(); });
      var sw = (Math.sin(t * 16) * 0.5 + 0.5) * (Math.sin(t * 7) * 0.35 + 0.65);
      var mh = 6 + sw * 36, mww = 78 + (1 - sw) * 14;
      var mcx = 256 + tx2 * 0.4, mcy = 256 + ty2 * 0.4, hw2 = mww / 2;
      var stx = mcx - hw2, etx = mcx + hw2, tly = mcy - mh * 0.28, bly = mcy + mh * 0.72;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(stx, mcy); ctx.quadraticCurveTo(mcx, tly - 3, etx, mcy); ctx.quadraticCurveTo(mcx, bly, stx, mcy); ctx.closePath();
      var mg = ctx.createLinearGradient(0, tly, 0, bly);
      mg.addColorStop(0, '#5A1E00'); mg.addColorStop(0.5, '#A83800'); mg.addColorStop(1, '#FF6A00');
      ctx.fillStyle = mg; ctx.fill();
      if (mh > 14) { ctx.fillStyle = '#FFAA33'; ctx.beginPath(); ctx.arc(mcx, bly - 2, hw2 * 0.42, Math.PI, 0); ctx.fill(); }
      if (mh > 18) { ctx.fillStyle = 'rgba(255,235,200,0.9)'; ctx.fillRect(mcx - 20, tly + 2, 40, 4); }
      ctx.restore();
      ctx.lineWidth = 10; ctx.strokeStyle = ec; ctx.shadowBlur = 24; ctx.shadowColor = eg;
      ctx.beginPath(); ctx.moveTo(stx, mcy); ctx.quadraticCurveTo(mcx, tly - 3, etx, mcy); ctx.quadraticCurveTo(mcx, bly, stx, mcy); ctx.closePath(); ctx.stroke();
      var cg2 = 0.32 + sw * 0.18; ctx.fillStyle = 'rgba(255,130,40,' + cg2.toFixed(2) + ')';
      [[112 + tx2, 236 + ty2], [400 + tx2, 236 + ty2]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 24, 14, 0, 0, Math.PI * 2); ctx.fill(); });

    } else if (this.state === 'wink') {
      ctx.beginPath(); ctx.arc(lx, ey, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(rx - 30, ey + 6); ctx.quadraticCurveTo(rx, ey - 22, rx + 30, ey + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(215 + tx2 * 0.4, 252 + ty2 * 0.4); ctx.quadraticCurveTo(256 + tx2 * 0.4, 306 + ty2 * 0.4, 297 + tx2 * 0.4, 252 + ty2 * 0.4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,50,0.4)';
      [[112 + tx2, 236 + ty2], [400 + tx2, 236 + ty2]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 24, 14, 0, 0, Math.PI * 2); ctx.fill(); });

    } else {
      var es2 = 34;
      [[lx], [rx]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0] - es2, ey + 12); ctx.quadraticCurveTo(p[0], ey - es2, p[0] + es2, ey + 12); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(215 + tx2 * 0.4, 252 + ty2 * 0.4); ctx.quadraticCurveTo(256 + tx2 * 0.4, 306 + ty2 * 0.4, 297 + tx2 * 0.4, 252 + ty2 * 0.4); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,40,0.30)';
      [[112 + tx2, 236 + ty2], [400 + tx2, 236 + ty2]].forEach(function (p) { ctx.beginPath(); ctx.ellipse(p[0], p[1], 22, 12, 0, 0, Math.PI * 2); ctx.fill(); });
    }

    ctx.shadowBlur = 0;
    this._faceTexture.needsUpdate = true;
  };

  /* ── THREE.JS SETUP ───────────────────────────────────── */
  RobotComponent.prototype._setupThree = function () {
    var self = this;
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setClearColor(0x000000, 0);
    var cv = this._renderer.domElement;
    cv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:15;';
    this.container.appendChild(cv);

    this._scene  = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
    this._camera.position.set(0, 0.0, this._camZ);

    /* Stage Lighting */
    this._scene.add(new THREE.AmbientLight(0x281812, 2.8));
    var kl = new THREE.PointLight(0xFF8C00, 5.0, 22); kl.position.set(2.8, 3.5, 6.0); this._scene.add(kl);
    var rl = new THREE.PointLight(0xFFA500, 4.0, 20); rl.position.set(-3.5, 2.0, -3.0); this._scene.add(rl);
    var tl = new THREE.PointLight(0xFF6600, 4.2, 14); tl.position.set(0, -2.5, 1.0); this._scene.add(tl);
    var cl = new THREE.PointLight(0x00E5FF, 2.8, 14); cl.position.set(0, 0.5, 4.0); this._scene.add(cl);

    this._resizeRenderer();
    window.addEventListener('resize', function () { self._resizeRenderer(); });
  };

  RobotComponent.prototype._resizeRenderer = function () {
    var w = window.innerWidth || 800, h = window.innerHeight || 600;
    this._renderer.setSize(w, h, false);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  };

  /* ── 3D MODEL BUILDER ─────────────────────────────────── */
  RobotComponent.prototype._buildModel = function () {
    var mOrange = new THREE.MeshStandardMaterial({
      color: 0xEE5C00, roughness: 0.22, metalness: 0.50, emissive: 0x551E00, emissiveIntensity: 0.38
    });
    var mWire = new THREE.MeshBasicMaterial({
      color: 0xFFB040, wireframe: true, transparent: true, opacity: 0.35
    });
    var mCarbon = new THREE.MeshStandardMaterial({
      color: 0x161822, roughness: 0.28, metalness: 0.92
    });
    var mGold = new THREE.MeshStandardMaterial({
      color: 0xFFB300, roughness: 0.16, metalness: 0.88, emissive: 0xFF8800, emissiveIntensity: 0.55
    });
    var mGlow = new THREE.MeshStandardMaterial({
      color: 0xFFC04D, roughness: 0.10, metalness: 0.15, emissive: 0xFF8C00, emissiveIntensity: 1.5
    });
    var mCyanGlow = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, emissive: 0x00E5FF, emissiveIntensity: 2.8, roughness: 0.08
    });

    function cyber(geo, base) {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(geo, base));
      var w = new THREE.Mesh(geo, mWire); w.scale.setScalar(1.003); g.add(w);
      return g;
    }
    function mkTorus(R, r, mat, pos, rotX) {
      var g = new THREE.TorusGeometry(R, r, 16, 32);
      if (rotX !== undefined) g.rotateX(rotX);
      var m = new THREE.Mesh(g, mat);
      if (pos) m.position.fromArray(pos);
      return m;
    }
    function mkBox(w2, h2, d, mat, pos) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d), mat);
      if (pos) m.position.fromArray(pos);
      return m;
    }
    function mkCyl(rT, rB, h2, seg, mat, pos) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h2, seg), mat);
      if (pos) m.position.fromArray(pos);
      return m;
    }
    function mkSph(r, mat, pos) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mat);
      if (pos) m.position.fromArray(pos);
      return m;
    }

    /* Overall Root */
    this._droneRoot = new THREE.Group();
    this._scene.add(this._droneRoot);

    /* ══════════════════════════════════════════════════════
     *  1. HEAD UNIT
     * ══════════════════════════════════════════════════════ */
    this._headGroup = new THREE.Group();
    this._droneRoot.add(this._headGroup);

    /* Main Chassis */
    this._headGroup.add(cyber(new THREE.BoxGeometry(2.1, 1.55, 1.4, 8, 6, 6), mOrange));
    this._headGroup.add(mkBox(1.92, 1.38, 0.12, mCarbon, [0, 0, 0.67]));

    /* Face Screen */
    var sm = new THREE.MeshBasicMaterial({ map: this._faceTexture, transparent: true });
    this._faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.28), sm);
    this._faceMesh.position.z = 0.74;
    this._headGroup.add(this._faceMesh);

    /* Visor */
    var glMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, transmission: 0.9 });
    var gl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.28), glMat);
    gl.position.z = 0.75;
    this._headGroup.add(gl);

    /* Ear Turbines */
    [[-1.12, 0, 0], [1.12, 0, 0]].forEach(function (pos, idx) {
      var eg = new THREE.Group(); eg.position.fromArray(pos);
      eg.add(mkCyl(0.38, 0.38, 0.22, 16, mCarbon, [0, 0, 0]));
      eg.add(mkTorus(0.36, 0.04, mGold, [0, 0, (idx === 0 ? -0.12 : 0.12)], Math.PI / 2));
      this._headGroup.add(eg);
    }, this);

    /* Antennas */
    var antP = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8);
    [[-0.75, 0.44], [0.75, -0.44]].forEach(function (p) {
      var ag = new THREE.Group(); ag.position.set(p[0], 0.80, 0); ag.rotation.z = p[1];
      var pole = new THREE.Mesh(antP, mGold); pole.position.y = 0.28; ag.add(pole);
      ag.add(mkSph(0.13, mGlow, [0, 0.55, 0]));
      this._headGroup.add(ag); this._antennas.push(ag);
    }, this);

    /* Underside Hover Thruster */
    this._headThruster = new THREE.Group();
    this._headThruster.add(mkCyl(0.44, 0.32, 0.22, 16, mCarbon, [0, -0.88, 0]));
    this._thrusterRing = mkTorus(0.40, 0.045, new THREE.MeshBasicMaterial({ color: 0xFF8C00 }), [0, -0.96, 0], Math.PI / 2);
    this._headThruster.add(this._thrusterRing);
    this._headParticles = this._makeParticles(25, 0.40, -0.95, 0.8, 0.08, 0xFFA834);
    this._headThruster.add(this._headParticles);
    this._headGroup.add(this._headThruster);

    /* ══════════════════════════════════════════════════════
     *  2. UPRIGHT FLOATING CYBER HANDS (Left & Right)
     *  Fingers pointing UPWARDS with glowing palm core
     * ══════════════════════════════════════════════════════ */
    var HID = 0.001;

    function buildUprightCyberHand(isLeft) {
      var root = new THREE.Group();
      root.scale.setScalar(HID);

      /* Magnetic Floating Bottom Wrist Base */
      var cuff = new THREE.Group();
      cuff.position.set(0, -0.36, 0);
      cuff.add(mkCyl(0.28, 0.24, 0.20, 16, mCarbon));
      cuff.add(mkTorus(0.29, 0.035, mGold, [0, 0.06, 0], Math.PI / 2));
      cuff.add(mkTorus(0.25, 0.03, mCyanGlow, [0, -0.06, 0], Math.PI / 2));
      root.add(cuff);

      /* Wrist Pivot Ball */
      var wristBall = mkSph(0.16, mGold, [0, -0.22, 0]);
      root.add(wristBall);

      /* Main Palm Group (Center at Y = 0) */
      var palmGroup = new THREE.Group();
      palmGroup.position.set(0, 0, 0);

      /* Armored Cyber Palm */
      palmGroup.add(cyber(new THREE.BoxGeometry(0.52, 0.44, 0.20), mOrange));
      palmGroup.add(mkBox(0.46, 0.36, 0.08, mCarbon, [0, 0, 0.08]));  // Front Face
      palmGroup.add(mkBox(0.46, 0.36, 0.08, mCarbon, [0, 0, -0.08])); // Back Plate

      /* Glowing Energy Repulsor Core */
      var palmCore = mkSph(0.11, mCyanGlow, [0, 0, 0.10]);
      palmGroup.add(palmCore);
      palmGroup.add(mkTorus(0.15, 0.025, mGold, [0, 0, 0.10], 0));

      /* 4 Articulated Cyber Fingers Pointing UPWARDS */
      var fingers = [];
      var fingerX = [-0.17, -0.06, 0.06, 0.17];
      var fingerLengths = [0.26, 0.33, 0.31, 0.24];

      fingerX.forEach(function (fx, i) {
        var fg = new THREE.Group();
        fg.position.set(fx, 0.22, 0); // Sits at top edge of palm

        /* Knuckle Joint */
        fg.add(mkSph(0.055, mGold, [0, 0, 0]));

        /* Proximal Phalanx (extends upward) */
        var h1 = fingerLengths[i] * 0.55;
        var ph1 = mkBox(0.085, h1, 0.085, mOrange, [0, h1 * 0.5, 0]);
        fg.add(ph1);

        /* Middle Joint */
        fg.add(mkSph(0.05, mGold, [0, h1, 0]));

        /* Distal Phalanx (extends upward with slight curvature) */
        var h2 = fingerLengths[i] * 0.45;
        var ph2 = mkBox(0.075, h2, 0.075, mCarbon, [0, h1 + h2 * 0.5, 0.02]);
        fg.add(ph2);

        palmGroup.add(fg);
        fingers.push(fg);
      });

      /* Thumb Extending Up & Out from the side */
      var thumb = new THREE.Group();
      var thumbSide = isLeft ? 0.30 : -0.30;
      thumb.position.set(thumbSide, 0.02, 0.04);
      thumb.rotation.z = isLeft ? -0.50 : 0.50; // Angled outward
      thumb.add(mkSph(0.065, mGold, [0, 0, 0]));
      thumb.add(mkBox(0.085, 0.18, 0.085, mOrange, [0, 0.09, 0]));
      thumb.add(mkSph(0.055, mGold, [0, 0.18, 0]));
      thumb.add(mkBox(0.075, 0.15, 0.075, mCarbon, [0, 0.25, 0.02]));
      palmGroup.add(thumb);
      fingers.push(thumb);

      root.add(palmGroup);

      return {
        root: root,
        palmGroup: palmGroup,
        palmCore: palmCore,
        fingers: fingers
      };
    }

    /* Left Hand */
    var leftHandData = buildUprightCyberHand(true);
    this._leftHandGroup = leftHandData.root;
    this._leftPalmGroup = leftHandData.palmGroup;
    this._leftPalmCore  = leftHandData.palmCore;
    this._leftFingers   = leftHandData.fingers;
    this._leftHandGroup.position.set(-1.60, 0.0, 0.25);
    this._droneRoot.add(this._leftHandGroup);

    /* Right Hand */
    var rightHandData = buildUprightCyberHand(false);
    this._rightHandGroup = rightHandData.root;
    this._rightPalmGroup = rightHandData.palmGroup;
    this._rightPalmCore  = rightHandData.palmCore;
    this._rightFingers   = rightHandData.fingers;
    this._rightHandGroup.position.set(1.60, 0.0, 0.25);
    this._droneRoot.add(this._rightHandGroup);
  };

  RobotComponent.prototype._makeParticles = function (count, radius, baseY, spread, size, color) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = baseY - Math.random() * spread;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ color: color, size: size, transparent: true, opacity: 0.82 });
    var g = new THREE.Group(); g.add(new THREE.Points(geo, mat)); return g;
  };

  /* ── EVENTS ───────────────────────────────────────────── */
  RobotComponent.prototype._setupEvents = function () {
    var self = this;
    window.addEventListener('mousemove', function (e) {
      self._mouse.targetX = clamp((e.clientX / window.innerWidth) * 2 - 1, -1.5, 1.5);
      self._mouse.targetY = clamp(-((e.clientY / window.innerHeight) * 2 - 1), -1.5, 1.5);
    });

    window.addEventListener('click', function (e) {
      if (e.target.closest('input,textarea,button,.suggestion-chip,.question-card')) return;
      var w = window.innerWidth, h = window.innerHeight, inZone = false;
      if (self.mode === 'hero') {
        inZone = e.clientX > w * 0.20 && e.clientX < w * 0.80 && e.clientY > h * 0.05 && e.clientY < h * 0.65;
      } else {
        inZone = e.clientX > w * 0.60 && e.clientY < h * 0.55;
      }
      if (inZone && !self._transforming) self.transform();
    });
  };

  /* ── TRANSFORM TRIGGER & HELLO GREETING ───────────────── */
  RobotComponent.prototype.transform = function () {
    if (this._transforming) return;
    var self = this;
    var toHands = (this.form === 'head');
    this.form          = toHands ? 'hands' : 'head';
    this._transforming = true;
    this._transformDir = toHands ? 1 : -1;
    this._camZTarget   = toHands ? this._CAM_HANDS : this._CAM_HEAD;
    this._jumpImpulse  = 0.45;
    this._spinImpulse  = toHands ? Math.PI * 2.0 : -(Math.PI * 2.0);
    this.setState('happy');

    if (toHands) {
      this._isWaving = true;
      this._waveTimer = 3.8;
    }

    if (window.VoiceService) {
      window.VoiceService.playSuccess();
      var msg = toHands ? 'Hello! How can I help you today?' : 'Retracting hands to drone mode.';
      window.VoiceService.speak(msg, null, function () { self.setState('idle'); });
    }
  };

  /* ── MAIN ANIMATION LOOP ──────────────────────────────── */
  RobotComponent.prototype._animate = function () {
    var self = this;
    var dt = 0.016;
    this._time += dt;

    /* Mouse Smooth Lerp */
    this._mouse.x = lerp(this._mouse.x, this._mouse.targetX, 0.06);
    this._mouse.y = lerp(this._mouse.y, this._mouse.targetY, 0.06);

    /* Camera Zoom Lerp */
    this._camZ = lerp(this._camZ, this._camZTarget, 0.06);
    this._camera.position.z = this._camZ;

    /* Hand Materialization Progress */
    var targetProg = (this.form === 'hands') ? 1.0 : 0.0;
    this._handProgress = lerp(this._handProgress, targetProg, 0.12);
    if (Math.abs(this._handProgress - targetProg) < 0.008) {
      this._handProgress = targetProg;
      this._transforming = false;
    }

    var hp = easeOutExpo(this._handProgress);
    var handScale = Math.max(0.001, hp);

    /* Update Left & Right Hands Scale and Floating Positions */
    if (this._leftHandGroup && this._rightHandGroup) {
      this._leftHandGroup.scale.setScalar(handScale);
      this._rightHandGroup.scale.setScalar(handScale);

      var spreadX = (1 - hp) * 0.9;
      var restLeftX  = -1.60 - spreadX;
      var restRightX =  1.60 + spreadX;

      /* Natural Organic Floating Bob */
      var lFloatY = 0.0 + Math.sin(this._time * 2.0) * 0.08;
      var rFloatY = 0.0 + Math.cos(this._time * 2.0) * 0.08;

      /* When waving, raise BOTH hands up high next to helmet */
      if (this._isWaving && this.form === 'hands') {
        lFloatY += 0.45;
        rFloatY += 0.45;
      }

      this._leftHandGroup.position.set(restLeftX, lFloatY, 0.28);
      this._rightHandGroup.position.set(restRightX, rFloatY, 0.28);
    }

    /* Floating Dynamics */
    var isMobile = (window.innerWidth <= 768);
    var baseY = isMobile ? 1.05 : 0.55;
    var scl   = isMobile ? 0.44 : 0.68;
    var ttx = 0, tty = baseY, ttz = 0;

    if (this.mode === 'hero') {
      ttx  = Math.sin(this._time * 0.9) * (isMobile ? 0.08 : 0.20) + this._mouse.x * (isMobile ? 0.12 : 0.28);
      tty += Math.cos(this._time * 1.2) * (isMobile ? 0.06 : 0.12) + this._mouse.y * (isMobile ? 0.08 : 0.18);
      ttz  = Math.sin(this._time * 1.1) * 0.10;
    } else {
      var asp = this._camera.aspect || 1.6;
      var cx  = Math.min(3.4, Math.max(2.5, asp * 1.85));
      ttx = cx + Math.sin(this._time * 0.6) * 0.08 + this._mouse.x * 0.10;
      tty = 1.35 + Math.cos(this._time * 0.8) * 0.07 + this._mouse.y * 0.08;
      ttz = -0.4;
      scl = isMobile ? 0 : 0.32;
    }

    if (this.state === 'thinking') tty += Math.sin(this._time * 4) * 0.07;
    else if (this.state === 'responding') tty += Math.sin(this._time * 12) * 0.04;
    else if (this.state === 'happy') tty += Math.sin(this._time * 8) * 0.07;

    if (Math.abs(this._jumpImpulse) > 0.005) {
      tty += this._jumpImpulse;
      this._jumpImpulse = lerp(this._jumpImpulse, 0, 0.11);
    }

    var rx = -this._mouse.y * 0.18 + Math.sin(this._time * 1.4) * 0.025;
    var ry =  this._mouse.x * 0.28 + Math.sin(this._time * 0.8) * 0.05;
    var rz = -this._mouse.x * 0.09 + Math.cos(this._time * 1.1) * 0.025;
    if (this.mode === 'chat') ry -= 0.18;
    if (this.state === 'thinking') { rz = -0.16 + Math.sin(this._time * 6) * 0.05; rx = -0.10; }
    if (this.state === 'responding') rx += Math.sin(this._time * 10) * 0.025;
    if (Math.abs(this._spinImpulse) > 0.01) {
      ry += this._spinImpulse;
      this._spinImpulse = lerp(this._spinImpulse, 0, 0.08);
    }

    this._pos.x = lerp(this._pos.x, ttx, 0.07);
    this._pos.y = lerp(this._pos.y, tty, 0.07);
    this._pos.z = lerp(this._pos.z, ttz, 0.07);
    this._rot.x = lerp(this._rot.x, rx, 0.08);
    this._rot.y = lerp(this._rot.y, ry, 0.08);
    this._rot.z = lerp(this._rot.z, rz, 0.08);

    if (this._droneRoot) {
      this._droneRoot.position.set(this._pos.x, this._pos.y, this._pos.z);
      this._droneRoot.rotation.set(this._rot.x, this._rot.y, this._rot.z);
      this._droneRoot.scale.setScalar(lerp(this._droneRoot.scale.x, scl, 0.07));
    }

    /* ── DUAL HAND GESTURES & WAVING (BOTH HANDS RAISED HIGH) ── */
    if (this._waveTimer > 0) {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) this._isWaving = false;
    }

    if (this._leftHandGroup) {
      if (this._isWaving && this.form === 'hands') {
        /* Left Hand Waving High Hello */
        var lWaveZ = Math.sin(this._time * 13) * 0.38 - 0.12;
        var lWaveX = -0.15 + Math.sin(this._time * 6) * 0.08;
        var lWaveY = 0.15;
        this._leftHandGroup.rotation.set(lWaveX, lWaveY, lWaveZ);

        /* Flex fingers dynamically */
        this._leftFingers.forEach(function (fg, i) {
          fg.rotation.x = -Math.sin(self._time * 13 + i * 0.4) * 0.28 - 0.10;
        });
      } else {
        /* Natural upright companion hover */
        var lRotZ = -0.12 - Math.sin(this._time * 1.5) * 0.06;
        var lRotX = -this._mouse.y * 0.18 + Math.sin(this._time * 1.8) * 0.04;
        var lRotY =  this._mouse.x * 0.22 - 0.08;
        this._leftHandGroup.rotation.set(lRotX, lRotY, lRotZ);

        this._leftFingers.forEach(function (fg, i) {
          fg.rotation.x = lerp(fg.rotation.x, -0.10 - Math.sin(self._time * 1.2 + i * 0.3) * 0.06, 0.08);
        });
      }
    }

    if (this._rightHandGroup) {
      if (this._isWaving && this.form === 'hands') {
        /* Right Hand Waving High Hello (Synchronous Joyful Wave) */
        var rWaveZ = -Math.sin(this._time * 13) * 0.38 + 0.12;
        var rWaveX = -0.15 + Math.cos(this._time * 6) * 0.08;
        var rWaveY = -0.15;
        this._rightHandGroup.rotation.set(rWaveX, rWaveY, rWaveZ);

        /* Flex right fingers dynamically */
        this._rightFingers.forEach(function (fg, i) {
          fg.rotation.x = -Math.sin(self._time * 13 + i * 0.4 + 0.5) * 0.28 - 0.10;
        });
      } else {
        var rRotZ = 0.12 + Math.sin(this._time * 1.5 + 1) * 0.06;
        var rRotX = -this._mouse.y * 0.18 + Math.sin(this._time * 1.8 + 1) * 0.04;
        var rRotY =  this._mouse.x * 0.22 + 0.08;
        this._rightHandGroup.rotation.set(rRotX, rRotY, rRotZ);

        this._rightFingers.forEach(function (fg, i) {
          fg.rotation.x = lerp(fg.rotation.x, -0.10 - Math.sin(self._time * 1.2 + i * 0.3 + 1) * 0.06, 0.08);
        });
      }
    }

    /* Pulse Repulsor Palm Cores */
    if (this._leftPalmCore && this._rightPalmCore) {
      var coreScale = 1 + Math.sin(this._time * 8) * 0.22;
      this._leftPalmCore.scale.setScalar(coreScale);
      this._rightPalmCore.scale.setScalar(coreScale);
    }

    /* Antennas & Thrusters */
    if (this._antennas.length >= 2) {
      this._antennas[0].rotation.z =  0.44 + Math.sin(this._time * 3.5) * 0.04;
      this._antennas[1].rotation.z = -0.44 + Math.sin(this._time * 3.5 + 1) * 0.04;
    }
    if (this._thrusterRing) this._thrusterRing.scale.setScalar(1 + Math.sin(this._time * 6) * 0.09);
    if (this._headParticles) this._headParticles.rotation.y = this._time * 0.5;

    /* Blinking */
    this._blinkTimer += dt;
    if (this._blinkTimer >= this._nextBlinkTime) {
      this._isBlinking = true;
      if (this._blinkTimer >= this._nextBlinkTime + 0.13) {
        this._isBlinking = false; this._blinkTimer = 0; this._nextBlinkTime = 2.5 + Math.random() * 3.5;
      }
    }

    this._drawFace();
    if (this._renderer && this._scene && this._camera) this._renderer.render(this._scene, this._camera);
    this._animFrame = requestAnimationFrame(function () { self._animate(); });
  };

  /* ── PUBLIC API ───────────────────────────────────────── */
  RobotComponent.prototype.setState = function (s) { if (this.state !== s) this.state = s; };

  RobotComponent.prototype.setMode = function (mode) {
    this.mode = mode;
    if (!this._haloEl) return;
    if (mode === 'chat') {
      Object.assign(this._haloEl.style, { left: '88%', top: '20%', width: '180px', height: '180px', opacity: '0.4' });
    } else {
      Object.assign(this._haloEl.style, { left: '50%', top: '32%', width: '320px', height: '320px', opacity: '1' });
    }
  };

  RobotComponent.prototype.waveHello = function () {
    var self = this;
    this.setState('happy');
    this._jumpImpulse = 0.40;
    this._spinImpulse = (Math.random() > 0.5 ? 0.45 : -0.45);
    if (this.form === 'hands') {
      this._isWaving = true;
      this._waveTimer = 3.5;
    }
    if (window.VoiceService) {
      window.VoiceService.playSuccess();
      window.VoiceService.speak("Hello! How can I help you today?", null, function () { self.setState('idle'); });
    }
  };

  RobotComponent.prototype.poke = function () {
    if (!this._transforming) this.transform();
  };

  RobotComponent.prototype.destroy = function () {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    if (this._renderer) this._renderer.dispose();
  };

  window.RobotComponent = RobotComponent;

})();
