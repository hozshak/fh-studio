// =============================================================================
//  FH Studio – Interaktive Kristallstadt (Three.js, buildless ES-Modul)
//  Eigenständige 3D-Welt über die ganze Seite. Scroll choreografiert die Kamera.
//  Qualitäts-Hebel: echte HDRI-Umgebung, Brechungs-Glas (Transmission),
//  Bloom + Chromatic Aberration + Vignette, Spiegelboden, Eis-Partikel.
//  Importmap (in index.html) liefert 'three' + 'three/addons/'.
// =============================================================================
(async () => {
  const canvas = document.getElementById('city');
  if (!canvas) return;
  try {
    const THREE              = await import('three');
    const { RoomEnvironment }= await import('three/addons/environments/RoomEnvironment.js');
    const { RGBELoader }     = await import('three/addons/loaders/RGBELoader.js');
    const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass }     = await import('three/addons/postprocessing/RenderPass.js');
    const { UnrealBloomPass }= await import('three/addons/postprocessing/UnrealBloomPass.js');
    const { OutputPass }     = await import('three/addons/postprocessing/OutputPass.js');
    const { ShaderPass }     = await import('three/addons/postprocessing/ShaderPass.js');
    const { Reflector }      = await import('three/addons/objects/Reflector.js');

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const small  = innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();

    // --- eisiger Verlaufshimmel (Hintergrund) ---
    const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 256;
    const sgc = skyC.getContext('2d'); const lg = sgc.createLinearGradient(0,0,0,256);
    lg.addColorStop(0,'#dfe7f5'); lg.addColorStop(0.45,'#d0dbef'); lg.addColorStop(0.72,'#cad6ec'); lg.addColorStop(1,'#b7c2da');
    sgc.fillStyle = lg; sgc.fillRect(0,0,4,256);
    const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xc9d2e2, 64, 190);

    // --- Umgebung: sofort RoomEnvironment, dann echtes HDRI nachladen (mit Fallback) ---
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    new RGBELoader()
      .setPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/textures/equirectangular/')
      .load('royal_esplanade_1k.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmrem.fromEquirectangular(hdr).texture;   // fotorealistische Reflexionen aufs Eis
        hdr.dispose();
      }, undefined, () => { /* HDRI nicht erreichbar -> RoomEnvironment bleibt */ });

    const cam = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 360);

    const city = new THREE.Group();         // die ganze Stadt = eine Gruppe (dreht nur mit Scroll)
    scene.add(city);

    // --- prozedurale Fenster-Textur (kühle, stimmige Beleuchtung) ---
    const wc = document.createElement('canvas'); wc.width = 96; wc.height = 192;
    const wx = wc.getContext('2d');
    wx.fillStyle = '#0a0f1a'; wx.fillRect(0,0,96,192);
    for (let y=5; y<192; y+=8) for (let x=5; x<92; x+=9) {
      const r = Math.random();
      wx.fillStyle = r > 0.52
        ? (r > 0.93 ? '#bfeaff' : r > 0.86 ? '#dff1ff' : '#eef6ff')
        : (r > 0.40 ? '#141d33' : '#0d1426');
      wx.fillRect(x, y, 5, 4);
    }
    const winTex = new THREE.CanvasTexture(wc);
    winTex.colorSpace = THREE.SRGBColorSpace;
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping; winTex.repeat.set(2, 5);

    // --- Eisglas-Material der Türme (glänzend, reflektiert HDRI) ---
    const towerMat = new THREE.MeshPhysicalMaterial({
      color: 0xb3c4de, metalness: 0.0, roughness: 0.2,
      clearcoat: 1.0, clearcoatRoughness: 0.26,
      iridescence: 0.55, iridescenceIOR: 1.32,
      emissive: 0x14223c, emissiveMap: winTex, emissiveIntensity: 0.95,
      envMapIntensity: 1.25
    });

    const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);

    // --- Türme: runde Insel, Skyline hoch in der Mitte, flach am Rand ---
    const R = 26;
    const COUNT = small ? 95 : 150;
    const towers  = new THREE.InstancedMesh(box, towerMat, COUNT);
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 1, 6); poleGeo.translate(0, 0.5, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xb6bfd0, metalness: 0.85, roughness: 0.3 });
    const poles   = new THREE.InstancedMesh(poleGeo, poleMat, COUNT);
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff5e9c, emissiveIntensity: 3.2 });
    const beacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 10), beaconMat, COUNT);

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), tint = new THREE.Color();
    let pi = 0;
    for (let i=0; i<COUNT; i++) {
      const a = Math.random()*Math.PI*2, rr = Math.sqrt(Math.random())*R;
      const x = Math.cos(a)*rr, z = Math.sin(a)*rr;
      const edge = rr / R;
      const thin = Math.random() < 0.28;
      const h = thin ? (12 + Math.random()*20)
                     : (2.5 + Math.pow(1-edge, 1.6)*22) * (0.62 + Math.random()*0.7);
      const w = thin ? (0.6 + Math.random()*0.5) : (1.5 + Math.random()*1.6);
      const d = thin ? w*(0.85 + Math.random()*0.4) : (1.5 + Math.random()*1.6);
      pos.set(x, 0, z); scl.set(w, h, d); towers.setMatrixAt(i, m.compose(pos, q, scl));
      towers.setColorAt(i, tint.setHSL(0.58 + Math.random()*0.05, 0.14 + Math.random()*0.12, 0.80));
      if (h > 15) {
        const sp = 1.6 + Math.random()*3;
        pos.set(x, h, z);    scl.set(1, sp, 1); poles.setMatrixAt(pi,   m.compose(pos, q, scl));
        pos.set(x, h+sp, z); scl.set(1, 1, 1);  beacons.setMatrixAt(pi, m.compose(pos, q, scl));
        pi++;
      }
    }
    poles.count = pi; beacons.count = pi;
    towers.instanceMatrix.needsUpdate = true;
    if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
    city.add(towers, poles, beacons);

    // Helfer: weiche radiale Textur (Halos & Partikel)
    function radialTex(stops){
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'); const rg = g.createRadialGradient(128,128,0,128,128,128);
      stops.forEach(([o,col]) => rg.addColorStop(o, col));
      g.fillStyle = rg; g.fillRect(0,0,256,256);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    }

    // --- ZENTRALES WAHRZEICHEN: Eis-Spire + facettierte BRECHUNGS-Krone (Transmission) ---
    const spireH = small ? 26 : 33;
    const spireBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, spireH, 6), towerMat);
    spireBody.position.y = spireH/2;
    const crownMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf4ff, metalness: 0.0, roughness: 0.05,
      transmission: 1.0, thickness: 3.6, ior: 1.45,
      clearcoat: 1.0, clearcoatRoughness: 0.10,
      iridescence: 1.0, iridescenceIOR: 1.4,
      attenuationColor: 0xbfe6ff, attenuationDistance: 7,
      envMapIntensity: 1.8, flatShading: true
    });
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 0), crownMat);
    crown.position.y = spireH + 2.6;
    city.add(spireBody, crown);

    // --- Licht-Halos hinter der Stadt ---
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(220,238,255,0.55)'],[0.3,'rgba(150,200,255,0.22)'],[0.65,'rgba(124,140,255,0.07)'],[1,'rgba(124,140,255,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo.scale.set(110,110,1); halo.position.set(0, 9, -54); scene.add(halo);
    const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex([[0,'rgba(120,255,225,0.26)'],[0.5,'rgba(120,255,225,0.07)'],[1,'rgba(120,255,225,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false
    }));
    halo2.scale.set(54,54,1); halo2.position.set(-24, 6, -40); scene.add(halo2);

    // --- treibende Eis-Partikel ---
    const PCOUNT = small ? 140 : 240;
    const pPos = new Float32Array(PCOUNT*3), pSpd = new Float32Array(PCOUNT);
    for (let i=0; i<PCOUNT; i++) {
      pPos[i*3] = (Math.random()-0.5)*130; pPos[i*3+1] = Math.random()*64; pPos[i*3+2] = (Math.random()-0.5)*130;
      pSpd[i] = 0.6 + Math.random()*1.7;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.7, map: radialTex([[0,'rgba(255,255,255,1)'],[0.4,'rgba(214,236,255,0.7)'],[1,'rgba(214,236,255,0)']]),
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true, opacity:0.9
    }));
    scene.add(particles);

    // --- spiegelnde Eis-Plattform (echte Reflexion der Stadt) ---
    const reflector = new Reflector(new THREE.CircleGeometry(R+9, 64), {
      textureWidth:  Math.floor(innerWidth  * 0.3),
      textureHeight: Math.floor(innerHeight * 0.3),
      color: 0x6b7488
    });
    reflector.rotation.x = -Math.PI/2; reflector.position.y = 0.0; city.add(reflector);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R+5, R+6.2, 96),
      new THREE.MeshBasicMaterial({ color: 0x2fe6d0, transparent:true, opacity:0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.04; city.add(ring);

    // --- Licht: kühles Grundlicht + weiches Key + dezente Marken-Rims ---
    scene.add(new THREE.HemisphereLight(0xeef3ff, 0x9aa6c2, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(8, 20, 12); scene.add(key);
    [[0x7c5cff,-1,0.6,0.5],[0x16e0c7,1,0.5,-0.6]].forEach(([c,x,y,z]) => {
      const dl = new THREE.DirectionalLight(c, 0.9); dl.position.set(x,y,z); scene.add(dl);
    });
    const pA = new THREE.PointLight(0x7c5cff, 90, 120); pA.position.set(0, 16, 14); scene.add(pA);
    const pB = new THREE.PointLight(0x16e0c7, 60, 120); pB.position.set(-14, 8, -12); scene.add(pB);

    // --- Postprocessing: Bloom -> Tone-Mapping -> Chromatic Aberration + Vignette ---
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.5, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const caPass = new ShaderPass({
      uniforms: { tDiffuse:{value:null}, uAmount:{value:0.0017}, uVig:{value:1.0} },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float uAmount; uniform float uVig; varying vec2 vUv;',
        'void main(){',
        '  vec2 d = vUv - 0.5; float rad = dot(d,d);',
        '  vec2 off = d * uAmount * (0.5 + rad*2.2);',           // Farbsaum stärker zum Rand
        '  float r = texture2D(tDiffuse, vUv+off).r;',
        '  float g = texture2D(tDiffuse, vUv).g;',
        '  float b = texture2D(tDiffuse, vUv-off).b;',
        '  vec3 col = vec3(r,g,b);',
        '  float vig = smoothstep(0.95, 0.25, rad*uVig*2.2);',   // sanfte Vignette
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

    // --- Loop: Scroll choreografiert die Kamerareise über die ganze Seite ---
    let last = performance.now(), t = 0, reveal = 0, p = 0;
    function loop(now){
      const dt = Math.min((now - last)/1000, 0.05); last = now; t += dt;

      reveal = Math.min(1, reveal + dt/1.4);
      canvas.style.opacity = (reveal*0.9).toFixed(3);   // leicht gedämpft -> Text bleibt lesbar

      // Scroll-Fortschritt 0..1 (geglättet)
      const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const pRaw = Math.min(1, Math.max(0, scrollY / maxS));
      p += (pRaw - p) * 0.07;

      city.rotation.y = p * 0.45;                                            // Insel dreht NUR mit Scroll
      crown.rotation.y = t * 0.22; crown.rotation.x = Math.sin(t*0.2)*0.12;  // funkelnde Kristallkrone
      beaconMat.emissiveIntensity = reduce ? 3 : 2.4 + Math.sin(t*2.2)*1.0;  // pulsierende Signallichter
      pA.position.x = Math.sin(t*0.3)*14;
      const hp = 1 + Math.sin(t*0.6)*0.05; halo.scale.set(110*hp, 110*hp, 1);

      if (!reduce) {
        const arr = pGeo.attributes.position.array;
        for (let i=0; i<PCOUNT; i++) {
          let y = arr[i*3+1] - pSpd[i]*dt*2.4;
          arr[i*3] += Math.sin(t*0.3 + i)*0.012;
          if (y < 0) y = 64;
          arr[i*3+1] = y;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      // KAMERAREISE: hoher Überblick (oben) -> sanft hinab & umkreisend (unten). Immer AUSSERHALB.
      mx += (tmx - mx)*0.05; my += (tmy - my)*0.05;
      const ease = p*p*(3 - 2*p);
      const ang  = ease*1.25 + mx*0.22;
      const dist = (small ? 92 : 68) - (small ? 16 : 20)*ease;
      const hgt  = (small ? 30 : 27) - 20*ease - my*4 + Math.sin(t*0.4)*0.6;
      cam.position.set(Math.sin(ang)*dist, hgt, Math.cos(ang)*dist);
      cam.lookAt(0, 8 - 3*ease, 0);

      composer.render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  } catch (err) { console.warn('Kristallstadt konnte nicht geladen werden:', err); }
})();
