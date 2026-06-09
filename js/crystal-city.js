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
    const bgField = new THREE.Points(bgGeo, new THREE.PointsMaterial({ size:small?0.5:0.62, map:glint(), transparent:true, opacity:0.6, depthWrite:false, vertexColors:true, sizeAttenuation:true }));
    scene.add(bgField);

    // ---- Wort-Targets: Text per Canvas in Punkte gesampelt (Füllung ODER Kontur/Stroke) ----
    const N_OUT = small ? 1600 : 3000;                 // Kontur-Punkte (feiner als die Füllung)
    let _xf;                                            // letzte Transform (Füllung) -> Kontur nutzt sie -> sitzt AUSSEN herum
    function sampleText(lines, stroke, count, xform){
      count = count || N;
      const W=1100,H=560,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
      g.textAlign='center'; g.textBaseline='middle';
      let fs=lines.length>1?210:300; const fam="'Space Grotesk','Arial Black',system-ui,sans-serif"; g.font=`800 ${fs}px ${fam}`;
      let widest=0; lines.forEach(l=>widest=Math.max(widest,g.measureText(l).width)); const maxW=W*0.92;
      if(widest>maxW){ fs*=maxW/widest; g.font=`800 ${fs}px ${fam}`; }
      const lh=fs*1.04, total=lh*lines.length, yOf=i=>H/2-total/2+lh*(i+0.5);
      if(stroke){ g.lineWidth=Math.max(3,fs*0.02); g.lineJoin='round'; g.strokeStyle='#fff'; lines.forEach((l,i)=>g.strokeText(l,W/2,yOf(i))); }
      else { g.fillStyle='#fff'; lines.forEach((l,i)=>g.fillText(l,W/2,yOf(i))); }
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
    const WORDS = [['FH','STUDIO'], ['DESIGN'], ['BUILD'], ['FYNN','HOZAN'], ["LET'S","TALK"]];
    const targets=[], outlineTargets=[];
    for(const w of WORDS){ targets.push(sampleText(w)); outlineTargets.push(sampleText(w, true, N_OUT, _xf)); }  // Kontur nutzt Füllungs-Transform

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
      uniforms:{ uTime:{value:0}, uSize:{value:small?5.5:7.6}, uOpacity:{value:1}, uPR:{value:renderer.getPixelRatio()}, uTex:{value:glint()} },
      vertexShader:`attribute vec3 aColor; attribute float aSeed; uniform float uTime,uSize,uPR; varying vec3 vColor; varying float vTw;
        void main(){ vColor=aColor; float tw=0.5+0.5*sin(uTime*2.0+aSeed*6.2831); vTw=tw;
          vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*(0.5+0.5*tw)*uPR*(38.0/max(-mv.z,1.0)); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform sampler2D uTex; uniform float uOpacity; varying vec3 vColor; varying float vTw;
        void main(){ float a=texture2D(uTex,gl_PointCoord).a; if(a<0.02) discard; gl_FragColor=vec4(vColor*(0.75+0.55*vTw), a*uOpacity*(0.6+0.4*vTw)); }`
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

    // dunkler Scrim hinter dem Wort -> Foto dahinter abdunkeln, Schrift hebt sich ab
    function radialDark(){ const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
      const rg=g.createRadialGradient(128,128,0,128,128,128); rg.addColorStop(0,'rgba(6,4,10,0.92)'); rg.addColorStop(0.5,'rgba(6,4,10,0.6)'); rg.addColorStop(1,'rgba(6,4,10,0)');
      g.fillStyle=rg; g.fillRect(0,0,256,256); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
    const wordScrim=new THREE.Sprite(new THREE.SpriteMaterial({ map:radialDark(), transparent:true, opacity:0, depthWrite:false }));
    wordScrim.scale.set(80,52,1); wordScrim.position.set(0,0,-7); scene.add(wordScrim);

    // ---- Postprocessing: Bloom -> Output -> Chromatic Aberration + Vignette ----
    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,cam));
    const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.62, 0.6, 0.5);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass({
      uniforms:{ tDiffuse:{value:null}, uAmount:{value:0.0015} },
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:['uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv;','void main(){',
        '  vec2 d=vUv-0.5; float rad=dot(d,d); vec2 off=d*uAmount*(0.5+rad*2.2);',
        '  float r=texture2D(tDiffuse,vUv+off).r,g=texture2D(tDiffuse,vUv).g,b=texture2D(tDiffuse,vUv-off).b;',
        '  float vig=smoothstep(0.95,0.22,rad*2.2); gl_FragColor=vec4(vec3(r,g,b)*mix(0.62,1.0,vig),1.0); }'].join('\n')
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
      const A=TG[a],B=TG[b], R2=14, rep=(reduce||!cursorActive)?0:4.2, flow=reduce?0:1;
      for(let i=0;i<cnt;i++){ const i3=i*3, ph=i*0.37;
        let x=A[i3]+(B[i3]-A[i3])*fb, y=A[i3+1]+(B[i3+1]-A[i3+1])*fb, z=A[i3+2]+(B[i3+2]-A[i3+2])*fb;
        if(eI<1){ const s=1-eI; x=scat[i3]*s+x*eI; y=scat[i3+1]*s+y*eI; z=scat[i3+2]*s+z*eI; }
        if(flow){ x+=Math.sin(tt*0.8+ph)*0.18; y+=Math.cos(tt*0.7+ph*1.3)*0.18; z+=Math.sin(tt*0.95+ph*0.7)*0.55; }
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
    function loop(now){
      const dt=Math.min((now-last)/1000,0.05); last=now; t+=reduce?0:dt;
      p += (progress() - p)*0.09; mx+=(tmx-mx)*0.05; my+=(tmy-my)*0.05;

      const introF=reduce?1:smooth(clamp(t/1.7,0,1));
      const tanH=Math.tan(48*Math.PI/360)*34, halfW=tanH*(innerWidth/innerHeight), cwx=tmx*halfW, cwy=-tmy*tanH;
      const ab=frameAB(p);
      morph(targets,        arr,  geo.attributes.position,  scatter,  N,     introF, cwx, cwy, t, ab[0], ab[1], ab[2]);
      morph(outlineTargets, oArr, oGeo.attributes.position, oScatter, N_OUT, introF, cwx, cwy, t, ab[0], ab[1], ab[2]);
      mat.uniforms.uTime.value=t; omat.uniforms.uTime.value=t;
      const ry=Math.sin(t*0.18)*0.10+mx*0.22, rx=Math.cos(t*0.15)*0.05-my*0.10;
      points.rotation.set(rx,ry,0); outline.rotation.set(rx,ry,0);

      // interaktiver Grau-Hintergrund: schwebendes Punktfeld + Parallaxe + driftende Blobs + Cursor-Licht
      { const ba=bgGeo.attributes.position.array;
        for(let i=0;i<BG_N;i++){ const i3=i*3,s=bgSeed[i];
          ba[i3]=bgHome[i3]+Math.sin(t*0.25+s)*1.7; ba[i3+1]=bgHome[i3+1]+Math.cos(t*0.22+s*1.3)*1.7; }
        bgGeo.attributes.position.needsUpdate=true; }
      bgField.position.x = mx*-3.6; bgField.position.y = my*2.4;       // Parallaxe-Tiefe (reagiert auf Maus)
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
