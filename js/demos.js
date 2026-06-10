// =============================================================================
//  FH Studio – LIVE-DEMOS (Service-Karten als bedienbare Mini-Apps)
//  igloo-Prinzip: Bewegungsenergie sichtbar machen. Jede Karte DEMONSTRIERT
//  ihren Service nicht nur (CSS-Idle-Loop), sondern laesst ihn BEDIENEN:
//   - Animationen: Ball folgt dem Cursor auf der Kurve (Feder-Physik + Squash)
//   - Webdesign:   Cursor quetscht den Browser-Frame -> Layout reflowt live
//   - Online-Shop: Klick legt Produkte in den Warenkorb (Flug + Badge-Pop)
//   - Support:     Radar pingt dort, wo der Cursor steht
//  Buildless, nur Vanilla JS + WAAPI. rAF laeuft NUR bei Hover (Performance).
// =============================================================================
(function(){
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const fine   = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (reduce) return;                                   // Demos bleiben statisch
  const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,k)=>a+(b-a)*k, sm=k=>k*k*(3-2*k);

  /* ---- 1) ANIMATIONEN: Ball folgt dem Cursor mit Feder-Physik ---- */
  const animD=document.querySelector('.d-anim');
  if (animD && fine){
    const curve=animD.querySelector('.curve'), ball=animD.querySelector('.ball');
    const len=curve.getTotalLength();
    let cur=.5, v=0, tT=.5, raf=null, live=false;
    function step(){
      v+=(tT-cur)*.085; v*=.86; cur+=v;
      const c=clamp(cur,0,1);
      const P=curve.getPointAtLength(c*len), P2=curve.getPointAtLength(clamp(c+.01,0,1)*len);
      const ang=Math.atan2(P2.y-P.y,P2.x-P.x)*180/Math.PI;
      const sx=1+Math.min(Math.abs(v)*6,.5);            // Squash/Stretch entlang der Tangente
      ball.setAttribute('transform',`translate(${P.x.toFixed(1)} ${P.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sx.toFixed(3)} ${(1/sx).toFixed(3)})`);
      if (live || Math.abs(tT-cur)>.003 || Math.abs(v)>.003) raf=requestAnimationFrame(step);
      else { raf=null; animD.classList.remove('is-live'); ball.removeAttribute('transform'); }   // zurueck zum CSS-Idle-Loop
    }
    animD.addEventListener('pointermove',e=>{
      const r=animD.getBoundingClientRect();
      tT=clamp((e.clientX-r.left)/r.width,0,1);
      if(!live){ live=true; animD.classList.add('is-live'); }
      if(!raf) raf=requestAnimationFrame(step);
    });
    animD.addEventListener('pointerleave',()=>{ live=false; tT=.5; if(!raf) raf=requestAnimationFrame(step); });
  }

  /* ---- 2) WEBDESIGN: Responsive-Squeeze – Cursor = Breakpoint-Slider ---- */
  const desD=document.querySelector('.d-design');
  if (desD && fine){
    desD.classList.add('js-live');                       // CSS-Idle-Loop aus, JS uebernimmt
    const $=s=>desD.querySelector(s);
    const els={frame:$('.frame'),hero:$('.b-hero'),a:$('.b-a'),b:$('.b-b'),side:$('.b-side')};
    const sep=$('.sep');
    const A={frame:[20,8,80,48], hero:[26,23,44,12], a:[26,39,20,11], b:[50,39,20,11], side:[76,23,18,27]};  // Desktop
    const B={frame:[44,8,32,48], hero:[48,22,24,12], a:[48,37,24,7],  b:[48,46,24,7],  side:[60,23,0,27]};   // Smartphone
    const label=document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x','60'); label.setAttribute('y','62.5'); label.setAttribute('text-anchor','middle');
    label.setAttribute('class','bp-label'); desD.querySelector('svg').appendChild(label);
    let t=0, tT=0, hov=false, idleT=Math.random()*6;
    function apply(k){
      const K=sm(k);
      for (const n in els){ const e=els[n], a=A[n], b=B[n];
        e.setAttribute('x',lerp(a[0],b[0],K).toFixed(1)); e.setAttribute('y',lerp(a[1],b[1],K).toFixed(1));
        e.setAttribute('width',Math.max(0,lerp(a[2],b[2],K)).toFixed(1)); e.setAttribute('height',lerp(a[3],b[3],K).toFixed(1)); }
      els.side.setAttribute('opacity',(1-K).toFixed(2));                 // Sidebar verschwindet mobil
      sep.setAttribute('x1',lerp(20,44,K).toFixed(1)); sep.setAttribute('x2',lerp(100,76,K).toFixed(1));
      label.textContent=Math.round(lerp(1280,375,K))+'px';
    }
    (function step(){
      const beat=desD.closest('.beat');
      if (!beat || beat.classList.contains('is-active') || !document.documentElement.classList.contains('journey-on')){
        if (hov) t+=(tT-t)*.12;
        else { idleT+=.016; t+=((0.5+0.5*Math.sin(idleT*.7))-t)*.04; }   // Idle: sanftes Hin-und-Her
        apply(clamp(t,0,1));
      }
      requestAnimationFrame(step);
    })();
    desD.addEventListener('pointermove',e=>{ const r=desD.getBoundingClientRect(); hov=true; tT=1-clamp((e.clientX-r.left)/r.width,0,1); });
    desD.addEventListener('pointerleave',()=>{ hov=false; });
  }

  /* ---- 3) ONLINE-SHOP: Mini-Shop zum Bedienen – Plus legt ins Koerbchen, Minus nimmt raus ---- */
  const shopD=document.querySelector('.d-shop');
  if (shopD){
    const svg=shopD.querySelector('svg'), cn=shopD.querySelector('.cart-n'),
          badge=shopD.querySelector('.badge'), cart=shopD.querySelector('.cart'),
          tile=shopD.querySelector('.p-img');
    const bPlus=shopD.querySelector('.btn-plus'), bMin=shopD.querySelector('.btn-min');
    let n=3;
    const NS='http://www.w3.org/2000/svg';
    function flyRect(fromX,fromY,toX,toY,fade){
      const r=document.createElementNS(NS,'rect');
      r.setAttribute('x',fromX); r.setAttribute('y',fromY); r.setAttribute('width','12'); r.setAttribute('height','9'); r.setAttribute('rx','2');
      r.setAttribute('fill','#6db8ff'); r.style.transformBox='fill-box'; r.style.transformOrigin='center';
      svg.appendChild(r);
      const dx=toX-fromX, dy=toY-fromY;
      r.animate([
        { transform:'translate(0px,0px)', opacity:1 },
        { transform:`translate(${(dx*.5).toFixed(0)}px,${(dy-16).toFixed(0)}px) scale(.85)`, offset:.55 },
        { transform:`translate(${dx}px,${dy}px) scale(.4)`, opacity:fade },
      ],{ duration:520, easing:'cubic-bezier(.3,.7,.3,1)' }).onfinish=()=>r.remove();
    }
    function pop(el,s){ el.animate([{transform:'scale(1)'},{transform:`scale(${s})`},{transform:'scale(1)'}],{duration:300,easing:'cubic-bezier(.2,1.6,.4,1)'}); }
    bPlus.addEventListener('pointerdown',e=>{ e.stopPropagation();
      flyRect(20,16,80,30,.3);                                            // Produkt -> Korb
      n++; cn.textContent=n; pop(badge,1.5); pop(tile,0.86);
      cart.animate([{transform:'rotate(0deg)'},{transform:'rotate(-4deg)'},{transform:'rotate(3deg)'},{transform:'rotate(0deg)'}],{duration:280});
    });
    bMin.addEventListener('pointerdown',e=>{ e.stopPropagation();
      if(n<=0){ pop(badge,0.8); return; }                                  // leer -> kurzes Kopfschuetteln
      flyRect(80,28,20,15,1);                                              // Korb -> zurueck zum Produkt
      n--; cn.textContent=n; pop(badge,0.72);
    });
  }

  /* ---- 4) SUPPORT: Radar pingt dort, wo der Cursor steht ---- */
  const pulseD=document.querySelector('.d-pulse');
  if (pulseD && fine){
    const svg=pulseD.querySelector('svg'); let lastP=0;
    pulseD.addEventListener('pointermove',e=>{
      const now=performance.now(); if (now-lastP<300) return; lastP=now;
      const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
      const m=svg.getScreenCTM(); if(!m) return;
      const p=pt.matrixTransform(m.inverse());
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx',p.x.toFixed(1)); c.setAttribute('cy',p.y.toFixed(1));
      c.setAttribute('r','2'); c.setAttribute('class','live-ping'); svg.appendChild(c);
      c.animate([{r:'2',opacity:.95},{r:'12',opacity:0}],{duration:680,easing:'ease-out'}).onfinish=()=>c.remove();
    });
  }
})();
