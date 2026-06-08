// =============================================================================
//  FH Studio – Loader-Steuerung (Igloo-Pattern: zeigen -> .ready -> ausblenden)
//  Eigene Identität: scrambelnde Monospace-Zeile + Brand-Progress + Glitch-Exit.
//  Entkoppelt: kennt die 3D-Module nicht – wartet auf ein Bereit-Promise.
// =============================================================================
const CH = '!<>-_\\/[]{}—=+*^?#01';                 // identische Charset wie die Seiten-Scramble
const REDUCE = matchMedia('(prefers-reduced-motion:reduce)').matches;

export class Loader {
  constructor(){
    this.el      = document.getElementById('fh-loader');
    this.glyphEl = document.getElementById('fhlGlyphs');
    this.barEl   = document.getElementById('fhlBar');
    this.pctEl   = document.getElementById('fhlPct');
    this.taskEl  = document.getElementById('fhlTask');
    this.target  = 'FH · STUDIO';
    this.pct     = 0;
    this.raf     = 0;
    this._done   = false;
    document.documentElement.style.overflow = 'hidden';  // kein Scrollen hinter dem Loader
  }

  start(){
    if (!this.el) return;
    this._scramble();
    // weicher Fortschritt bis ~88% (echtes Ende kommt via finish())
    const tick = () => {
      if (this._done) return;
      const ceil = 88;
      this.pct += (ceil - this.pct) * 0.035 + 0.15;
      if (this.pct > ceil) this.pct = ceil;
      this._paint(this.pct);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  setTask(label){ if (this.taskEl) this.taskEl.textContent = label; }

  // settle die Glyph-Zeile vom Rauschen zum Zielwort
  _scramble(){
    if (!this.glyphEl) return;
    const final = this.target, len = final.length;
    let frame = 0; const dur = len * 2.2 + 30;
    const step = () => {
      if (this._done) { this.glyphEl.textContent = final; return; }
      let out = '';
      for (let i = 0; i < len; i++){
        if (final[i] === ' ' || final[i] === '·') { out += final[i]; continue; }
        if (frame > i * 2.2 + 16) out += final[i];
        else if (frame > i * 2.2) out += CH[(Math.random() * CH.length) | 0];
        else out += ' ';
      }
      this.glyphEl.textContent = out;
      if (++frame < dur && !REDUCE) requestAnimationFrame(step);
      else this.glyphEl.textContent = final;
    };
    REDUCE ? (this.glyphEl.textContent = final) : step();
  }

  _paint(v){
    const n = Math.min(100, Math.round(v));
    if (this.barEl) this.barEl.style.width = n + '%';
    if (this.pctEl) this.pctEl.textContent = String(n).padStart(3, '0');
  }

  // Abschied: auf 100 schnappen, Glitch, ausblenden, DOM entfernen, Scroll freigeben
  finish(){
    if (this._done || !this.el) { this._unlock(); return; }
    this._done = true;
    cancelAnimationFrame(this.raf);
    this.setTask('READY');
    this._paint(100);
    const remove = () => {
      this.el.remove();
      this._unlock();
      dispatchEvent(new Event('fh:loaded'));
    };
    if (REDUCE){
      this.el.classList.add('done');
      setTimeout(remove, 260);
      return;
    }
    this.el.classList.add('glitch');
    setTimeout(() => {
      this.el.classList.add('done');
      this.el.addEventListener('transitionend', remove, { once:true });
      setTimeout(remove, 900);                         // Sicherheitsnetz
    }, 360);
  }

  _unlock(){ document.documentElement.style.overflow = ''; }
}
