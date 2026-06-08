// =============================================================================
//  FH Studio – DIE REISE (Journey-Controller)
//  Eine gepinnte Buehne; 5 Beats werden per Scroll cross-faded, synchron zur
//  Kamerafahrt durch die Kristallstadt (js/crystal-city.js liest denselben
//  Fortschritt aus #journey -> automatisch im Gleichtakt, ohne Kopplung).
//
//  Progressive Enhancement: aktiviert nur auf faehigen Viewports
//  (genug Breite/Hoehe, keine reduced-motion). Sonst bleiben die Beats normale
//  gestapelte Sektionen – die Seite funktioniert immer.
// =============================================================================
const journey = document.getElementById('journey');
if (journey) {
  const stage   = journey.querySelector('.journey-stage');
  const beats   = [...journey.querySelectorAll('.beat')];
  const labStage= document.getElementById('labStage');
  const labProg = document.getElementById('labProg');
  const labRail = [...document.querySelectorAll('#labRail li')];
  const hint    = document.getElementById('scrollHint');
  const navLinks= [...document.querySelectorAll('.nav-links a')];
  const reduce  = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // Beat-Laengen in Viewport-Einheiten – Prozess bekommt mehr Scroll-Raum (5 Build-Schritte)
  const SPANS  = [1, 1.15, 2, 1.15, 1];
  const LABELS = ['Intro', 'Leistungen', 'Prozess', 'Team', 'Kontakt'];
  const TOTAL  = SPANS.reduce((a, b) => a + b, 0);
  const TW     = 0.05;                                  // Cross-Fade-Breite (Anteil 0..1)
  const PROZESS = 2;                                    // Index des Live-Demo-Beats

  // kumulative Grenzen B[0..5] in 0..1
  const B = [0];
  for (let i = 0; i < SPANS.length; i++) B.push(B[i] + SPANS[i] / TOTAL);

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = t => t * t * (3 - 2 * t);

  let active = false, dots = null, curLink = null;

  // ---- Stations-Navigation (rechts) ----
  function buildDots(){
    if (dots) return;
    dots = document.createElement('nav');
    dots.className = 'journey-dots';
    dots.setAttribute('aria-label', 'Stationen der Reise');
    beats.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.i = i;
      btn.dataset.label = LABELS[i];
      btn.setAttribute('aria-label', 'Zu Station: ' + LABELS[i]);
      btn.addEventListener('click', () => scrollToBeat(i));
      dots.appendChild(btn);
    });
    document.body.appendChild(dots);
  }

  function scrollToBeat(i){
    const top = journey.offsetTop + B[i] * (journey.offsetHeight - innerHeight) + 4;
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }

  // Nav-/CTA-Links auf Beat-Anker abfangen -> zur richtigen Scroll-Position der Buehne
  function interceptLinks(){
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      if (a.dataset.jBound) return; a.dataset.jBound = '1';
      a.addEventListener('click', e => {
        if (!active) return;
        const id = a.getAttribute('href').slice(1);
        const i = beats.findIndex(b => b.id === id);
        if (i < 0) return;
        e.preventDefault();
        scrollToBeat(i);
      });
    });
  }

  // ---- Kernupdate: Beats cross-faden nach Scroll-Fortschritt ----
  function update(){
    if (!active) return;
    const span = journey.offsetHeight - innerHeight;
    const p = span > 0 ? clamp(-journey.getBoundingClientRect().top / span, 0, 1) : 0;

    let best = 0, bestOp = -1;
    for (let i = 0; i < beats.length; i++){
      const a = B[i], b = B[i + 1], c = (a + b) / 2;
      const up = (p - (a - TW)) / TW;
      const down = ((b + TW) - p) / TW;
      const op = clamp(Math.min(up, down), 0, 1);
      const half = (b - a) / 2 + TW;
      const by = clamp((c - p) / half, -1, 1) * 34;     // Inhalt steigt auf und zieht weiter

      const el = beats[i];
      el.style.opacity = op.toFixed(3);
      el.style.setProperty('--scrim', (op * 0.9).toFixed(3));
      const inner = el.querySelector('.beat-inner');
      if (inner) inner.style.setProperty('--by', by.toFixed(1) + 'px');
      el.style.pointerEvents = op > 0.55 ? 'auto' : 'none';
      el.style.zIndex = op > 0.5 ? 3 : 1;
      el.classList.toggle('is-active', op > 0.5);
      if (op > bestOp){ bestOp = op; best = i; }
    }

    // Live-Demo baut sich ueber den Prozess-Beat hinweg auf
    if (labStage){
      const lp = clamp((p - B[PROZESS]) / (B[PROZESS + 1] - B[PROZESS]), 0, 1);
      const step = clamp(Math.floor(lp * 5), 0, 4);
      if (labStage.dataset.step !== String(step)){
        labStage.dataset.step = step;
        labRail.forEach(li => li.classList.toggle('on', +li.dataset.s <= step));
      }
      if (labProg) labProg.style.height = (lp * 100).toFixed(1) + '%';
    }

    // aktive Station -> Nav + Punkte
    const link = navLinks.find(a => a.getAttribute('href') === '#' + beats[best].id) || null;
    if (link !== curLink){
      navLinks.forEach(a => a.classList.remove('active'));
      link && link.classList.add('active');
      curLink = link;
    }
    if (dots) [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best));
    if (hint) hint.classList.toggle('gone', p > 0.012);
  }

  // ---- Aktivieren / Deaktivieren (Progressive Enhancement) ----
  function capable(){
    return !reduce && matchMedia('(min-width:760px)').matches && innerHeight >= 600;
  }

  function activate(){
    active = true;
    document.documentElement.classList.add('journey-on');
    journey.style.setProperty('--journey-h', (TOTAL * 100).toFixed(2) + 'vh');
    buildDots();
    interceptLinks();
    update();
  }

  function deactivate(){
    active = false;
    document.documentElement.classList.remove('journey-on');
    journey.style.removeProperty('--journey-h');
    // Inline-Styles zuruecksetzen -> Beats werden wieder normale Sektionen
    beats.forEach(el => {
      el.style.cssText = '';
      const inner = el.querySelector('.beat-inner');
      inner && inner.style.removeProperty('--by');
    });
    navLinks.forEach(a => a.classList.remove('active')); curLink = null;
    if (hint) hint.classList.remove('gone');
    // Live-Demo statisch fertig zeigen
    if (labStage){ labStage.dataset.step = 4; labRail.forEach(li => li.classList.add('on')); if (labProg) labProg.style.height = '100%'; }
  }

  function evaluate(){ if (capable()){ if (!active) activate(); } else if (active) deactivate(); }

  // Initial: faehig -> Reise an, sonst Fallback (Demo fertig zeigen)
  if (capable()) activate(); else deactivate();

  addEventListener('scroll', update, { passive: true });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { evaluate(); update(); }, 150); });
}
