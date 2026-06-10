// =============================================================================
//  FH Studio – FOTO-BÜHNE + KRISTALL-WORTWOLKE  (buildless ES-Modul)
//  Echte, frei lizenzierte Fotos (Wikimedia, CORS *) als filmischer Hintergrund;
//  davor die interaktive, glühende Partikel-Schrift, die beim Scrollen morpht:
//    FH STUDIO → DESIGN → BUILD(Wüste) → FYNN/HOZAN → LET'S TALK.
//  Pro Station eine andere Bühne: Nacht-Megacity (Coruscant-haft) / Monument
//  Valley (Wild-West). Fortschritt aus #journey -> synchron zu den Beats.
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
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, small ? 1.5 : 1.65));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    // moderner, ruhiger Grau-Verlauf (dezent heller Kern -> Tiefe)
    (function(){ const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
      const rg=g.createRadialGradient(256,232,0,256,256,380); rg.addColorStop(0,'#262932'); rg.addColorStop(0.55,'#171920'); rg.addColorStop(1,'#0c0d11');
      g.fillStyle=rg; g.fillRect(0,0,512,512); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; scene.background=t; })();
    const cam = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 400);
    cam.position.set(0, 0, 34);
    canvas.style.opacity = '1';                         // Canvas dauerhaft sichtbar (Grau-BG bleibt; nur das Wort fadet via uOpacity)

    // ---- Timeline (IDENTISCH zu js/journey.js) ----
    const SEG = [1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2];
    const TOT = SEG.reduce((a,b)=>a+b,0);
    const BD  = [0]; for (let i=0;i<SEG.length;i++) BD.push(BD[i] + SEG[i]/TOT);
    const objC = [0,1,2,3,4].map(k => (BD[2*k] + BD[2*k+1]) / 2);
    const N = small ? 4200 : 7200;
    const clamp = (v,a,b)=>v<a?a:v>b?b:v;
    const smooth = t => t*t*(3-2*t);

    // ---- weiche runde Glint-Textur ----
    function glint(){
      const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
      const rg=g.createRadialGradient(32,32,0,32,32,32);
      rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(0.25,'rgba(255,255,255,0.85)');
      rg.addColorStop(0.5,'rgba(255,255,255,0.25)'); rg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=rg; g.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
    }

    // ---- INTERAKTIVER GRAU-HINTERGRUND (selbst erzeugt: Punktfeld + Cursor-Licht + Drift-Blobs) ----
    // weiche, langsam driftende Licht-Blobs -> lebendiger Premium-Verlauf
    const blobs = [];
    [[0x39414f,120,-46,-46],[0x2b323e,104,44,-58],[0x3a4252,90,8,-34]].forEach(([col,sc,bx,bz])=>{
      const b=new THREE.Sprite(new THREE.SpriteMaterial({ map:glint(), color:col, transparent:true, opacity:0.42, blending:THREE.AdditiveBlending, depthWrite:false }));
      b.scale.set(sc,sc,1); b.position.set(bx,0,bz); b.userData={bx,bz}; blobs.push(b); scene.add(b);
    });
    // weiches Licht, das dem Cursor folgt -> klar interaktiv
    const cursorLight = new THREE.Sprite(new THREE.SpriteMaterial({ map:glint(), color:0x7390cc, transparent:true, opacity:0.34, blending:THREE.AdditiveBlending, depthWrite:false }));
    cursorLight.scale.set(78,78,1); cursorLight.position.set(0,0,-26); scene.add(cursorLight);
    // Aurora-Band: langsam wandernde Blau/Teal-Lichtwellen hinter dem Wort (rein analytisch -> butterweich, kann nicht flackern)
    const aurora = new THREE.Mesh(new THREE.PlaneGeometry(340,190), new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, uniforms:{ uT:{value:0} },
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:`varying vec2 vUv; uniform float uT;
        void main(){
          float yC=0.56 + 0.10*sin(vUv.x*2.3+uT*0.10) + 0.05*sin(vUv.x*5.1-uT*0.07);
          float band=smoothstep(0.34,0.0,abs(vUv.y-yC));
          float w=0.5+0.5*sin(vUv.x*3.7+uT*0.13);
          vec3 c=mix(vec3(0.07,0.16,0.30), vec3(0.16,0.42,0.75), w);
          c=mix(c, vec3(0.10,0.50,0.58), 0.5+0.5*sin(vUv.x*1.7-uT*0.06));
          gl_FragColor=vec4(c, band*0.30);
        }`}));
    aurora.position.set(0,6,-70); scene.add(aurora);
    // feines, schwebendes Punktfeld (Grau -> Blaugrau), Tiefe via sizeAttenuation
    const BG_N = small?1100:2300;
    const bgGeo = new THREE.BufferGeometry();
    const bgHome=new Float32Array(BG_N*3), bgPos=new Float32Array(BG_N*3), bgCol=new Float32Array(BG_N*3), bgSeed=new Float32Array(BG_N);
    const gc1=new THREE.Color(0x4c515e), gc2=new THREE.Color(0x9fabc4), gtmp=new THREE.Color();
    for(let i=0;i<BG_N;i++){ const x=(Math.random()*2-1)*98, y=(Math.random()*2-1)*58, z=-8-Math.random()*72;
      bgHome[i*3]=x; bgHome[i*3+1]=y; bgHome[i*3+2]=z; bgPos[i*3]=x; bgPos[i*3+1]=y; bgPos[i*3+2]=z;
      gtmp.copy(gc1).lerp(gc2,Math.random()); bgCol[i*3]=gtmp.r; bgCol[i*3+1]=gtmp.g; bgCol[i*3+2]=gtmp.b; bgSeed[i]=Math.random()*6.2831; }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos,3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol,3));
    const bgField = new THREE.Points(bgGeo, new THREE.PointsMaterial({ size:small?1.6:2.0, map:glint(), transparent:true, opacity:0.5, depthWrite:false, vertexColors:true, sizeAttenuation:false }));
    scene.add(bgField);

    // ---- Targets: Canvas-Pixel -> Punktwolke (Text ODER Form, Füllung ODER Kontur/Stroke) ----
    const N_OUT = small ? 1600 : 3000;                 // Kontur-Punkte (feiner als die Füllung)
    let _xf;                                            // letzte Transform (Füllung) -> Kontur nutzt sie -> sitzt AUSSEN herum
    function packFrom(g, W, H, stroke, count, xform){
      const data=g.getImageData(0,0,W,H).data, pts=[], step=stroke?(small?3:2):(small?4:3);
      for(let y=0;y<H;y+=step) for(let x=0;x<W;x+=step) if(data[(y*W+x)*4+3]>110) pts.push([x,y]);
      let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9; for(const[x,y]of pts){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
      const bw=maxX-minX||1, bh=maxY-minY||1; let cx=(minX+maxX)/2, cy=(minY+maxY)/2, scale;
      if(xform){ scale=xform.scale; cx=xform.cx; cy=xform.cy; }   // Kontur: gleiche Skalierung wie Füllung
      else { scale=18/bh; if(bw*scale>46) scale=46/bw; }
      _xf={scale,cx,cy};
      for(let i=pts.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; const t=pts[i]; pts[i]=pts[j]; pts[j]=t; }
      const out=new Float32Array(count*3), zJ=stroke?2.2:5;
      for(let i=0;i<count;i++){ const s=pts.length?pts[i%pts.length]:[W/2,H/2];
        out[i*3]=(s[0]-cx)*scale+(Math.random()-0.5)*0.3; out[i*3+1]=-(s[1]-cy)*scale+(Math.random()-0.5)*0.3; out[i*3+2]=(Math.random()-0.5)*zJ; }
      return out;
    }
    function sampleText(lines, stroke, count, xform){
      const W=1100,H=560,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      g.textAlign='center'; g.textBaseline='middle';
      let fs=lines.length>1?210:300; const fam="'Space Grotesk','Arial Black',system-ui,sans-serif"; g.font=`800 ${fs}px ${fam}`;
      let widest=0; lines.forEach(l=>widest=Math.max(widest,g.measureText(l).width)); const maxW=W*0.92;
      if(widest>maxW){ fs*=maxW/widest; g.font=`800 ${fs}px ${fam}`; }
      const lh=fs*1.04, total=lh*lines.length, yOf=i=>H/2-total/2+lh*(i+0.5);
      if(stroke){ g.lineWidth=Math.max(3,fs*0.02); g.lineJoin='round'; g.strokeStyle='#fff'; lines.forEach((l,i)=>g.strokeText(l,W/2,yOf(i))); }
      else { g.fillStyle='#fff'; lines.forEach((l,i)=>g.fillText(l,W/2,yOf(i))); }
      return packFrom(g, W, H, stroke, count||N, xform);
    }
    // Supercar-Silhouette (eigene Zeichnung, kein Modell): flacher Keil, Kabine, Spoiler, Räder
    function sampleCar(stroke, count, xform){
      const W=1100,H=560,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      const P=new Path2D();
      P.moveTo(75,360); P.lineTo(75,332);
      P.quadraticCurveTo(82,300,170,288);            // Heck / Motordeck
      P.quadraticCurveTo(285,232,420,226);           // Dachlinie
      P.quadraticCurveTo(540,224,620,252);           // Windschutzscheibe
      P.quadraticCurveTo(780,272,960,292);           // lange flache Nase
      P.quadraticCurveTo(1030,300,1038,332);
      P.lineTo(1038,360); P.closePath();
      const S=new Path2D(); S.moveTo(80,272); S.lineTo(195,258); S.lineTo(195,268); S.lineTo(80,282); S.closePath();   // Heckspoiler
      g.lineJoin='round';
      if(stroke){
        g.lineWidth=7; g.strokeStyle='#fff'; g.stroke(P); g.stroke(S);
        g.beginPath(); g.arc(285,362,50,0,7); g.stroke();
        g.beginPath(); g.arc(845,362,50,0,7); g.stroke();
      } else {
        g.fillStyle='#fff'; g.fill(P); g.fill(S);
        g.globalCompositeOperation='destination-out';                       // Radkästen + Fenster ausstanzen
        g.beginPath(); g.arc(285,362,58,0,7); g.fill();
        g.beginPath(); g.arc(845,362,58,0,7); g.fill();
        const Wd=new Path2D(); Wd.moveTo(330,252); Wd.lineTo(560,246); Wd.lineTo(612,262); Wd.lineTo(330,267); Wd.closePath(); g.fill(Wd);
        g.globalCompositeOperation='source-over';
        for(const wx of [285,845]){                                          // Räder: Felgenring + Nabe
          g.beginPath(); g.arc(wx,362,44,0,7); g.lineWidth=15; g.strokeStyle='#fff'; g.stroke();
          g.beginPath(); g.arc(wx,362,9,0,7); g.fillStyle='#fff'; g.fill();
        }
      }
      return packFrom(g, W, H, stroke, count||N, xform);
    }
    // Stationen: FH STUDIO -> SUPERCAR (statt "DESIGN") -> BUILD -> Namen -> CTA
    const STATIONS = [ ['FH','STUDIO'], 'CAR', ['BUILD'], ['FYNN','HOZAN'], ["LET'S","TALK"] ];
    const targets=[], outlineTargets=[];
    for(const s of STATIONS){
      if (s==='CAR'){ targets.push(sampleCar(false));   outlineTargets.push(sampleCar(true,  N_OUT, _xf)); }
      else          { targets.push(sampleText(s));      outlineTargets.push(sampleText(s, true, N_OUT, _xf)); }
    }

    // ---- Geometrie: helle BLAUE Partikel (Hellblau -> Weiß-Blau -> kräftiges Blau) + Twinkle ----
    const geo=new THREE.BufferGeometry();
    const pos=new Float32Array(targets[0]), col=new Float32Array(N*3), seed=new Float32Array(N);
    const cA=new THREE.Color(0xa9d6ff), cB=new THREE.Color(0xeaf4ff), cC=new THREE.Color(0x3d8bff), tmp=new THREE.Color();
    for(let i=0;i<N;i++){ const f=i/N; tmp.copy(f<0.5?cA.clone().lerp(cB,f*2):cB.clone().lerp(cC,(f-0.5)*2));
      col[i*3]=tmp.r; col[i*3+1]=tmp.g; col[i*3+2]=tmp.b; seed[i]=Math.random(); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col,3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed,1));
    const mat=new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{ uTime:{value:0}, uSize:{value:small?5.5:7.6}, uOpacity:{value:1}, uPR:{value:renderer.getPixelRatio()}, uTex:{value:glint()},
                 uCur:{value:new THREE.Vector3(1e9,1e9,0)}, uCurAmp:{value:0}, uTint:{value:new THREE.Color(1,1,1)} },
      vertexShader:`attribute vec3 aColor; uniform float uSize,uPR,uCurAmp; uniform vec3 uCur; varying vec3 vColor; varying float vB;
        void main(){ vColor=aColor;
          vB=uCurAmp*smoothstep(9.0,0.0,distance(position.xy,uCur.xy));   // Cursor-Naehe -> DEZENTES Aufgluehen
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=uSize*(1.0+0.1*vB)*uPR*(38.0/max(-mv.z,1.0)); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform sampler2D uTex; uniform float uOpacity; uniform vec3 uTint; varying vec3 vColor; varying float vB;
        void main(){ float a=texture2D(uTex,gl_PointCoord).a; if(a<0.02) discard;
          vec3 c=vColor*mix(vec3(1.0),uTint,0.45)*(1.0+0.22*vB);
          gl_FragColor=vec4(c, a*uOpacity*0.62*(1.0+0.08*vB)); }`   // 0.62: Summen ueberlappender Punkte clippen nie zu grellem Weiss (kein Aufblitzen)
    });
    const points=new THREE.Points(geo,mat); scene.add(points);

    // ---- KONTUR: feine Partikel-Linie entlang der Buchstaben-Ränder (morpht synchron mit) ----
    const oGeo=new THREE.BufferGeometry();
    const oPos=new Float32Array(outlineTargets[0]), oCol=new Float32Array(N_OUT*3), oSeed=new Float32Array(N_OUT);
    const oColor=new THREE.Color(0xff4156);            // Kontur-Farbe (Rot-Koralle) – HIER umstellbar (z.B. 0x9fd8ff für Eisblau)
    for(let i=0;i<N_OUT;i++){ oCol[i*3]=oColor.r; oCol[i*3+1]=oColor.g; oCol[i*3+2]=oColor.b; oSeed[i]=Math.random(); }
    oGeo.setAttribute('position', new THREE.BufferAttribute(oPos,3));
    oGeo.setAttribute('aColor',   new THREE.BufferAttribute(oCol,3));
    oGeo.setAttribute('aSeed',    new THREE.BufferAttribute(oSeed,1));
    const omat=mat.clone(); omat.uniforms.uSize.value=small?3.1:4.3;   // feiner als die Füllung
    const outline=new THREE.Points(oGeo,omat); scene.add(outline);
    // dezenter Farb-Akzent pro Station (multiplikativ aufs Blau; Kontur bleibt konstant rot)
    const TINTS=[ new THREE.Color(1,1,1),            // FH STUDIO  – pures Blau-Weiss
                  new THREE.Color(0.72,1.08,1.22),   // DESIGN     – cyan
                  new THREE.Color(1.25,1.02,0.72),   // BUILD      – warm
                  new THREE.Color(1.12,0.86,1.24),   // FYNN/HOZAN – violett
                  new THREE.Color(0.78,1.18,1.0) ];  // LET'S TALK – mint

    // dunkler Scrim hinter dem Wort -> Foto dahinter abdunkeln, Schrift hebt sich ab
    function radialDark(){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
      const rg=g.createRadialGradient(128,128,0,128,128,128); rg.addColorStop(0,'rgba(6,4,10,0.92)'); rg.addColorStop(0.5,'rgba(6,4,10,0.6)'); rg.addColorStop(1,'rgba(6,4,10,0)');
      g.fillStyle=rg; g.fillRect(0,0,256,256); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
    const wordScrim=new THREE.Sprite(new THREE.SpriteMaterial({ map:radialDark(), transparent:true, opacity:0, depthWrite:false }));
    wordScrim.scale.set(80,52,1); wordScrim.position.set(0,0,-7); scene.add(wordScrim);

    // ---- Postprocessing: Bloom -> Output -> Chromatic Aberration + Vignette ----
    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,cam));
    const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.26, 0.85, 0.0);  // Schwelle 0 = KONTINUIERLICH -> kein An/Aus-Poppen an einer Schwelle moeglich
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // NUR Vignette – KEINE chromatische Aberration mehr (die spaltete helle Punkte in rot/grün/blau Geister auf)
    composer.addPass(new ShaderPass({
      uniforms:{ tDiffuse:{value:null} },
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:['uniform sampler2D tDiffuse; varying vec2 vUv;','void main(){',
        '  vec2 d=vUv-0.5; float rad=dot(d,d); vec3 col=texture2D(tDiffuse,vUv).rgb;',
        '  float vig=smoothstep(0.95,0.22,rad*2.2); gl_FragColor=vec4(col*mix(0.66,1.0,vig),1.0); }'].join('\n')
    }));

    // ---- Morph: Aufbau aus Kugel + Wort-Morph + Cursor-Abstoßung + Flow (Füllung UND Kontur) ----
    const arr=geo.attributes.position.array, oArr=oGeo.attributes.position.array;
    function makeScatter(cnt){ const s=new Float32Array(cnt*3);
      for(let i=0;i<cnt;i++){ const th=Math.random()*6.2831, ph=Math.acos(2*Math.random()-1), r=18+Math.random()*28;
        s[i*3]=r*Math.sin(ph)*Math.cos(th); s[i*3+1]=r*Math.sin(ph)*Math.sin(th); s[i*3+2]=r*Math.cos(ph)*0.5-6; } return s; }
    const scatter=makeScatter(N), oScatter=makeScatter(N_OUT);
    let tmx=0,tmy=0,mx=0,my=0,cursorActive=false,clx=0,cly=0;
    addEventListener('pointermove', e=>{ tmx=(e.clientX/innerWidth)*2-1; tmy=(e.clientY/innerHeight)*2-1; cursorActive=true; }, {passive:true});
    addEventListener('pointerleave', ()=>{ cursorActive=false; }, {passive:true});
    function frameAB(p){ let a=0,b=0,fb=0;
      if(p<=objC[0]){ a=b=0; } else if(p>=objC[objC.length-1]){ a=b=objC.length-1; }
      else { for(let k=0;k<objC.length-1;k++){ if(p>=objC[k]&&p<=objC[k+1]){ a=k;b=k+1; fb=smooth((p-objC[k])/(objC[k+1]-objC[k])); break; } } }
      return [a,b,fb]; }
    function morph(TG, dst, attr, scat, cnt, eI, curX, curY, tt, a, b, fb){
      const A=TG[a],B=TG[b], R2=14, rep=(reduce||!cursorActive)?0:3.4, flow=reduce?0:1;   // 3.4: weniger Verdichtung am Abstossungs-Rand (kein heller Saum)
      // Spiral-Aufbau: Streu-Wolke dreht sich waehrend des Einfliegens ein (kinematisch)
      const swA=(1-eI)*2.2, swC=Math.cos(swA), swS=Math.sin(swA);
      for(let i=0;i<cnt;i++){ const i3=i*3, ph=i*0.37;
        let x=A[i3]+(B[i3]-A[i3])*fb, y=A[i3+1]+(B[i3+1]-A[i3+1])*fb, z=A[i3+2]+(B[i3+2]-A[i3+2])*fb;
        if(eI<1){ const s=1-eI, sx=scat[i3]*swC-scat[i3+1]*swS, sy=scat[i3]*swS+scat[i3+1]*swC;
          x=sx*s+x*eI; y=sy*s+y*eI; z=scat[i3+2]*s+z*eI; }
        if(flow){ x+=Math.sin(tt*0.45+ph)*0.08; y+=Math.cos(tt*0.4+ph*1.3)*0.08; }   // KEIN z-Wobble -> keine Groessen-Pulsation -> kein Flimmern
        if(rep){ const dx=x-curX,dy=y-curY,d2=dx*dx+dy*dy; if(d2<R2&&d2>0.04){ const f=1-d2/R2,kk=rep*f*f/Math.sqrt(d2); x+=dx*kk; y+=dy*kk; } }
        dst[i3]=x; dst[i3+1]=y; dst[i3+2]=z; }
      attr.needsUpdate=true;
    }
    const TW=0.03;
    function objVis(p){ let m=0; for(let k=0;k<5;k++){ const aa=BD[2*k],bb=BD[2*k+1];
      const tin=aa<=0?1:clamp((p-aa)/TW,0,1), tout=bb>=1?1:clamp((bb-p)/TW,0,1); m=Math.max(m,smooth(Math.min(tin,tout))); } return m; }

    function resize(){ renderer.setSize(innerWidth,innerHeight,false); composer.setSize(innerWidth,innerHeight); bloom.setSize(innerWidth,innerHeight);
      mat.uniforms.uPR.value=omat.uniforms.uPR.value=renderer.getPixelRatio(); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
    resize(); addEventListener('resize', resize);

    // ---- Loop ----
    let last=performance.now(), t=0, p=0, op=0, sentReady=false;
    // Sidebar-Sprung: Fortschritt + Sichtbarkeit SOFORT aufs Ziel setzen (kein Durchmorphen)
    addEventListener('fh:jump', ()=>{ p = progress(); op = objVis(p); }, {passive:true});
    function loop(now){
      const dt=Math.min((now-last)/1000,0.05); last=now; t+=reduce?0:dt;
      p += (progress() - p)*0.09; mx+=(tmx-mx)*0.05; my+=(tmy-my)*0.05;

      const introF=reduce?1:smooth(clamp(t/1.7,0,1));
      const tanH=Math.tan(48*Math.PI/360)*34, halfW=tanH*(innerWidth/innerHeight), cwx=tmx*halfW, cwy=-tmy*tanH;
      const ab=frameAB(p);
      morph(targets,        arr,  geo.attributes.position,  scatter,  N,     introF, cwx, cwy, t, ab[0], ab[1], ab[2]);
      morph(outlineTargets, oArr, oGeo.attributes.position, oScatter, N_OUT, introF, cwx, cwy, t, ab[0], ab[1], ab[2]);
      mat.uniforms.uTime.value=t; omat.uniforms.uTime.value=t;
      aurora.material.uniforms.uT.value=t;
      // Cursor-Glow: Buchstaben gluehen lokal auf, wo die Maus ist (weich ein-/ausblenden)
      mat.uniforms.uCur.value.set(cwx,cwy,0); omat.uniforms.uCur.value.set(cwx,cwy,0);
      const ampT=(cursorActive&&!reduce)?1:0;
      mat.uniforms.uCurAmp.value += (ampT-mat.uniforms.uCurAmp.value)*0.08;
      omat.uniforms.uCurAmp.value = mat.uniforms.uCurAmp.value;
      // Stations-Akzent weich ueberblenden (nur Fuellung; Kontur bleibt rot)
      mat.uniforms.uTint.value.copy(TINTS[ab[0]]).lerp(TINTS[ab[1]], ab[2]);
      const ry=Math.sin(t*0.18)*0.10+mx*0.22, rx=Math.cos(t*0.15)*0.05-my*0.10;
      points.rotation.set(rx,ry,0); outline.rotation.set(rx,ry,0);

      // Grau-Hintergrund: im Stillstand KOMPLETT ruhig (kein Flimmern), bewegt sich nur mit der Maus (Parallaxe)
      bgField.position.x += (mx*-3.6 - bgField.position.x)*0.06;
      bgField.position.y += (my*2.4  - bgField.position.y)*0.06;
      for(let i=0;i<blobs.length;i++){ const b=blobs[i]; b.position.x=b.userData.bx+Math.sin(t*0.06+i*2)*26; b.position.y=Math.cos(t*0.05+i*1.7)*18; }
      const lT=Math.tan(48*Math.PI/360)*(34+26), lW=lT*(innerWidth/innerHeight);
      clx += (tmx*lW - clx)*0.06; cly += (-tmy*lT - cly)*0.06;         // Cursor-Licht folgt weich
      cursorLight.position.set(clx, cly, -26);
      cursorLight.material.opacity += ((cursorActive?0.34:0.16) - cursorLight.material.opacity)*0.05;

      op += (objVis(p) - op)*0.12;
      mat.uniforms.uOpacity.value = op; omat.uniforms.uOpacity.value = op;   // Wort + Kontur faden zusammen
      wordScrim.material.opacity = 0.5*op;
      cam.position.x = mx*1.6; cam.position.y = -my*1.0; cam.lookAt(0,0,0);

      composer.render();
      if(!sentReady){ sentReady=true; dispatchEvent(new Event('fh:scene-ready')); }
      requestAnimationFrame(loop);
    }
    const journeyEl=document.getElementById('journey');
    function progress(){ if(journeyEl){ const sp=journeyEl.offsetHeight-innerHeight; if(sp>0) return clamp(-journeyEl.getBoundingClientRect().top/sp,0,1); }
      const m=Math.max(1,document.documentElement.scrollHeight-innerHeight); return clamp(scrollY/m,0,1); }
    requestAnimationFrame(loop);
    setTimeout(()=>{ if(!sentReady){ sentReady=true; dispatchEvent(new Event('fh:scene-ready')); } }, 4000);
  } catch (err) { console.warn('Foto-Bühne/Wortwolke konnte nicht geladen werden:', err); }
})();
