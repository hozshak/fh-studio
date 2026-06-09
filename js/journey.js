// =============================================================================
//  FH Studio – DIE REISE (Journey-Controller)
//  Abwechselnde Moment-Abfolge: OBJEKT (3D) -> TEXT -> OBJEKT -> TEXT ...
//  Es ist IMMER nur eins sichtbar. Text-Beats liegen in den ungeraden Segmenten
//  der Timeline; in den geraden (Objekt-)Segmenten ist aller Text ausgeblendet,
//  dort zeigt js/crystal-city.js das jeweilige 3D-Wahrzeichen (gleiche SEG-Folge).
//
//  Reihenfolge: obj Drache | TEXT Intro | obj Helm | TEXT Leistungen | obj Stadt |
//               TEXT Prozess | obj Lampe | TEXT Team | obj Drache | TEXT Kontakt
//
//  Progressive Enhancement: aktiv nur auf fähigen Viewports; sonst normale Sektionen.
// =============================================================================
const journey = document.getElementById('journey');
if (journey) {
  const stage    = journey.querySelector('.journey-stage');
  const beats    = [...journey.querySelectorAll('.beat')];   // 5 TEXT-Beats (DOM)
  const hint     = document.getElementById('scrollHint');
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const reduce   = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // Timeline (MUSS IDENTISCH zu js/crystal-city.js SEG sein): obj,text,obj,text,... (10 Segmente)
  const SEG    = [1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2, 1.5,1.2];
  const LABELS = ['Intro', 'Leistungen', 'Prozess', 'Team', 'Kontakt'];
  const TOTAL  = SEG.reduce((a, b) => a + b, 0);
  const TW     = 0.03;                                   // Ein-/Ausblend-Breite (klein vs. Segment ~0.1 -> volle Sichtbarkeit + Halten)

  const B = [0]; for (let i = 0; i < SEG.length; i++) B.push(B[i] + SEG[i] / TOTAL);
  const txtRange = k => [B[2*k + 1], B[2*k + 2]];        // Text-Beat k liegt im ungeraden Segment 2k+1
  const stationStart = k => B[2*k];                      // Station k beginnt mit ihrem Objekt-Segment

  const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = t => t * t * (3 - 2 * t);
  // sichtbar NUR innerhalb [a,b], blendet an den Rändern weich aus -> an den Segment-
  // grenzen ist alles bei 0 (kurzer leerer Moment) => sauberes Abwechseln.
  const vis = (p, a, b) => {
    const tin  = a <= 0 ? 1 : clamp((p - a) / TW, 0, 1);
    const tout = b >= 1 ? 1 : clamp((b - p) / TW, 0, 1);
    return smooth(Math.min(tin, tout));
  };

  let active = false, dots = null, curLink = null, sp = 0;   // sp = geglätteter Fortschritt

  function buildDots(){
    if (dots) return;
    dots = document.createElement('nav');
    dots.className = 'journey-dots';
    dots.setAttribute('aria-label', 'Stationen der Reise');
    beats.forEach((b, k) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.label = LABELS[k] || b.id;
      btn.setAttribute('aria-label', 'Zu Station: ' + (LABELS[k] || b.id));
      btn.addEventListener('click', () => scrollToStation(k));
      dots.appendChild(btn);
    });
    document.body.appendChild(dots);
  }

  function scrollToStation(k){
    const top = journey.offsetTop + stationStart(k) * (journey.offsetHeight - innerHeight) + 4;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }

  function interceptLinks(){
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      if (a.dataset.jBound) return; a.dataset.jBound = '1';
      a.addEventListener('click', e => {
        if (!active) return;
        const k = beats.findIndex(b => b.id === a.getAttribute('href').slice(1));
        if (k < 0) return;
        e.preventDefault(); scrollToStation(k);
      });
    });
  }

  // ---- Roh-Fortschritt 0..1 aus der Scroll-Position ----
  function rawP(){
    const span = journey.offsetHeight - innerHeight;
    return span > 0 ? clamp(-journey.getBoundingClientRect().top / span, 0, 1) : 0;
  }

  // ---- Render je Frame (p = geglätteter Fortschritt) ----
  function render(p){
    for (let k = 0; k < beats.length; k++){
      const [a, b] = txtRange(k), c = (a + b) / 2;
      const op = vis(p, a, b);
      const by = clamp((c - p) / ((b - a) / 2 + TW), -1, 1) * 30;   // Text steigt auf und zieht weiter
      const el = beats[k];
      el.style.opacity = op.toFixed(3);
      el.style.setProperty('--scrim', (op * 0.85).toFixed(3));
      const inner = el.querySelector('.beat-inner');
      if (inner) inner.style.setProperty('--by', by.toFixed(1) + 'px');
      el.style.pointerEvents = op > 0.55 ? 'auto' : 'none';
      el.style.zIndex = op > 0.5 ? 3 : 1;
      el.classList.toggle('is-active', op > 0.5);
    }

    // aktive Station = die, deren Bereich [Objekt..Text] p enthält
    let st = 0;
    for (let k = 0; k < beats.length; k++) if (p >= stationStart(k)) st = k;
    const link = navLinks.find(a => a.getAttribute('href') === '#' + beats[st].id) || null;
    if (link !== curLink){
      navLinks.forEach(a => a.classList.remove('active'));
      link && link.classList.add('active');
      curLink = link;
    }
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === st));
    if (hint) hint.classList.toggle('gone', p > B[1] * 0.7);    // Hinweis nur im ersten Objekt-Moment
  }

  // ---- Progressive Enhancement ----
  // Großzügig aktivieren (sonst sehen kleinere/niedrigere Fenster ALLE Beats gestapelt,
  // d.h. "FH Studio" sofort über der Wolke). reduced-motion -> sauberer Fallback (Wolke aus).
  const cityEl = document.getElementById('city');
  function capable(){ return matchMedia('(min-width:760px)').matches && innerHeight >= 480; }   // scroll-getrieben -> auch bei reduced-motion ok (Wolke dämpft Leerlauf)

  function activate(){
    active = true;
    document.documentElement.classList.add('journey-on');
    journey.style.setProperty('--journey-h', (TOTAL * 100).toFixed(2) + 'vh');
    if (cityEl) cityEl.style.display = '';
    if (hint) hint.style.display = '';
    buildDots(); interceptLinks(); sp = rawP(); render(sp);
  }

  function deactivate(){
    active = false;
    document.documentElement.classList.remove('journey-on');
    journey.style.removeProperty('--journey-h');
    beats.forEach(el => { el.style.cssText = ''; const i = el.querySelector('.beat-inner'); i && i.style.removeProperty('--by'); });
    navLinks.forEach(a => a.classList.remove('active')); curLink = null;
    if (hint){ hint.classList.remove('gone'); hint.style.display = 'none'; }   // im Fallback kein Scroll-Hinweis
    if (cityEl) cityEl.style.display = 'none';                                 // im Fallback Wolke aus -> nie Text über Wolke
  }

  function evaluate(){ if (capable()){ if (!active) activate(); } else if (active) deactivate(); }

  if (capable()) activate(); else deactivate();

  // EINE geglättete rAF-Schleife – identische Glättung wie js/crystal-city.js,
  // damit Text-Fades und 3D-Kamera exakt im Gleichtakt laufen (buttrig statt ruckelig).
  (function tick(){
    if (active){ sp += (rawP() - sp) * 0.09; render(sp); }
    requestAnimationFrame(tick);
  })();

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(evaluate, 150); });
}
