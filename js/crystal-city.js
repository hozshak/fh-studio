// =============================================================================
//  FH Studio – KRISTALL-WORTWOLKE  (Eigenbau, buildless ES-Modul)
//  Tausende glitzernde Partikel in FH-Farben formen beim Scrollen Wörter und
//  fließen ineinander:  FH → DESIGN → CODE → FYNN/HOZAN → FH.
//  Kohärentes, originäres Wahrzeichen statt geliehener Modelle – igloo-Sprache
//  (Punktwolken, die Formen bilden), eigene GLSL-Shader. Leicht & smooth.
//  Fortschritt kommt aus #journey -> synchron zu den Szenen-Beats (js/journey.js).
// =============================================================================
(async () => {
  const canvas = document.getElementById('city');
  if (!canvas) return;
  try {
    const THREE               = await import('three');
    const { EffectComposer }  = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass }      = await import('three/addons/postprocessing/RenderPass.js');
    const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
    const { OutputPass }      = await import('three/addons/postprocessing/OutputPass.js');
    const { ShaderPass }      = await import('three/addons/postprocessing/ShaderPass.js');

    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const small  = innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, small ? 1.5 : 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();

    // dunkler Grund mit magentafarbenem Glow hinter der Wolke (Bühnen-Spot)
    const skyC = document.createElement('canvas'); skyC.width = skyC.height = 512;
    const sgc = skyC.getContext('2d');
    const rg = sgc.createRadialGradient(256, 232, 0, 256, 256, 380);
    rg.addColorStop(0,'#2a0c22'); rg.addColorStop(0.45,'#16081a'); rg.addColorStop(1,'#070409');
    sgc.fillStyle = rg; sgc.fillRect(0,0,512,512);
    const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.FogExp2(0x0c0610, 0.005);

    const cam = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 200);
    cam.position.set(0, 0, 34);

    // ---- weiche runde Glint-Textur ----
    function glint(){
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const rg = g.createRadialGradient(32,32,0,32,32,32);
      rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(0.25,'rgba(255,255,255,0.85)');
      rg.addColorStop(0.5,'rgba(255,255,255,0.25)'); rg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0,0,64,64);
      return new THREE.CanvasTexture(c);
    }

    // ---- Timeline (IDENTISCH zu js/journey.js): obj,text,obj,text,... ----
    const SEG = [1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2];
    const TOT = SEG.reduce((a,b)=>a+b,0);
    const BD  = [0]; for (let i=0;i<SEG.length;i++) BD.push(BD[i] + SEG[i]/TOT);
    const objC = [0,1,2,3,4].map(k => (BD[2*k] + BD[2*k+1]) / 2);   // Zentrum jedes Objekt-Segments

    // Wörter je Objekt-Segment (Team zeigt BEIDE Namen)
    const FRAMES = [ ['FH'], ['DESIGN'], ['CODE'], ['FYNN','HOZAN'], ['FH'] ];
    const N = small ? 4200 : 7200;

    // ---- Text -> Punktwolke (Float32Array N*3) ----
    function sampleText(lines){
      const W = 1100, H = 560;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      let fs = lines.length > 1 ? 210 : 300;
      const fam = "'Space Grotesk','Arial Black',system-ui,sans-serif";
      g.font = `800 ${fs}px ${fam}`;
      let widest = 0; lines.forEach(l => widest = Math.max(widest, g.measureText(l).width));
      const maxW = W * 0.92;
      if (widest > maxW){ fs *= maxW / widest; g.font = `800 ${fs}px ${fam}`; }
      const lh = fs * 1.04, total = lh * lines.length;
      lines.forEach((l,i) => g.fillText(l, W/2, H/2 - total/2 + lh*(i+0.5)));

      const data = g.getImageData(0,0,W,H).data;
      const pts = []; const step = small ? 4 : 3;
      for (let y=0; y<H; y+=step) for (let x=0; x<W; x+=step)
        if (data[(y*W+x)*4+3] > 128) pts.push([x,y]);

      let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
      for (const [x,y] of pts){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
      const bw = maxX-minX || 1, bh = maxY-minY || 1, cx = (minX+maxX)/2, cy = (minY+maxY)/2;
      const worldH = 18, worldWmax = 46;
      let scale = worldH / bh; if (bw*scale > worldWmax) scale = worldWmax / bw;

      for (let i=pts.length-1; i>0; i--){ const j=(Math.random()*(i+1))|0; const t=pts[i]; pts[i]=pts[j]; pts[j]=t; }
      const out = new Float32Array(N*3);
      for (let i=0; i<N; i++){
        const s = pts[i % pts.length];
        out[i*3]   =  (s[0]-cx)*scale + (Math.random()-0.5)*0.3;
        out[i*3+1] = -(s[1]-cy)*scale + (Math.random()-0.5)*0.3;
        out[i*3+2] =  (Math.random()-0.5)*5;                 // Tiefe -> Kristall-Volumen
      }
      return out;
    }

    const targets = FRAMES.map(sampleText);

    // ---- Geometrie: N Punkte, stabile Farbe (FH-Gradient) + Twinkle-Seed ----
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(targets[0]);          // Start = FH
    const col = new Float32Array(N*3);
    const seed = new Float32Array(N);
    // heiße Palette: Rot -> Magenta -> Pink-Magenta (glüht auf dunklem Grund)
    const cA = new THREE.Color(0xff1f3a), cB = new THREE.Color(0xff2e8a), cC = new THREE.Color(0xff63cf), tmp = new THREE.Color();
    for (let i=0; i<N; i++){
      const f = i / N;
      tmp.copy(f < 0.5 ? cA.clone().lerp(cB, f*2) : cB.clone().lerp(cC, (f-0.5)*2));
      col[i*3]=tmp.r; col[i*3+1]=tmp.g; col[i*3+2]=tmp.b;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{ uTime:{value:0}, uSize:{value: small?4.5:6}, uOpacity:{value:1}, uPR:{value:renderer.getPixelRatio()}, uTex:{value:glint()} },
      vertexShader:`
        attribute vec3 aColor; attribute float aSeed;
        uniform float uTime, uSize, uPR;
        varying vec3 vColor; varying float vTw;
        void main(){
          vColor = aColor;
          float tw = 0.5 + 0.5 * sin(uTime*2.0 + aSeed*6.2831);   // Funkeln
          vTw = tw;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // Referenzkonstante (38) -> sichtbare Größe + sanfte Tiefen-Skalierung
          gl_PointSize = uSize * (0.5 + 0.5*tw) * uPR * (38.0 / max(-mv.z, 1.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:`
        uniform sampler2D uTex; uniform float uOpacity;
        varying vec3 vColor; varying float vTw;
        void main(){
          float a = texture2D(uTex, gl_PointCoord).a;
          if (a < 0.02) discard;
          gl_FragColor = vec4(vColor * (0.75 + 0.55*vTw), a * uOpacity * (0.6 + 0.4*vTw));
        }`
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ---- feiner, immer sichtbarer Atmosphären-Staub (Tiefe, auch bei Text) ----
    const DCOUNT = small ? 160 : 280;
    const dPos = new Float32Array(DCOUNT*3);
    for (let i=0;i<DCOUNT;i++){ dPos[i*3]=(Math.random()-0.5)*120; dPos[i*3+1]=(Math.random()-0.5)*70; dPos[i*3+2]=(Math.random()-0.5)*60-10; }
    const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos,3));
    const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({
      size:0.5, map:glint(), transparent:true, opacity:0.35, depthWrite:false,
      blending:THREE.AdditiveBlending, color:0xc98fb5, sizeAttenuation:true
    }));
    scene.add(dust);

    // ---- Postprocessing: Bloom (Glints) -> Output -> Chromatic Aberration + Vignette ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.0, 0.72, 0.0);  // dunkler Grund -> nur Glints glühen
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass({
      uniforms:{ tDiffuse:{value:null}, uAmount:{value:0.0015} },
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:[
        'uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv;',
        'void main(){',
        '  vec2 d = vUv-0.5; float rad = dot(d,d);',
        '  vec2 off = d*uAmount*(0.5+rad*2.2);',
        '  float r=texture2D(tDiffuse,vUv+off).r, g=texture2D(tDiffuse,vUv).g, b=texture2D(tDiffuse,vUv-off).b;',
        '  float vig = smoothstep(0.95, 0.2, rad*2.2);',
        '  gl_FragColor = vec4(vec3(r,g,b)*mix(0.8,1.0,vig), 1.0);',
        '}'
      ].join('\n')
    }));

    // ---- Morph: Punkte zwischen Wort-Frames interpolieren (nach Scroll) ----
    const clamp = (v,a,b)=>v<a?a:v>b?b:v;
    const smooth = t => t*t*(3-2*t);
    const journeyEl = document.getElementById('journey');
    const progress = () => {
      if (journeyEl){ const sp=journeyEl.offsetHeight-innerHeight; if(sp>0) return clamp(-journeyEl.getBoundingClientRect().top/sp,0,1); }
      const m=Math.max(1,document.documentElement.scrollHeight-innerHeight); return clamp(scrollY/m,0,1);
    };
    const arr = geo.attributes.position.array;
    function morphTo(p){
      // Frame-Paar + t finden (Frames sitzen auf den Objekt-Zentren)
      let a=0, b=0, t=0;
      if (p<=objC[0]) { a=b=0; }
      else if (p>=objC[objC.length-1]) { a=b=objC.length-1; }
      else { for (let k=0;k<objC.length-1;k++){ if(p>=objC[k]&&p<=objC[k+1]){ a=k; b=k+1; t=smooth((p-objC[k])/(objC[k+1]-objC[k])); break; } } }
      const A=targets[a], B=targets[b];
      for (let i=0;i<N*3;i++) arr[i] = A[i] + (B[i]-A[i])*t;
      geo.attributes.position.needsUpdate = true;
    }

    // Wolke nur bei Objekt-Momenten voll sichtbar; bei Text blendet sie aus (Text bleibt clean)
    const TW = 0.03;
    function objVis(p){
      let m=0;
      for (let k=0;k<5;k++){
        const aa=BD[2*k], bb=BD[2*k+1];
        const tin = aa<=0?1:clamp((p-aa)/TW,0,1), tout = bb>=1?1:clamp((bb-p)/TW,0,1);
        m = Math.max(m, smooth(Math.min(tin,tout)));
      }
      return m;
    }

    let tmx=0,tmy=0,mx=0,my=0;
    addEventListener('pointermove', e=>{ tmx=(e.clientX/innerWidth)*2-1; tmy=(e.clientY/innerHeight)*2-1; }, {passive:true});

    function resize(){
      renderer.setSize(innerWidth, innerHeight, false);
      composer.setSize(innerWidth, innerHeight);
      bloom.setSize(innerWidth, innerHeight);
      mat.uniforms.uPR.value = renderer.getPixelRatio();
      cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);

    // ---- Loop ----
    let last = performance.now(), t = 0, p = 0, op = 0, sentReady = false;
    function loop(now){
      const dt = Math.min((now-last)/1000, 0.05); last = now; t += dt;
      p += (progress() - p) * 0.09;
      mx += (tmx-mx)*0.05; my += (tmy-my)*0.05;

      morphTo(p);
      mat.uniforms.uTime.value = t;

      // sanftes Wobble + Maus-Parallaxe (Wörter bleiben lesbar)
      points.rotation.y = Math.sin(t*0.18)*0.10 + mx*0.22;
      points.rotation.x = Math.cos(t*0.15)*0.05 - my*0.10;
      dust.rotation.y = t*0.01;
      cam.position.x = mx*1.6; cam.position.y = -my*1.0; cam.lookAt(0,0,0);

      op += (objVis(p) - op) * 0.12;
      mat.uniforms.uOpacity.value = op;
      dust.material.opacity = 0.12 + 0.23*op;
      canvas.style.opacity = op.toFixed(3);            // ganzes Canvas faden -> bei Text saubere CSS-Bühne

      if (op < 0.02){                                  // reiner Text-Moment -> Render sparen (smooth)
        if (!sentReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }
        return requestAnimationFrame(loop);
      }
      composer.render();
      if (!sentReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    setTimeout(() => { if (!sentReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); } }, 3000);
  } catch (err) { console.warn('Kristall-Wortwolke konnte nicht geladen werden:', err); }
})();
