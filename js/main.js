// =============================================================================
//  FH Studio – Entry / Orchestrator (buildless ES-Module, kein Build-Step)
//  Igloo-Pattern, eigenständig umgesetzt:
//    Loader zeigen  ->  Interface verdrahten  ->  Schriften + 3D bereit  ->  Loader weicht.
//  Reihenfolge ist bewusst dynamisch importiert, damit alles UNTER Loader-Kontrolle lädt.
//  Robust: Der Loader weicht IMMER (try/finally + Caps) – nie ein hängender Ladescreen.
// =============================================================================
import { Loader } from './loader.js';

const loader = new Loader();
loader.start();

// erstes "Wahrzeichen sichtbar"-Signal aus crystal-city.js
const sceneReady = new Promise(res => addEventListener('fh:scene-ready', res, { once:true }));
const cap = ms => new Promise(res => setTimeout(res, ms));
const quiet = p => p.catch(err => console.warn('[FH] Modul-Fehler:', err));

(async () => {
  try {
    // 1) Interface — Side-Effect-Module verdrahten alle Interaktionen (laufen hinter dem Loader)
    loader.setTask('Interface');
    await Promise.all([
      quiet(import('./ui.js')),
      quiet(import('./hero-fx.js')),
      quiet(import('./journey.js')),
      quiet(import('./demos.js')),
    ]);

    // 2) Schriften — verhindert Font-Flash, sobald die Seite erscheint
    loader.setTask('Fonts');
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, cap(1500)]);

    // 3) 3D-Reise — Modelle laden und auf erstes sichtbares Wahrzeichen warten (sonst Cap)
    loader.setTask('Scene');
    quiet(import('./crystal-city.js'));
    await Promise.race([sceneReady, cap(4200)]);
  } catch (err) {
    console.warn('[FH] Boot-Fehler:', err);
  } finally {
    loader.finish();   // Bühne frei – direkt (NICHT via rAF: läuft auch in Hintergrund-Tabs, wo rAF pausiert)
  }
})();
