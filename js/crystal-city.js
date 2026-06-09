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
    renderer.toneMappingExposure = 1.18;   // etwas heller (Coruscant-Dunst lebt vom Licht)

    const scene = new THREE.Scene();

    // Coruscant-Himmel: graue, dunstige Atmosphäre mit warmem Stadt-Glow am Horizont (heller)
    const skyC = document.createElement('canvas'); skyC.width = skyC.height = 512;
    const sgc = skyC.getContext('2d');
    const rg = sgc.createRadialGradient(256, 360, 0, 256, 320, 420);
    rg.addColorStop(0,'#54454a'); rg.addColorStop(0.4,'#332d36'); rg.addColorStop(0.75,'#221e28'); rg.addColorStop(1,'#15131b');
    sgc.fillStyle = rg; sgc.fillRect(0,0,512,512);
    const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
    scene.fog = new THREE.FogExp2(0x2a2630, 0.0066);   // grauer Dunst -> Hochhäuser verschwimmen in die Tiefe (Coruscant)

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

    const N = small ? 4200 : 7200;   // Partikelanzahl

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

    // Stationen im Wechsel – jede fühlt sich anders an (Textseiten bleiben separat)
    const targets = [
      sampleText(['FH','STUDIO']),       // Intro      – interaktive Marken-Wortwolke (Cyberpunk)
      sampleText(['DESIGN']),            // Leistungen  (Cyberpunk)
      sampleText(['BUILD']),             // Prozess     – SPEZIAL: Wild-West-Wüste
      sampleText(['FYNN','HOZAN']),      // Team        (Cyberpunk)
      sampleText(["LET'S","TALK"]),      // Kontakt     (Cyberpunk)
    ];

    // ---- Geometrie: N Punkte, stabile Farbe (FH-Gradient) + Twinkle-Seed ----
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(targets[0]);          // Start = FH
    const col = new Float32Array(N*3);
    const seed = new Float32Array(N);
    // helle Wort-Palette (Weiß-Pink) -> Schrift hebt sich klar von der magenta Stadt ab
    const cA = new THREE.Color(0xffd9e8), cB = new THREE.Color(0xffffff), cC = new THREE.Color(0xff8ad8), tmp = new THREE.Color();
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
      uniforms:{ uTime:{value:0}, uSize:{value: small?5:6.8}, uOpacity:{value:1}, uPR:{value:renderer.getPixelRatio()}, uTex:{value:glint()} },
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

    // ---- Sci-Fi-Sternenfeld (Star-Wars-Tiefe) ----
    const DCOUNT = small ? 380 : 720;
    const dPos = new Float32Array(DCOUNT*3), dCol = new Float32Array(DCOUNT*3);
    const s1=new THREE.Color(0xffffff), s2=new THREE.Color(0x7ad8ff), s3=new THREE.Color(0xff63cf), st=new THREE.Color();
    for (let i=0;i<DCOUNT;i++){
      dPos[i*3]=(Math.random()-0.5)*190; dPos[i*3+1]=(Math.random()-0.5)*110; dPos[i*3+2]=-Math.random()*130-6;   // hinter der Wolke
      const r=Math.random(); st.copy(r<0.7?s1 : r<0.88?s2 : s3);
      dCol[i*3]=st.r; dCol[i*3+1]=st.g; dCol[i*3+2]=st.b;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos,3));
    dGeo.setAttribute('color', new THREE.BufferAttribute(dCol,3));
    const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({
      size:0.6, map:glint(), transparent:true, opacity:0.9, depthWrite:false,
      blending:THREE.AdditiveBlending, vertexColors:true, sizeAttenuation:true
    }));
    scene.add(dust);

    // ======================= ENVIRONMENTS (pro Station umgeschaltet) =======================
    // Umschalten passiert im verdeckten Text-Moment (Canvas gefadet) -> nahtlos, kein harter Cut sichtbar.

    // ----- CYBERPUNK-STADT (Standard hinter der Wolke) -----
    const cityGroup = new THREE.Group(); scene.add(cityGroup);
    (function buildCity(){
      // Coruscant-Fassade: GRAUER Beton + viele kleine, meist warm-weiße Fenster, wenige farbige Akzente
      const wc=document.createElement('canvas'); wc.width=48; wc.height=96; const wx=wc.getContext('2d');
      const base=wx.createLinearGradient(0,0,0,96); base.addColorStop(0,'#3c3a44'); base.addColorStop(1,'#26242c');
      wx.fillStyle=base; wx.fillRect(0,0,48,96);
      // vertikale Beton-Struktur (Stockwerke/Streben) -> mehr Detail
      wx.fillStyle='rgba(0,0,0,0.25)'; for(let x=0;x<48;x+=8) wx.fillRect(x,0,1,96);
      const warm=['#ffe6b0','#fff2d2','#ffd98a','#ffce82','#cdd8ff','#bfe0ff'], accent=['#ff2e7a','#18c4ff','#ffd24a'];
      for(let y=3;y<94;y+=4) for(let x=3;x<46;x+=5){
        if(Math.random()<0.4){
          wx.globalAlpha=0.5+Math.random()*0.5;
          wx.fillStyle = Math.random()<0.1 ? accent[(Math.random()*3)|0] : warm[(Math.random()*warm.length)|0];
          wx.fillRect(x,y,2.6,2.4);
        }
      }
      wx.globalAlpha=1;
      const tex=new THREE.CanvasTexture(wc); tex.colorSpace=THREE.SRGBColorSpace;
      const COUNT=small?170:380, bgeo=new THREE.BoxGeometry(1,1,1); bgeo.translate(0,0.5,0);
      const bmat=new THREE.MeshBasicMaterial({ map:tex, fog:true });
      const inst=new THREE.InstancedMesh(bgeo,bmat,COUNT);
      const m=new THREE.Matrix4(),pv=new THREE.Vector3(),sv=new THREE.Vector3(),qv=new THREE.Quaternion();
      for(let i=0;i<COUNT;i++){
        const side=Math.random()<.5?-1:1, x=side*(20+Math.random()*108), z=-6-Math.random()*168;
        const tall=Math.random()<0.25;
        const h=tall?(28+Math.random()*46):(6+Math.random()*26), w=2.5+Math.random()*5.5, d=2.5+Math.random()*5.5;
        pv.set(x,-17,z); sv.set(w,h,d); inst.setMatrixAt(i,m.compose(pv,qv,sv));
      }
      inst.instanceMatrix.needsUpdate=true; cityGroup.add(inst);
    })();
    const grid = new THREE.GridHelper(260, 50, 0xb89a78, 0x3a3038);   // schwacher, warm-grauer Bodenraster (Coruscant-Tiefe)
    grid.position.y=-17; grid.material.transparent=true; grid.material.opacity=0.16; grid.material.depthWrite=false; cityGroup.add(grid);
    const grid2 = new THREE.GridHelper(260, 50, 0x8fb0d0, 0x283440);
    grid2.position.y=-33; grid2.material.transparent=true; grid2.material.opacity=0.08; grid2.material.depthWrite=false; cityGroup.add(grid2);
    const horizon = new THREE.Sprite(new THREE.SpriteMaterial({ map:glint(), color:0xffae5c, transparent:true, opacity:0.34, blending:THREE.AdditiveBlending, depthWrite:false }));
    horizon.scale.set(300,70,1); horizon.position.set(0,-15,-150); cityGroup.add(horizon);

    // ----- FLIEGENDER VERKEHR (Coruscant-Lichtspuren) -----
    const SHIPS = small?70:160;
    const shipPos = new Float32Array(SHIPS*6), shipCol = new Float32Array(SHIPS*6), lanes = [];
    for (let i=0;i<SHIPS;i++){
      const z=-12-Math.random()*160, y=-15+Math.random()*48, dir=Math.random()<.5?1:-1;
      const speed=(15+Math.random()*32)*dir, len=1.6+Math.random()*4.5, bound=145;
      const x=(Math.random()*2-1)*bound; lanes.push({ x, y, z, speed, len, bound });
      const tx0 = x - (speed>0?len:-len);
      shipPos[i*6]=x; shipPos[i*6+1]=y; shipPos[i*6+2]=z; shipPos[i*6+3]=tx0; shipPos[i*6+4]=y; shipPos[i*6+5]=z;
      const h = Math.random()<.5 ? [1,0.95,0.82] : [0.82,0.9,1];     // Scheinwerfer warm/kaltweiß
      const tl = dir>0 ? [1,0.22,0.12] : [1,0.5,0.12];                // Rücklicht rot/amber
      shipCol[i*6]=h[0]; shipCol[i*6+1]=h[1]; shipCol[i*6+2]=h[2];
      shipCol[i*6+3]=tl[0]; shipCol[i*6+4]=tl[1]; shipCol[i*6+5]=tl[2];
    }
    const shipGeo = new THREE.BufferGeometry();
    shipGeo.setAttribute('position', new THREE.BufferAttribute(shipPos,3));
    shipGeo.setAttribute('color', new THREE.BufferAttribute(shipCol,3));
    const ships = new THREE.LineSegments(shipGeo, new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.95, blending:THREE.AdditiveBlending, depthWrite:false, fog:true }));
    cityGroup.add(ships);

    // ----- WILD-WEST-WÜSTE (Spezialstation: Prozess) -----
    const desertGroup = new THREE.Group(); desertGroup.visible=false; scene.add(desertGroup);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map:glint(), color:0xff6a26, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false }));
    sun.scale.set(120,120,1); sun.position.set(0,-10,-105); desertGroup.add(sun);
    const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map:glint(), color:0xffce72, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending, depthWrite:false }));
    sunCore.scale.set(52,52,1); sunCore.position.set(0,-7,-104); desertGroup.add(sunCore);
    (function buildDesert(){
      const rockMat=new THREE.MeshBasicMaterial({ color:0x130a10, fog:true });   // dunkle Mesa-Silhouetten vor der Sonne
      const mgeo=new THREE.BoxGeometry(1,1,1); mgeo.translate(0,0.5,0);
      const cnt=small?8:14, mesas=new THREE.InstancedMesh(mgeo,rockMat,cnt);
      const m=new THREE.Matrix4(),pv=new THREE.Vector3(),sv=new THREE.Vector3(),qv=new THREE.Quaternion();
      for(let i=0;i<cnt;i++){ const x=(Math.random()-0.5)*190, z=-42-Math.random()*70, h=9+Math.random()*24, w=10+Math.random()*24, d=8+Math.random()*16;
        pv.set(x,-17,z); sv.set(w,h,d); mesas.setMatrixAt(i,m.compose(pv,qv,sv)); }
      mesas.instanceMatrix.needsUpdate=true; desertGroup.add(mesas);
    })();
    const dgrid = new THREE.GridHelper(260, 40, 0xff8a3a, 0x6a3a1c);
    dgrid.position.y=-17; dgrid.material.transparent=true; dgrid.material.opacity=0.4; dgrid.material.depthWrite=false; desertGroup.add(dgrid);

    const FOG_CYBER = new THREE.Color(0x2a2630), FOG_DESERT = new THREE.Color(0x3a1e0c);   // Stadt = grauer Dunst, Wüste = warm

    // ---- Postprocessing: Bloom (Glints) -> Output -> Chromatic Aberration + Vignette ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.42);  // nur die hellsten Glints/Neon glühen -> Schrift & Details bleiben scharf
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

    // Start-Aufbau: Partikel fliegen aus einer Kugel zusammen (kinematischer Entrance)
    const scatter = new Float32Array(N*3);
    for (let i=0;i<N;i++){
      const th=Math.random()*6.2831, ph=Math.acos(2*Math.random()-1), r=18+Math.random()*28;
      scatter[i*3]   = r*Math.sin(ph)*Math.cos(th);
      scatter[i*3+1] = r*Math.sin(ph)*Math.sin(th);
      scatter[i*3+2] = r*Math.cos(ph)*0.5 - 6;
    }

    // ein Pass: Wort-Morph (Scroll) + Start-Aufbau (eI) + Cursor-Abstoßung
    function updatePoints(p, eI, curX, curY, tt){
      let a=0, b=0, t=0;                                  // Frame-Paar (Frames sitzen auf den Objekt-Zentren)
      if (p<=objC[0]) { a=b=0; }
      else if (p>=objC[objC.length-1]) { a=b=objC.length-1; }
      else { for (let k=0;k<objC.length-1;k++){ if(p>=objC[k]&&p<=objC[k+1]){ a=k; b=k+1; t=smooth((p-objC[k])/(objC[k+1]-objC[k])); break; } } }
      const A=targets[a], B=targets[b];
      const R2 = 14, rep = (reduce || !cursorActive) ? 0 : 4.2;    // kleiner, feiner Cursor-Effekt (kein Riesenloch)
      const flow = reduce ? 0 : 1;                                // organisches Eigenleben
      for (let i=0;i<N;i++){
        const i3=i*3, ph=i*0.37;
        let x = A[i3]   + (B[i3]  -A[i3])*t;
        let y = A[i3+1] + (B[i3+1]-A[i3+1])*t;
        let z = A[i3+2] + (B[i3+2]-A[i3+2])*t;
        if (eI < 1){ const s=1-eI; x=scatter[i3]*s+x*eI; y=scatter[i3+1]*s+y*eI; z=scatter[i3+2]*s+z*eI; }
        if (flow){ x += Math.sin(tt*0.8 + ph)*0.18; y += Math.cos(tt*0.7 + ph*1.3)*0.18; z += Math.sin(tt*0.95 + ph*0.7)*0.55; }
        if (rep){ const dx=x-curX, dy=y-curY, d2=dx*dx+dy*dy;
          if (d2<R2 && d2>0.04){ const f=1-d2/R2, kk=rep*f*f/Math.sqrt(d2); x+=dx*kk; y+=dy*kk; } }
        arr[i3]=x; arr[i3+1]=y; arr[i3+2]=z;
      }
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

    let tmx=0,tmy=0,mx=0,my=0,cursorActive=false;
    addEventListener('pointermove', e=>{ tmx=(e.clientX/innerWidth)*2-1; tmy=(e.clientY/innerHeight)*2-1; cursorActive=true; }, {passive:true});
    addEventListener('pointerleave', ()=>{ cursorActive=false; }, {passive:true});

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
      const dt = Math.min((now-last)/1000, 0.05); last = now; t += reduce ? 0 : dt;   // reduced-motion -> Leerlauf-Bewegung einfrieren (Morph bleibt scroll-getrieben)
      p += (progress() - p) * 0.09;
      mx += (tmx-mx)*0.05; my += (tmy-my)*0.05;

      const introF = reduce ? 1 : smooth(clamp(t/1.7, 0, 1));        // Start-Aufbau (~1.7s)
      const tanH = Math.tan(46*Math.PI/360)*34, halfW = tanH*(innerWidth/innerHeight);
      updatePoints(p, introF, tmx*halfW, -tmy*tanH, t);              // Cursor -> Welt-Ebene z=0, + Zeit für Flow
      mat.uniforms.uTime.value = t;

      // sanftes Wobble + Maus-Parallaxe (Wörter bleiben lesbar)
      points.rotation.y = Math.sin(t*0.18)*0.10 + mx*0.22;
      points.rotation.x = Math.cos(t*0.15)*0.05 - my*0.10;
      // Sci-Fi-Bewegung: Neon-Grids fliegen auf einen zu, Sterne treiben (Parallaxe)
      const cell=260/50; grid.position.z=(t*4)%cell; grid2.position.z=(t*2.5)%cell; dgrid.position.z=(t*2.5)%(260/40);
      dust.rotation.y = t*0.006 + mx*0.05;  dust.rotation.x = -my*0.03;
      // fliegender Verkehr bewegt sich (Coruscant-Lanes)
      { const sa=ships.geometry.attributes.position.array;
        for (let i=0;i<SHIPS;i++){ const L=lanes[i]; L.x += L.speed*dt;
          if (L.x>L.bound) L.x=-L.bound; else if (L.x<-L.bound) L.x=L.bound;
          const tx = L.x - (L.speed>0?L.len:-L.len);
          sa[i*6]=L.x; sa[i*6+1]=L.y; sa[i*6+2]=L.z; sa[i*6+3]=tx; sa[i*6+4]=L.y; sa[i*6+5]=L.z; }
        ships.geometry.attributes.position.needsUpdate=true; }
      cam.position.x = mx*1.6; cam.position.y = -my*1.0; cam.lookAt(0,0,0);

      op += (objVis(p) - op) * 0.12;
      mat.uniforms.uOpacity.value = op;
      dust.material.opacity = 0.85 * op;               // helles Sternenfeld, fadet mit
      canvas.style.opacity = op.toFixed(3);            // ganzes Canvas faden -> bei Text saubere CSS-Bühne

      // Environment je Station: Cyberpunk-Stadt – AUSSER Prozess (Station 2) = Wild-West-Wüste.
      // Umschalten im verdeckten Text-Moment (op~0) -> kein Cut sichtbar.
      const s2 = smooth(Math.min(clamp((p-BD[4])/TW,0,1), clamp((BD[5]-p)/TW,0,1)));
      const desertOn = p > (BD[3]+BD[4])/2 && p < (BD[5]+BD[6])/2;
      cityGroup.visible   = op > 0.01 && !desertOn;
      desertGroup.visible = op > 0.01 &&  desertOn;
      scene.fog.color.copy(FOG_CYBER).lerp(FOG_DESERT, s2);

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
