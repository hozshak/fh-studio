(function(){
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* === SCI-FI NIGHT CITY (animierter Hintergrund) – durch WebGL-Kristallstadt ersetzt, daher nur aktiv falls #stars existiert === */
  const cv=document.getElementById('stars'),ctx=cv&&cv.getContext('2d');
  let W,H,DPR;const mouse={x:-999,y:-999};
  const PAL=['#16e0c7','#7c5cff','#ff4d8d','#3b82f6'];
  let stars=[],buildings=[],trails=[],embers=[],horizon=0;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function mkTrail(){
    const dir=Math.random()<.5?1:-1;
    return {x:dir>0?-60*DPR:W+60*DPR,y:horizon-rnd(8*DPR,H*0.16),len:rnd(40,140)*DPR,sp:rnd(1.6,4.5)*DPR*dir,col:Math.random()<.5?'#16e0c7':'#ff4d8d',a:rnd(.3,.7)};
  }
  function build(){
    DPR=Math.min(devicePixelRatio||1,1.6);
    W=cv.width=innerWidth*DPR;H=cv.height=innerHeight*DPR;
    cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
    horizon=H*0.64;
    const sc=Math.min(140,Math.floor(W*horizon/(34000*DPR)));
    stars=Array.from({length:sc},()=>({x:Math.random()*W,y:Math.random()*horizon*0.92,r:rnd(.3,1.3)*DPR,tw:Math.random()*6.28,sp:rnd(.5,1.8)}));
    buildings=[];
    const layers=[{depth:.45,h:.24,col:'#1b2547',win:.14},{depth:.7,h:.33,col:'#222e58',win:.2},{depth:1,h:.46,col:'#2b3a6e',win:.26}];
    layers.forEach((L,li)=>{
      let x=-rnd(0,90)*DPR;
      while(x<W+90*DPR){
        const bw=rnd(46,120)*DPR*(0.6+L.depth*0.7);
        const bh=rnd(H*L.h*0.5,H*L.h);
        const bx=x,by=horizon-bh;
        const wins=[];
        const cols=Math.max(2,Math.floor(bw/(13*DPR))),rows=Math.max(3,Math.floor(bh/(15*DPR)));
        for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
          if(Math.random()<L.win)wins.push({x:bx+(c+.5)/cols*bw,y:by+(r+.5)/rows*bh,col:PAL[(Math.random()*PAL.length)|0],ph:Math.random()*6.28,sp:rnd(.4,1.5),on:Math.random()<.7});
        }
        buildings.push({li,x:bx,y:by,w:bw,h:bh,col:L.col,depth:L.depth,wins});
        x+=bw+rnd(4,22)*DPR;
      }
    });
    trails=Array.from({length:7},mkTrail);
    embers=Array.from({length:34},()=>({x:Math.random()*W,y:Math.random()*H,r:rnd(.5,1.6)*DPR,vy:-rnd(.08,.45)*DPR,vx:rnd(-.1,.1)*DPR,col:PAL[(Math.random()*PAL.length)|0],a:rnd(.1,.45),ph:Math.random()*6.28}));
  }
  if(cv)build();
  let rtb;if(cv)addEventListener('resize',()=>{clearTimeout(rtb);rtb=setTimeout(build,160);});
  let T=0;
  function cityFrame(loop){
    T+=0.016;
    ctx.clearRect(0,0,W,H);
    /* Horizont-Glow */
    const g=ctx.createLinearGradient(0,horizon-H*0.32,0,horizon+H*0.06);
    g.addColorStop(0,'rgba(124,92,255,0)');g.addColorStop(.72,'rgba(124,92,255,0.12)');g.addColorStop(1,'rgba(22,224,199,0.2)');
    ctx.fillStyle=g;ctx.fillRect(0,horizon-H*0.32,W,H*0.4);
    /* Sterne (Funkeln) */
    ctx.fillStyle='#c4d4ff';
    for(const s of stars){ctx.globalAlpha=0.32+0.6*(0.5+0.5*Math.sin(T*s.sp+s.tw));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.fill();}
    ctx.globalAlpha=1;
    const par=mouse.x>=0?(mouse.x/innerWidth-0.5):0;
    /* Skyline mit LED-Fenstern */
    for(const b of buildings){
      const ox=par*24*DPR*b.depth;
      ctx.fillStyle=b.col;ctx.fillRect(b.x+ox,b.y,b.w,b.h);
      ctx.fillStyle='rgba(124,92,255,'+(0.07*b.depth)+')';ctx.fillRect(b.x+ox,b.y,b.w,2*DPR);
      for(const w of b.wins){
        let fl=0.55+0.45*Math.sin(T*w.sp+w.ph);if(!w.on)fl*=0.12;
        ctx.globalAlpha=Math.min(0.85,0.45*fl+0.08);ctx.fillStyle=w.col;
        ctx.fillRect(w.x+ox-1.3*DPR,w.y,2.6*DPR,2.6*DPR);
      }
      ctx.globalAlpha=1;
    }
    /* nasse Strasse: gespiegelte Skyline-Reflexion */
    ctx.save();
    ctx.translate(0,horizon*2);ctx.scale(1,-1);
    for(const b of buildings){
      const ox=par*24*DPR*b.depth;
      ctx.globalAlpha=0.13;ctx.fillStyle=b.col;ctx.fillRect(b.x+ox,b.y,b.w,b.h);
      for(const w of b.wins){if(!w.on)continue;const fl=0.5+0.5*Math.sin(T*w.sp+w.ph);ctx.globalAlpha=0.18*fl;ctx.fillStyle=w.col;ctx.fillRect(w.x+ox-1.3*DPR,w.y,2.6*DPR,3.6*DPR);}
    }
    ctx.restore();ctx.globalAlpha=1;
    const refl=ctx.createLinearGradient(0,horizon,0,H);
    refl.addColorStop(0,'rgba(4,5,10,0)');refl.addColorStop(.55,'rgba(4,5,10,.55)');refl.addColorStop(1,'rgba(4,5,10,.92)');
    ctx.fillStyle=refl;ctx.fillRect(0,horizon,W,H-horizon);
    /* Synthwave-Bodengrid */
    ctx.save();ctx.lineWidth=DPR;ctx.strokeStyle='rgba(124,92,255,1)';
    for(let i=1;i<=11;i++){const yy=horizon+i*i*(H*0.0055);if(yy>H)break;ctx.globalAlpha=0.22*(1-i/13);ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke();}
    const vp=W/2+par*50*DPR;ctx.globalAlpha=0.16;ctx.strokeStyle='rgba(22,224,199,1)';
    for(let i=-11;i<=11;i++){const bx=W/2+i*(W*0.058);ctx.beginPath();ctx.moveTo(vp,horizon);ctx.lineTo(bx,H);ctx.stroke();}
    ctx.restore();ctx.globalAlpha=1;
    /* Lichtspuren (fliegender Verkehr) */
    for(const tr of trails){
      tr.x+=tr.sp;const s=Math.sign(tr.sp);
      const gr=ctx.createLinearGradient(tr.x-tr.len*s,tr.y,tr.x,tr.y);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,tr.col);
      ctx.strokeStyle=gr;ctx.globalAlpha=tr.a;ctx.lineWidth=1.6*DPR;ctx.lineCap='round';ctx.shadowBlur=9*DPR;ctx.shadowColor=tr.col;
      ctx.beginPath();ctx.moveTo(tr.x-tr.len*s,tr.y);ctx.lineTo(tr.x,tr.y);ctx.stroke();
      if((s>0&&tr.x>W+tr.len)||(s<0&&tr.x<-tr.len))Object.assign(tr,mkTrail());
    }
    ctx.globalAlpha=1;ctx.lineCap='butt';ctx.shadowBlur=0;
    /* aufsteigende Glut-Partikel */
    for(const e of embers){e.y+=e.vy;e.x+=e.vx;if(e.y<-6){e.y=H+6;e.x=Math.random()*W;}ctx.globalAlpha=e.a*(0.55+0.45*Math.sin(T*2+e.ph));ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();}
    ctx.globalAlpha=1;
    if(loop)requestAnimationFrame(()=>cityFrame(true));
  }
  if(cv){if(!reduce)cityFrame(true);else cityFrame(false);}

  /* CURSOR — Sci-Fi-Reticle (snappy, ohne nachziehenden Trail) */
  const curEl=document.getElementById('cur'),ring=document.getElementById('ring');
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;mouse.x=mx;mouse.y=my;curEl.style.left=mx+'px';curEl.style.top=my+'px';});
  (function loop(){
    rx+=(mx-rx)*.55;ry+=(my-ry)*.55;ring.style.left=rx+'px';ring.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,[data-hov]').forEach(el=>{
    el.addEventListener('mouseenter',()=>ring.classList.add('grow'));
    el.addEventListener('mouseleave',()=>ring.classList.remove('grow'));
  });

  /* BUILD-UP LAB — scroll-getriebener Aufbau (Steps 0..4) + Maus-Tilt */
  const labSec=document.getElementById('lab');
  const labStage=document.getElementById('labStage');
  if(labSec&&labStage){
    const labProg=document.getElementById('labProg');
    const labRail=[...document.querySelectorAll('#labRail li')];
    const bb=labStage.querySelector('.bb');
    let labCur=-1;
    function labScroll(){
      const total=labSec.offsetHeight-innerHeight;
      const scrolled=Math.min(Math.max(-labSec.getBoundingClientRect().top,0),Math.max(1,total));
      const p=total>0?scrolled/total:0;
      const step=Math.max(0,Math.min(4,Math.floor(p*5)));
      if(step!==labCur){
        labCur=step;labStage.dataset.step=step;
        labRail.forEach(li=>li.classList.toggle('on',+li.dataset.s<=step));
      }
      if(labProg)labProg.style.height=(p*100)+'%';
    }
    addEventListener('scroll',labScroll,{passive:true});
    addEventListener('resize',labScroll);labScroll();
    if(!reduce&&bb){
      labStage.addEventListener('pointermove',e=>{
        const r=labStage.getBoundingClientRect();
        const px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
        bb.style.transform='perspective(1300px) rotateY('+(px*6).toFixed(2)+'deg) rotateX('+(-py*6).toFixed(2)+'deg)';
      });
      labStage.addEventListener('pointerleave',()=>{bb.style.transform='';});
    }
  }

  /* NAV + PROGRESS */
  const nav=document.getElementById('nav'),bar=document.getElementById('bar');
  function onScroll(){const y=scrollY;nav.classList.toggle('scrolled',y>40);const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(y/max*100)+'%';}
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* HERO CHAR SPLIT */
  document.querySelectorAll('[data-split]').forEach((el,wi)=>{
    const txt=el.textContent;el.textContent='';
    [...txt].forEach((ch,i)=>{const s=document.createElement('span');s.className='ch';s.textContent=ch===' '?' ':ch;s.style.animationDelay=(wi*0.05+i*0.03+0.15)+'s';el.appendChild(s);});
  });

  /* HERO GRADIENT WORD — Verlauf durchgehend ueber die Einzelbuchstaben ausrichten.
     (Notwendig, weil das Splitting den Text in .ch-Kinder verschiebt und das textlose
      .grad-Element sonst nichts mehr clippt -> unsichtbarer Verlauf.) */
  const gradWord=document.querySelector('.hero h1 .grad');
  if(gradWord){
    const gchars=[...gradWord.querySelectorAll('.ch')];
    function alignGradient(){
      const wRect=gradWord.getBoundingClientRect();
      if(!wRect.width)return;
      gchars.forEach(ch=>{
        const r=ch.getBoundingClientRect();
        ch.style.setProperty('--gw',wRect.width+'px');
        ch.style.setProperty('--gx',-(r.left-wRect.left)+'px');
      });
    }
    alignGradient();
    addEventListener('load',alignGradient);
    if('fonts' in document)document.fonts.ready.then(alignGradient);
    let gt;addEventListener('resize',()=>{clearTimeout(gt);gt=setTimeout(alignGradient,120);});
  }

  /* HERO — magnetische Buchstaben + fliessender Verlauf (Cursor-reaktiv).
     Robust: Sichtbarkeit haengt NICHT von diesem Effekt ab. Faellt er aus,
     bleiben die Buchstaben einfach stehen (und sichtbar). */
  const heroH1=document.querySelector('.hero h1');
  if(heroH1 && !reduce && matchMedia('(hover:hover) and (pointer:fine)').matches){
    const allCh=[...heroH1.querySelectorAll('.ch')];
    let centers=[],hx=0,hy=0,active=false,ready=false;
    const grad=heroH1.querySelector('.grad');
    function measure(){
      const saved=allCh.map(ch=>ch.style.transform);
      allCh.forEach(ch=>ch.style.transform='none');
      centers=allCh.map(ch=>{const r=ch.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+scrollY+r.height/2};});
      allCh.forEach((ch,i)=>ch.style.transform=saved[i]);
    }
    /* Nach Ablauf der Einblend-Animation (~1.3s) den SICHTBAREN Endzustand fest
       verankern (opacity:1!), die CSS-Animation entfernen und transform fuer die
       Maus-Steuerung freigeben. Per Timer statt animationend -> zuverlaessig. */
    setTimeout(()=>{
      allCh.forEach(ch=>{ch.style.opacity='1';ch.style.transform='none';ch.style.animation='none';ch.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';});
      measure();ready=true;
    },1650);
    heroH1.addEventListener('pointermove',e=>{hx=e.clientX;hy=e.clientY;active=true;});
    heroH1.addEventListener('pointerleave',()=>{active=false;allCh.forEach(ch=>ch.style.transform='none');if(grad)grad.style.setProperty('--gshift','0px');});
    let rt2;addEventListener('resize',()=>{clearTimeout(rt2);rt2=setTimeout(()=>{if(ready)measure();},150);});
    const R=170;
    function heroLoop(){
      if(ready&&active&&centers.length){
        allCh.forEach((ch,i)=>{
          const c=centers[i];if(!c)return;
          const dx=hx-c.x,dy=hy-(c.y-scrollY),dist=Math.hypot(dx,dy);
          if(dist<R){const f=1-dist/R;ch.style.transform='translate('+(dx*0.16*f).toFixed(1)+'px,'+(dy*0.22*f).toFixed(1)+'px) scale('+(1+0.22*f).toFixed(3)+')';}
          else ch.style.transform='none';
        });
        if(grad)grad.style.setProperty('--gshift',((hx/(innerWidth||1)-0.5)*70).toFixed(1)+'px');
      }
      requestAnimationFrame(heroLoop);
    }
    requestAnimationFrame(heroLoop);
  }

  /* REVEAL */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.14});
  document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=(i%6)*50+'ms';io.observe(el);});
  /* robust scroll fallback (works even where IntersectionObserver is flaky) */
  function checkReveal(){
    const vh=innerHeight;
    document.querySelectorAll('.reveal:not(.in),.tl-step:not(.in)').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.top<vh*0.88)el.classList.add('in');
    });
  }
  addEventListener('scroll',checkReveal,{passive:true});
  addEventListener('load',checkReveal);checkReveal();

  /* SCRAMBLE TITLES */
  const CH='!<>-_\\/[]{}—=+*^?#01';
  function scramble(el){const final=el.dataset.text;let frame=0;const dur=final.length*1.4+20;
    const tick=()=>{let out='';for(let i=0;i<final.length;i++){if(frame>i*1.4+10)out+=final[i];else if(frame>i*1.4)out+=CH[Math.floor(Math.random()*CH.length)];else out+=' ';}el.textContent=out;frame++;if(frame<dur)requestAnimationFrame(tick);else el.textContent=final;};tick();}
  const sio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const el=e.target;el.dataset.text=el.textContent;scramble(el);sio.unobserve(el);}}),{threshold:.5});
  if(!reduce)document.querySelectorAll('[data-scramble]').forEach(el=>sio.observe(el));

  /* TL-CARD SPOTLIGHT (timeline) */
  document.querySelectorAll('.tl-card').forEach(c=>{c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');});});

  /* SERVICE CARDS — interactive 3D tilt + depth parallax + glare */
  document.querySelectorAll('.card').forEach(c=>{
    const glare=document.createElement('span');glare.className='glare';c.appendChild(glare);
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
      c.style.setProperty('--mx',(e.clientX-r.left)+'px');
      c.style.setProperty('--my',(e.clientY-r.top)+'px');
      c.style.transform='perspective(900px) rotateY('+((px-.5)*18).toFixed(2)+'deg) rotateX('+(-(py-.5)*18).toFixed(2)+'deg)';
      glare.style.background='linear-gradient('+(px*360)+'deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%)';
    });
    c.addEventListener('mouseleave',()=>{c.style.transform='';});
  });

  /* PROCESS TIMELINE */
  const tl=document.getElementById('timeline'),tlfill=document.getElementById('tlfill');
  const tio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');}),{threshold:.35});
  document.querySelectorAll('.tl-step').forEach(s=>tio.observe(s));
  function tlScroll(){if(!tl)return;const r=tl.getBoundingClientRect();const p=Math.max(0,Math.min(1,(innerHeight*0.72-r.top)/r.height));tlfill.style.height=(p*100)+'%';}
  addEventListener('scroll',tlScroll,{passive:true});tlScroll();

  /* DEVELOPERS — typing on hover */
  function setupDev(card){
    const hands=card.querySelectorAll('.hand');
    const lines=[...card.querySelectorAll('.ln')];
    const cur=card.querySelector('.cur');
    if(hands.length<2||!lines.length)return;
    const targets=lines.map(l=>+l.dataset.w);
    const bx=lines.map(l=>+l.getAttribute('x')),by=lines.map(l=>+l.getAttribute('y'));
    function idle(){lines.forEach((l,i)=>l.setAttribute('width',targets[i]));hands.forEach(h=>h.removeAttribute('transform'));if(cur)cur.setAttribute('opacity','0');card.classList.remove('active');}
    idle();
    let raf=null,start=0,li=0,w=0;
    function loop(now){
      if(!start)start=now;const t=(now-start)/1000;
      const tap=p=>{const s=Math.sin(p);return s>0?(-s*3.4).toFixed(2):0;};
      hands[0].setAttribute('transform','translate(0 '+tap(t*15)+')');
      hands[1].setAttribute('transform','translate(0 '+tap(t*15+1.8)+')');
      w+=2.4;
      if(w>=targets[li]){lines[li].setAttribute('width',targets[li]);li++;w=0;if(li>=lines.length){li=0;lines.forEach(l=>l.setAttribute('width',0));}}
      else lines[li].setAttribute('width',w.toFixed(1));
      if(cur){cur.setAttribute('opacity',Math.floor(t*3)%2?'1':'0.25');cur.setAttribute('x',(bx[li]+Math.min(w,targets[li])+2).toFixed(1));cur.setAttribute('y',by[li]-1);}
      raf=requestAnimationFrame(loop);
    }
    card.addEventListener('mouseenter',()=>{if(raf)return;card.classList.add('active');lines.forEach(l=>l.setAttribute('width',0));li=0;w=0;start=0;raf=requestAnimationFrame(loop);});
    card.addEventListener('mouseleave',()=>{if(raf){cancelAnimationFrame(raf);raf=null;}idle();});
  }
  document.querySelectorAll('.member').forEach(setupDev);

  /* TESTIMONIAL BOOK */
  const book=document.getElementById('book');
  if(book){
    const pagesEl=book.querySelector('.book-pages');
    const pages=[...book.querySelectorAll('.page')];
    const N=pages.length;
    const prevBtn=document.getElementById('bprev'),nextBtn=document.getElementById('bnext'),counter=document.getElementById('bnow');
    let cur=0;
    function render(){
      pages.forEach((p,i)=>{
        p.style.transform='';
        if(i<cur){p.classList.add('flipped');p.style.zIndex=i;}
        else{p.classList.remove('flipped');p.style.zIndex=N-i;}
      });
      if(counter)counter.textContent=cur+1;
      if(prevBtn)prevBtn.disabled=cur<=0;
      if(nextBtn)nextBtn.disabled=cur>=N-1;
    }
    function next(){if(cur<N-1){cur++;render();}}
    function prev(){if(cur>0){cur--;render();}}
    nextBtn&&nextBtn.addEventListener('click',next);
    prevBtn&&prevBtn.addEventListener('click',prev);
    /* drag / swipe to turn pages */
    let dragging=false,startX=0,active=null,dir=0;
    book.addEventListener('pointerdown',e=>{
      if(e.target.closest('.book-btn'))return;
      dragging=true;startX=e.clientX;dir=0;active=null;
      try{book.setPointerCapture(e.pointerId);}catch(_){}
    });
    book.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const dx=e.clientX-startX;
      if(!dir){
        if(dx<-6&&cur<N-1){dir=1;active=pages[cur];active.classList.add('dragging');active.style.zIndex=99;}
        else if(dx>6&&cur>0){dir=-1;active=pages[cur-1];active.classList.add('dragging');active.style.zIndex=99;}
      }
      if(!active)return;
      const w=pagesEl.clientWidth||1;
      let ang;
      if(dir===1){ang=Math.min(0,Math.max(-180,(dx/w)*180));}
      else{ang=-180+Math.min(180,Math.max(0,(dx/w)*180));}
      active.style.transform='rotateY('+ang+'deg)';
    });
    function endDrag(e){
      if(!dragging)return;dragging=false;
      if(active){
        const dx=(e.clientX||startX)-startX,w=pagesEl.clientWidth||1,frac=Math.abs(dx)/w;
        active.classList.remove('dragging');active.style.transform='';
        if(frac>0.32){if(dir===1)cur++;else if(dir===-1)cur--;}
        render();
      }
      active=null;dir=0;
    }
    book.addEventListener('pointerup',endDrag);
    book.addEventListener('pointercancel',endDrag);
    render();
  }

  /* PORTFOLIO TVs — click to power on */
  const siteModal=document.getElementById('siteModal');
  function openSiteModal(key){
    if(!siteModal)return;
    siteModal.querySelectorAll('.sm-site').forEach(s=>s.classList.toggle('show',s.dataset.site===key));
    const urls={nimbus:'https://nimbus.app',hain:'https://studio-hain.de',pulse:'https://pulse-agency.co'};
    const u=siteModal.querySelector('.sm-url');if(u)u.textContent=urls[key]||'https://preview';
    siteModal.classList.add('open');document.body.classList.add('modal-open');
    const sc=siteModal.querySelector('.sm-scroll');if(sc)sc.scrollTop=0;
  }
  function closeSiteModal(){if(!siteModal)return;siteModal.classList.remove('open');document.body.classList.remove('modal-open');}
  if(siteModal){siteModal.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',closeSiteModal));addEventListener('keydown',e=>{if(e.key==='Escape')closeSiteModal();});}
  document.querySelectorAll('.tv').forEach(tv=>{
    const scr=tv.querySelector('.tv-screen'),crt=tv.querySelector('.crt'),hint=tv.querySelector('.tv-hint');
    function toggle(){
      const on=!tv.classList.contains('on');
      tv.classList.toggle('on');
      if(on&&crt){crt.style.animation='none';void crt.offsetWidth;crt.style.animation='';}
      if(hint)hint.textContent=on?'An':'Klick';
      if(on&&tv.dataset.modal)setTimeout(()=>openSiteModal(tv.dataset.modal),420);
    }
    scr.addEventListener('click',toggle);
    tv.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
  });


  /* MAGNETIC BUTTONS */
  document.querySelectorAll('.btn').forEach(b=>{
    b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();const x=e.clientX-r.left-r.width/2;const y=e.clientY-r.top-r.height/2;b.style.transform=`translate(${x*.25}px,${y*.35}px)`;});
    b.addEventListener('mouseleave',()=>b.style.transform='');
  });

  /* COUNT UP */
  const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,end=+el.dataset.count;let n=0;const step=()=>{n+=Math.ceil(end/40);if(n>=end){el.textContent=end;}else{el.textContent=n;requestAnimationFrame(step);}};step();cio.unobserve(el);}),{threshold:.6});
  document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));

  /* SCREEN SLIDESHOW */
  const slides=[...document.querySelectorAll('.sl')],dots=[...document.querySelectorAll('#dots b')];
  let idx=0,timer;
  function show(n){slides[idx].classList.remove('on');dots[idx].classList.remove('on');idx=(n+slides.length)%slides.length;slides[idx].classList.add('on');dots[idx].classList.add('on');}
  function play(){timer=setInterval(()=>show(idx+1),3000);}
  dots.forEach((d,i)=>d.addEventListener('click',()=>{clearInterval(timer);show(i);play();}));
  if(!reduce&&slides.length)play();

  /* SMOOTH LOOP: marquee + light blob drift */
  const track=document.getElementById('track');
  const track2=document.getElementById('track2');
  const b1=document.querySelector('.b1'),b2=document.querySelector('.b2');
  let lastMx=0;addEventListener('mousemove',e=>{lastMx=(e.clientX/innerWidth-.5);});
  let mo=0,mo2=0;
  function frame(){
    if(!reduce){
      if(b1)b1.style.transform='translateX('+(lastMx*28)+'px)';
      if(b2)b2.style.transform='translateX('+(lastMx*-22)+'px)';
    }
    if(track){mo-=0.6;if(mo<=-track.scrollWidth/2)mo=0;track.style.transform='translateX('+mo+'px)';}
    if(track2){mo2+=0.42;if(mo2>=0)mo2=-track2.scrollWidth/2;track2.style.transform='translateX('+mo2+'px)';}
    requestAnimationFrame(frame);
  }
  frame();

  /* NAV SCROLL-SPY — aktiver Menüpunkt je nach sichtbarer Sektion */
  const navLinks=[...document.querySelectorAll('.nav-links a')];
  const spySecs=navLinks
    .map(a=>({a,sec:document.getElementById(a.getAttribute('href').slice(1))}))
    .filter(o=>o.sec);
  let curActive=null;
  function spyScroll(){
    const line=scrollY+innerHeight*0.32; // Referenzlinie im oberen Drittel
    let best=null;
    spySecs.forEach(o=>{
      const top=o.sec.getBoundingClientRect().top+scrollY;
      if(top<=line&&(!best||top>best.top))best={top,a:o.a};
    });
    const link=best?best.a:null;
    if(link!==curActive){
      spySecs.forEach(o=>o.a.classList.remove('active'));
      if(link)link.classList.add('active');
      curActive=link;
    }
  }
  addEventListener('scroll',spyScroll,{passive:true});spyScroll();
})();
