/* ===== CODE HERO (particles + typewriter) ===== */
(function(){
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const pc=document.getElementById('heroParticles');
  if(pc){
    const syms=['{','}','<','>','/','*','=',';',':','[',']','(',')','&','|','%','$','#','@','+','-','0','1'];
    for(let i=0;i<22;i++){
      const s=document.createElement('span');s.className='pt';
      s.textContent=syms[Math.floor(Math.random()*syms.length)];
      s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';
      s.style.fontSize=(13+Math.random()*16).toFixed(0)+'px';
      s.style.animationDelay=(-Math.random()*16).toFixed(1)+'s';
      s.style.animationDuration=(12+Math.random()*10).toFixed(1)+'s';
      pc.appendChild(s);
    }
  }
  const t=document.getElementById('typeName');
  if(t){
    const full=t.textContent;
    if(reduce){t.textContent=full;}
    else{t.textContent='';let i=0;const tick=()=>{t.textContent=full.slice(0,i++);if(i<=full.length)setTimeout(tick,85);};setTimeout(tick,450);}
  }
})();
