// =============================================================================
//  FH Studio – DIE REISE: mehrere freie glTF-Wahrzeichen nacheinander
//  Pro Station taucht ein eigenes Modell auf (Drache → Helm → Stadt → Lampe →
//  Drache), passend zur Kamerafahrt durch die eisige Welt. Nur das jeweils
//  sichtbare Modell wird gerendert (visible-Culling) -> flüssig & günstig.
//  Igloo-Pattern: GLTFLoader/DRACOLoader, buildless ES-Modul.
//
//  WICHTIG: npm-three enthält KEINE Modelle/HDRIs -> via jsDelivr /gh/ geladen.
//  Modelle frei tauschbar in SCENES[]. Fortschritt kommt aus #journey -> die
//  Modell-Wechsel sitzen exakt auf den Szenen-Beats (js/journey.js).
// =============================================================================
(async () => {
  const canvas = document.getElementById('city');
  if (!canvas) return;
  try {
    const THREE               = await import('three');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const { RGBELoader }      = await import('three/addons/loaders/RGBELoader.js');
    const { GLTFLoader }      = await import('three/addons/loaders/GLTFLoader.js');
    const { DRACOLoader }     = await import('three/addons/loaders/DRACOLoader.js');
    const { EffectComposer }  = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass }      = await import('three/addons/postprocessing/RenderPass.js');
    const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
    const { OutputPass }      = await import('three/addons/postprocessing/OutputPass.js');
    const { ShaderPass }      = await import('three/addons/postprocessing/ShaderPass.js');

    const GH    = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples';
    const KH    = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models';
    const HDRI  = GH + '/textures/equirectangular/royal_esplanade_1k.hdr';
    const DRACO = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/';
    const TARGET = 20;   // alle Modelle auf dieselbe Größe normalisiert -> eine Kamerabahn passt überall

    // Reise-Timeline: abwechselnd OBJEKT- und TEXT-Segment. MUSS zu js/journey.js (SEG) passen!
    //  obj Drache | txt Intro | obj Helm | txt Leistungen | obj Stadt | txt Prozess |
    //  obj Lampe  | txt Team  | obj Drache | txt Kontakt
    const SEG = [1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2];   // längere Objekt-Momente (dwell)
    const TOT = SEG.reduce((a,b)=>a+b,0);
    const BD  = [0]; for (let i=0;i<SEG.length;i++) BD.push(BD[i] + SEG[i]/TOT);
    const objRange = k => [BD[2*k], BD[2*k+1]];        // Modell k erscheint im Objekt-Segment 2k
    const SCENES = [
      { url: GH + '/models/gltf/DragonAttenuation.glb',           range: objRange(0), yaw: 0.5,  spin: 0.045 },                 // Intro
      { url: KH + '/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', range: objRange(1), yaw: 0.35, spin: 0.05  },                 // Leistungen
      { url: GH + '/models/gltf/ferrari.glb',                     range: objRange(2), yaw: 0.7,  spin: 0.05, fit: 0.9 },        // Prozess  (sleek/Performance)
      { url: KH + '/SheenChair/glTF-Binary/SheenChair.glb',       range: objRange(3), yaw: 0.3,  spin: 0.05  },                 // Team     (edles Design)
      { url: GH + '/models/gltf/DragonAttenuation.glb',           range: objRange(4), yaw: 0.5,  spin: 0.045 },                 // Kontakt  (Bookend)
    ];

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const small  = innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, small ? 1.5 : 1.65));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;          // weniger Überstrahlung -> Modelle bleiben lesbar

    const scene = new THREE.Scene();

    // eisiger Verlaufshimmel
    const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256;
    const sgc = skyC.getContext('2d'); const lg = sgc.createLinearGradient(0,0,0,256);
    lg.addColorStop(0,'#dfe7f5'); lg.addColorStop(0.45,'#d0dbef'); lg.addColorStop(0.72,'#cad6ec'); lg.addColorStop(1,'#b7c2da');
    sgc.fillStyle = lg; sgc.fillRect(0,0,4,256);
    const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xc9d2e2, 120, 380);

    // Umgebung: sofort RoomEnvironment, dann echtes HDRI (mit Fallback)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    new RGBELoader().load(HDRI, (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
    }, undefined, () => {});

    const cam = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 400);

    function radialTex(stops){
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'); const rg = g.createRadialGradient(128,128,0,128,128,128);
      stops.forEach(([o,col]) => rg.addColorStop(o, col));
      g.fillStyle = rg; g.fillRect(0,0,256,256);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    }

    // Halos hinter den Wahrzeichen (dezent – sonst überstrahlen sie die helle Eis-Szene)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(150,190,255,0.28)'],[0.35,'rgba(124,140,255,0.12)'],[0.7,'rgba(124,140,255,0.04)'],[1,'rgba(124,140,255,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo.scale.set(90,90,1); halo.position.set(0, 12, -56); scene.add(halo);
    const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(120,255,225,0.16)'],[0.5,'rgba(120,255,225,0.04)'],[1,'rgba(120,255,225,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo2.scale.set(52,52,1); halo2.position.set(-24, 8, -40); scene.add(halo2);

    // weicher Eis-Boden (günstig – kein echter Spiegel, das hielt die Framerate)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(34, 64),
      new THREE.MeshBasicMaterial({ map: radialTex([[0,'rgba(150,170,205,0.28)'],[0.5,'rgba(150,170,205,0.1)'],[1,'rgba(150,170,205,0)']]), transparent:true, depthWrite:false })
    );
    floor.rotation.x = -Math.PI/2; floor.position.y = 0.01; scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(23.4, 24.4, 96),
      new THREE.MeshBasicMaterial({ color: 0x2fe6d0, transparent:true, opacity:0.5, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.04; scene.add(ring);

    // treibende Eis-Partikel
    const PCOUNT = small ? 130 : 220;
    const pPos = new Float32Array(PCOUNT*3), pSpd = new Float32Array(PCOUNT);
    for (let i=0; i<PCOUNT; i++) {
      pPos[i*3] = (Math.random()-0.5)*110; pPos[i*3+1] = Math.random()*60; pPos[i*3+2] = (Math.random()-0.5)*110;
      pSpd[i] = 0.6 + Math.random()*1.7;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.7, map: radialTex([[0,'rgba(255,255,255,1)'],[0.4,'rgba(214,236,255,0.7)'],[1,'rgba(214,236,255,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true, opacity:0.9
    }));
    scene.add(particles);

    // Licht: kühles Grundlicht + Key + Marken-Rims
    scene.add(new THREE.HemisphereLight(0xeef3ff, 0x9aa6c2, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(8, 22, 12); scene.add(key);
    [[0x7c5cff,-1,0.6,0.5],[0x16e0c7,1,0.5,-0.6]].forEach(([col,x,y,z]) => {
      const dl = new THREE.DirectionalLight(col, 1.0); dl.position.set(x,y,z); scene.add(dl);
    });
    const pA = new THREE.PointLight(0x7c5cff, 90, 130); pA.position.set(0, 16, 14); scene.add(pA);
    const pB = new THREE.PointLight(0x16e0c7, 60, 130); pB.position.set(-14, 8, -12); scene.add(pB);

    // ---- Modelle laden (Drache zuerst -> Loader; Rest lazy im Hintergrund) ----
    const draco  = new DRACOLoader().setDecoderPath(DRACO);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const cache  = new Map();   // url -> Promise<gltf> (dedupe)
    const loadGLTF = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url)); return cache.get(url); };

    function normalize(obj, s){
      let box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      obj.scale.setScalar(TARGET / maxDim * (s.fit || 1));
      box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= box.min.y;   // horizontal zentriert, auf dem Boden
      obj.rotation.y = s.yaw || 0;
      s.centerY = (box.max.y - box.min.y) / 2;                                     // vertikale Mitte -> Kamera schaut genau darauf
      obj.traverse(o => { if (o.isMesh && o.material){ o.material.envMapIntensity = 1.6; o.frustumCulled = false; } });
    }

    let firstReady = false;
    async function buildScene(s, isFirst){
      try {
        const g = await loadGLTF(s.url);
        const obj = (cache.size && g.scene.parent) ? g.scene.clone(true) : g.scene;  // 2. Nutzung -> Klon
        const holder = new THREE.Group();
        normalize(obj, s);
        holder.add(obj);
        holder.visible = false;
        scene.add(holder);
        s.holder = obj;            // wir drehen das Modell selbst
        s.group  = holder;
        if (g.animations && g.animations.length){
          s.mixer = new THREE.AnimationMixer(obj);
          s.mixer.clipAction(g.animations[0]).play();
        }
        if (isFirst) firstReady = true;
      } catch (err) { console.warn('Modell übersprungen:', s.url, err); if (isFirst) firstReady = true; }
    }

    await buildScene(SCENES[0], true);                       // Drache zuerst -> blockiert nur ihn
    SCENES.slice(1).forEach(s => buildScene(s, false));      // Rest lazy, parallel

    // ---- Postprocessing: Bloom -> Output -> Chromatic Aberration + Vignette ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.55, 0.92);  // sanfter, höhere Schwelle -> kein Ausbleichen
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass({
      uniforms: { tDiffuse:{value:null}, uAmount:{value:0.0016}, uVig:{value:1.0} },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float uAmount; uniform float uVig; varying vec2 vUv;',
        'void main(){',
        '  vec2 d = vUv - 0.5; float rad = dot(d,d);',
        '  vec2 off = d * uAmount * (0.5 + rad*2.2);',
        '  float r = texture2D(tDiffuse, vUv+off).r;',
        '  float g = texture2D(tDiffuse, vUv).g;',
        '  float b = texture2D(tDiffuse, vUv-off).b;',
        '  float vig = smoothstep(0.95, 0.25, rad*uVig*2.2);',
        '  gl_FragColor = vec4(vec3(r,g,b) * mix(0.82, 1.0, vig), 1.0);',
        '}'
      ].join('\n')
    }));

    // Maus-Parallaxe
    let tmx = 0, tmy = 0, mx = 0, my = 0;
    addEventListener('pointermove', e => { tmx = (e.clientX/innerWidth)*2-1; tmy = (e.clientY/innerHeight)*2-1; }, { passive:true });

    function resize(){
      renderer.setSize(innerWidth, innerHeight, false);
      composer.setSize(innerWidth, innerHeight);
      bloom.setSize(innerWidth, innerHeight);
      cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);

    // ---- Kamera-Wegpunkte (je Beat eine Station, umkreist das Wahrzeichen) ----
    const journeyEl = document.getElementById('journey');
    const WP = [
      { dist: 33, hgt: 12, ang: -0.30 },   // Intro      – Drache
      { dist: 35, hgt: 11, ang:  0.50 },   // Leistungen – Helm (genug Abstand -> nicht beschnitten)
      { dist: 40, hgt: 13, ang:  1.30 },   // Prozess    – ferrari (lang/breit -> weiter weg)
      { dist: 32, hgt: 12, ang:  2.60 },   // Team       – Stuhl
      { dist: 34, hgt: 14, ang:  3.45 },   // Kontakt    – Drache
    ];
    const distK = small ? 1.3 : 1;
    const clamp = (v,a,b)=>v<a?a:v>b?b:v;
    const smooth = t => t*t*(3-2*t);
    const progress = () => {
      if (journeyEl){ const sp = journeyEl.offsetHeight - innerHeight; if (sp > 0) return clamp(-journeyEl.getBoundingClientRect().top / sp, 0, 1); }
      const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      return clamp(scrollY / maxS, 0, 1);
    };
    const objC = SCENES.map(s => (s.range[0] + s.range[1]) / 2);   // Zentrum jedes Objekt-Segments
    const camv = { dist:0, hgt:0, ang:0 };
    function setCam(a, b, e){
      camv.dist = (a.dist + (b.dist-a.dist)*e) * distK;
      camv.hgt  =  a.hgt  + (b.hgt -a.hgt )*e;
      camv.ang  =  a.ang  + (b.ang -a.ang )*e;
    }
    function camAt(pp){
      // Kamera ruht auf WP[k], wenn pp ~ Objekt-Zentrum k; dazwischen sanft interpoliert.
      if (pp <= objC[0]) return setCam(WP[0], WP[0], 0);
      if (pp >= objC[objC.length-1]) return setCam(WP[WP.length-1], WP[WP.length-1], 0);
      for (let k=0; k<objC.length-1; k++){
        if (pp >= objC[k] && pp <= objC[k+1]){
          setCam(WP[k], WP[k+1], smooth((pp-objC[k])/(objC[k+1]-objC[k]))); return;
        }
      }
    }

    // Sichtbarkeit eines Wahrzeichens: in [a,b] sichtbar, weiches Ein-/Ausblenden,
    // an den Grenzen ein kurzer "leerer" Moment -> sauberer Wechsel ohne Überlappung.
    // TW deutlich kleiner als ein Segment (~0.1) -> Modell erreicht volle Sichtbarkeit & hält.
    const TW = 0.03;
    function vis(p, a, b){
      const tin  = a <= 0    ? 1 : clamp((p - a)/TW, 0, 1);
      const tout = b >= 1    ? 1 : clamp((b - p)/TW, 0, 1);
      return smooth(Math.min(tin, tout));
    }

    // ---- Loop ----
    let last = performance.now(), t = 0, cityOpac = 0, p = 0, camLookY = 10, sentReady = false;
    function loop(now){
      const dt = Math.min((now - last)/1000, 0.05); last = now; t += dt;

      const pRaw = progress();
      p += (pRaw - p) * 0.08;

      // Wahrzeichen ein-/ausblenden, "durch das Bild" schieben, LANGSAM drehen.
      let maxV = 0, actCenterY = 10;
      for (const s of SCENES){
        if (!s.group) continue;
        const a = s.range[0], b = s.range[1];
        const v = vis(p, a, b);
        if (v > maxV){ maxV = v; actCenterY = s.centerY || 10; }
        const on = v > 0.012;
        s.group.visible = on;
        if (on){
          const ph = clamp((p - a) / (b - a), 0, 1);            // 0..1 innerhalb des Segments
          // Skala: kommt klein rein -> hält -> schiebt beim Verlassen GROSS nach vorn (durch den Frame)
          let scl = 1;
          if (ph < 0.22)      scl = 0.82 + (ph / 0.22) * 0.18;        // 0.82 -> 1.0  (rein)
          else if (ph > 0.72) scl = 1 + ((ph - 0.72) / 0.28) * 1.15;  // 1.0  -> 2.15 (durch)
          s.group.scale.setScalar(scl);
          if (s.holder) s.holder.rotation.y = (s.yaw || 0) + t * (s.spin || 0);   // nur langsame Eigendrehung (keine Scroll-Kopplung)
          if (s.mixer && !reduce) s.mixer.update(dt);
        }
      }

      // 3D-Bühne nur sichtbar, wenn ein Objekt dran ist; bei Text blendet alles aus.
      cityOpac += (maxV - cityOpac) * 0.16;
      canvas.style.opacity = cityOpac.toFixed(3);
      if (cityOpac < 0.02){                              // nichts sichtbar -> RENDER ÜBERSPRINGEN (flüssig bei Text)
        if (!sentReady && firstReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }
        return requestAnimationFrame(loop);
      }

      const hp = 1 + Math.sin(t*0.6)*0.05; halo.scale.set(120*hp, 120*hp, 1);
      pA.position.x = Math.sin(t*0.3)*14;

      if (!reduce){
        const arr = pGeo.attributes.position.array;
        for (let i=0; i<PCOUNT; i++){
          let y = arr[i*3+1] - pSpd[i]*dt*2.4;
          arr[i*3] += Math.sin(t*0.3 + i)*0.012;
          if (y < 0) y = 60;
          arr[i*3+1] = y;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      // Kamerareise – schaut genau auf die Mitte des aktiven Modells (zentriert im Bild),
      // dezente Maus-Parallaxe (damit nichts aus dem Bild rutscht).
      mx += (tmx - mx)*0.05; my += (tmy - my)*0.05;
      camAt(p);
      camLookY += (actCenterY - camLookY) * 0.1;
      const ang = camv.ang + mx*0.10, dist = camv.dist, hgt = camv.hgt - my*2 + Math.sin(t*0.4)*0.5;
      cam.position.set(Math.sin(ang)*dist, hgt, Math.cos(ang)*dist);
      cam.lookAt(0, camLookY, 0);

      composer.render();
      if (!sentReady && firstReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    setTimeout(() => { if (!sentReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); } }, 5000);  // Sicherheitsnetz
  } catch (err) { console.warn('3D-Reise konnte nicht geladen werden:', err); }
})();
