// =============================================================================
//  FH Studio – Wahrzeichen der Reise: KRISTALL-DRACHE (glTF, buildless ES-Modul)
//  Echtes freies Modell via GLTFLoader (+ DRACOLoader, falls komprimiert) statt
//  prozeduraler Geometrie – exakt das igloo-Pattern (GLTFLoader/DRACOLoader).
//  Eingebettet in die premium FH-Welt: HDRI-Umgebung, Bloom, Spiegelboden,
//  Eis-Partikel, Chromatic Aberration + Vignette. Scroll choreografiert die
//  Kamera-Reise (Fortschritt aus #journey -> im Gleichtakt mit den Beats).
//
//  Modelle sind frei tauschbar (CORS-frei via jsDelivr /gh/). Beispiele:
//    Glas-Drache : .../three.js@r160/examples/models/gltf/DragonAttenuation.glb
//    Stadt-Diorama: .../three.js@r160/examples/models/gltf/LittlestTokyo.glb (DRACO)
//    Tech-Helm    : .../glTF-Sample-Assets@main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb
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
    const { Reflector }       = await import('three/addons/objects/Reflector.js');

    // --- frei tauschbare Konstanten ---
    const MODEL_URL  = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/DragonAttenuation.glb';
    const HDRI_URL   = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/equirectangular/royal_esplanade_1k.hdr';
    const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/';
    const TARGET_H   = 20;       // Zielgröße des Modells in Welt-Einheiten
    const FLOOR_R    = 24;       // Radius des Spiegelbodens

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const small  = innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();

    // --- eisiger Verlaufshimmel (Hintergrund) ---
    const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256;
    const sgc = skyC.getContext('2d'); const lg = sgc.createLinearGradient(0,0,0,256);
    lg.addColorStop(0,'#dfe7f5'); lg.addColorStop(0.45,'#d0dbef'); lg.addColorStop(0.72,'#cad6ec'); lg.addColorStop(1,'#b7c2da');
    sgc.fillStyle = lg; sgc.fillRect(0,0,4,256);
    const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xc9d2e2, 70, 220);

    // --- Umgebung: sofort RoomEnvironment, dann echtes HDRI nachladen (mit Fallback) ---
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    new RGBELoader().load(HDRI_URL, (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;   // fotorealistische Brechung im Glas
      hdr.dispose();
    }, undefined, () => { /* HDRI nicht erreichbar -> RoomEnvironment bleibt */ });

    const cam = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 400);

    const stage = new THREE.Group();        // hält das Wahrzeichen; dreht mit der Reise
    scene.add(stage);

    // Helfer: weiche radiale Textur (Halos & Partikel)
    function radialTex(stops){
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'); const rg = g.createRadialGradient(128,128,0,128,128,128);
      stops.forEach(([o,col]) => rg.addColorStop(o, col));
      g.fillStyle = rg; g.fillRect(0,0,256,256);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    }

    // --- DAS WAHRZEICHEN: freies glTF-Modell (Glas-Kristall-Drache) ---
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const gltf  = new GLTFLoader().setDRACOLoader(draco);
    let model = null, mixer = null, modelLoaded = false;
    gltf.load(MODEL_URL, (g) => {
      model = g.scene;
      // normalisieren: auf Zielgröße skalieren, horizontal zentrieren, auf den Boden stellen
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(TARGET_H / maxDim);
      box = new THREE.Box3().setFromObject(model);
      const c = box.getCenter(new THREE.Vector3());
      model.position.x -= c.x;
      model.position.z -= c.z;
      model.position.y -= box.min.y;          // Basis ruht auf dem Spiegelboden
      model.rotation.y = 0.6;                  // schöner Startwinkel
      model.traverse(o => {
        if (o.isMesh && o.material){
          const m = o.material;
          m.envMapIntensity = 1.7;             // kräftige Brechung/Reflexion im Eis-Glas
          if ('transmission' in m && m.transmission > 0) m.thickness = Math.max(m.thickness || 1, 1.2);
        }
      });
      if (g.animations && g.animations.length){  // belebte Modelle (z.B. Littlest Tokyo) animieren
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(g.animations[0]).play();
      }
      stage.add(model);
      modelLoaded = true;
    }, undefined, (err) => console.warn('glTF-Modell konnte nicht geladen werden:', err));

    // --- Licht-Halos hinter dem Wahrzeichen ---
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(220,238,255,0.55)'],[0.3,'rgba(150,200,255,0.22)'],[0.65,'rgba(124,140,255,0.07)'],[1,'rgba(124,140,255,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo.scale.set(120,120,1); halo.position.set(0, 12, -50); scene.add(halo);
    const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(120,255,225,0.26)'],[0.5,'rgba(120,255,225,0.07)'],[1,'rgba(120,255,225,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo2.scale.set(60,60,1); halo2.position.set(-22, 8, -38); scene.add(halo2);

    // --- treibende Eis-Partikel ---
    const PCOUNT = small ? 140 : 240;
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

    // --- spiegelnde Eis-Plattform (echte Reflexion des Wahrzeichens) ---
    const reflector = new Reflector(new THREE.CircleGeometry(FLOOR_R, 64), {
      textureWidth:  Math.floor(innerWidth  * 0.3),
      textureHeight: Math.floor(innerHeight * 0.3),
      color: 0x6b7488
    });
    reflector.rotation.x = -Math.PI/2; reflector.position.y = 0.0; stage.add(reflector);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(FLOOR_R-1.4, FLOOR_R-0.4, 96),
      new THREE.MeshBasicMaterial({ color: 0x2fe6d0, transparent:true, opacity:0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.04; stage.add(ring);

    // --- Licht: kühles Grundlicht + weiches Key + dezente Marken-Rims ---
    scene.add(new THREE.HemisphereLight(0xeef3ff, 0x9aa6c2, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(8, 22, 12); scene.add(key);
    [[0x7c5cff,-1,0.6,0.5],[0x16e0c7,1,0.5,-0.6]].forEach(([col,x,y,z]) => {
      const dl = new THREE.DirectionalLight(col, 1.0); dl.position.set(x,y,z); scene.add(dl);
    });
    const pA = new THREE.PointLight(0x7c5cff, 90, 120); pA.position.set(0, 16, 14); scene.add(pA);
    const pB = new THREE.PointLight(0x16e0c7, 60, 120); pB.position.set(-14, 8, -12); scene.add(pB);

    // --- Postprocessing: Bloom -> Tone-Mapping -> Chromatic Aberration + Vignette ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const caPass = new ShaderPass({
      uniforms: { tDiffuse:{value:null}, uAmount:{value:0.0017}, uVig:{value:1.0} },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float uAmount; uniform float uVig; varying vec2 vUv;',
        'void main(){',
        '  vec2 d = vUv - 0.5; float rad = dot(d,d);',
        '  vec2 off = d * uAmount * (0.5 + rad*2.2);',
        '  float r = texture2D(tDiffuse, vUv+off).r;',
        '  float g = texture2D(tDiffuse, vUv).g;',
        '  float b = texture2D(tDiffuse, vUv-off).b;',
        '  vec3 col = vec3(r,g,b);',
        '  float vig = smoothstep(0.95, 0.25, rad*uVig*2.2);',
        '  col *= mix(0.82, 1.0, vig);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    composer.addPass(caPass);

    // --- Interaktion: Maus-Parallaxe ---
    let tmx = 0, tmy = 0, mx = 0, my = 0;
    addEventListener('pointermove', e => { tmx = (e.clientX/innerWidth)*2-1; tmy = (e.clientY/innerHeight)*2-1; }, { passive:true });

    function resize(){
      renderer.setSize(innerWidth, innerHeight, false);
      composer.setSize(innerWidth, innerHeight);
      bloom.setSize(innerWidth, innerHeight);
      cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);

    // --- Kamera-Wegpunkte: je Beat eine Station der Reise (umkreist das Wahrzeichen) ---
    const journeyEl = document.getElementById('journey');
    const WP = [
      { dist: 48, hgt: 17, ang: -0.35, lookY:  9 },   // Intro      – weit, Establishing
      { dist: 35, hgt: 12, ang:  0.55, lookY:  9 },   // Leistungen – Anflug von vorn
      { dist: 27, hgt:  5, ang:  1.45, lookY: 12 },   // Prozess    – tief, Blick hinauf zum Kristallkopf
      { dist: 31, hgt: 13, ang:  2.65, lookY:  9 },   // Team       – Profil von der anderen Seite
      { dist: 46, hgt: 24, ang:  3.55, lookY: 11 },   // Kontakt    – Aufstieg & Rückzug, Hero-Glow
    ];
    const distK = small ? 1.3 : 1;
    const progress = () => {
      if (journeyEl) {
        const sp = journeyEl.offsetHeight - innerHeight;
        if (sp > 0) return Math.min(1, Math.max(0, -journeyEl.getBoundingClientRect().top / sp));
      }
      const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      return Math.min(1, Math.max(0, scrollY / maxS));
    };
    const camv = { dist:0, hgt:0, ang:0, lookY:0 };
    function camAt(pp){
      const f = pp * (WP.length - 1);
      let i = Math.floor(f); if (i > WP.length - 2) i = WP.length - 2; if (i < 0) i = 0;
      const tt = f - i, e = tt*tt*(3 - 2*tt);            // smoothstep -> ankommen & verweilen
      const a = WP[i], b = WP[i+1];
      camv.dist  = (a.dist + (b.dist - a.dist)*e) * distK;
      camv.hgt   =  a.hgt  + (b.hgt  - a.hgt )*e;
      camv.ang   =  a.ang  + (b.ang  - a.ang )*e;
      camv.lookY =  a.lookY+ (b.lookY- a.lookY)*e;
    }

    // --- Loop: Scroll choreografiert die Kamerareise um das Wahrzeichen ---
    let last = performance.now(), t = 0, reveal = 0, p = 0, sentReady = false;
    function loop(now){
      const dt = Math.min((now - last)/1000, 0.05); last = now; t += dt;
      if (mixer) mixer.update(dt);

      reveal = Math.min(1, reveal + dt/1.4);
      canvas.style.opacity = (reveal*0.92).toFixed(3);   // leicht gedämpft -> Beat-Text bleibt lesbar

      const pRaw = progress();
      p += (pRaw - p) * 0.07;

      stage.rotation.y = p * 0.5;                                  // Wahrzeichen dreht mit der Reise
      const hp = 1 + Math.sin(t*0.6)*0.05; halo.scale.set(120*hp, 120*hp, 1);
      pA.position.x = Math.sin(t*0.3)*14;

      if (!reduce) {
        const arr = pGeo.attributes.position.array;
        for (let i=0; i<PCOUNT; i++) {
          let y = arr[i*3+1] - pSpd[i]*dt*2.4;
          arr[i*3] += Math.sin(t*0.3 + i)*0.012;
          if (y < 0) y = 60;
          arr[i*3+1] = y;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      // KAMERAREISE: fliegt die Wegpunkte ab (Station je Beat), immer AUSSERHALB.
      mx += (tmx - mx)*0.05; my += (tmy - my)*0.05;
      camAt(p);
      const ang  = camv.ang + mx*0.22;
      const dist = camv.dist;
      const hgt  = camv.hgt - my*4 + Math.sin(t*0.4)*0.6;
      cam.position.set(Math.sin(ang)*dist, hgt, Math.cos(ang)*dist);
      cam.lookAt(0, camv.lookY, 0);

      composer.render();
      if (!sentReady && modelLoaded) { sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }  // Modell sichtbar -> Loader darf weichen
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Sicherheitsnetz: falls das Modell hängt, Loader trotzdem nach kurzer Zeit freigeben
    setTimeout(() => { if (!sentReady) { sentReady = true; dispatchEvent(new Event('fh:scene-ready')); } }, 4000);
  } catch (err) { console.warn('Kristall-Drache konnte nicht geladen werden:', err); }
})();
