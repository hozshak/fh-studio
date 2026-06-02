# FH Studio – Website

Moderne One-Page-Website für **FH Studio** (Fynn Beckmann & Hozan Shaker) –
Webdesign & Entwicklung. Alles steckt in einer einzigen Datei: `index.html`
(HTML, CSS und JavaScript inline, keine Build-Tools nötig).

## Lokal ansehen

Einfach `index.html` im Browser öffnen – oder einen kleinen lokalen Server starten:

```powershell
python -m http.server 8000
```

Dann im Browser **http://localhost:8000** öffnen.

## Gemeinsam daran arbeiten (Fynn & Hozan)

Wir arbeiten mit **Git + GitHub**. Goldene Regel: **vor** dem Arbeiten holen,
**nach** dem Arbeiten hochladen.

```powershell
# 1. Neueste Version holen, BEVOR du anfängst
git pull

# ... Änderungen machen (z. B. mit Claude Code) ...

# 2. Änderungen sichern und hochladen
git add .
git commit -m "Kurz beschreiben, was du geändert hast"
git push
```

Tipp: Claude Code erledigt diese Git-Befehle auf Zuruf für euch.

### Damit ihr euch nicht in die Quere kommt
- Sprecht euch ab, wer woran arbeitet, oder
- arbeitet auf **eigenen Branches** und führt sie per Pull Request zusammen.

## Projektstruktur

```
fh-studio/
├─ index.html        ← die komplette Website
├─ README.md         ← diese Datei
├─ .gitignore        ← was NICHT hochgeladen wird
└─ .claude/
   └─ launch.json    ← Vorschau-Konfiguration für Claude Code
```
