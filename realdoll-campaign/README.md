# REAL DOLL — Talita kampanjsajt

Fristående, statisk one-page-sajt för PR-kampanjen "Talita presenterar The Real Doll".
Ingen build-process — öppna `index.html` direkt i webbläsaren, eller servera mappen
med valfri statisk webserver (t.ex. `python3 -m http.server`).

## Struktur

```
index.html      Allt innehåll och sektioner
css/style.css   All styling, variabler, animationer
js/main.js      Nav/scrollspy, smooth scroll, reveal-on-scroll, hotspots, parallax
assets/         Lägg riktiga foton/videor här (tom i dagsläget)
```

## Byta ut placeholder-figuren mot riktigt foto

Hero-figuren (`.figure` i `index.html`, styling i `.figure-part` m.fl. i `style.css`)
är just nu en stiliserad CSS-mannequin eftersom inga riktiga bilder fanns tillgängliga
när sajten byggdes. För att använda det riktiga fotot/rendern av dockan:

1. Lägg bildfilen i `assets/` (t.ex. `assets/hero.jpg`).
2. I `index.html`, ersätt `<div class="figure">…</div>`-blocket i `#hero` med en
   `<img>`-tagg som pekar på `assets/hero.jpg`.
3. Hotspot-punkterna (`.hotspot-face`, `.hotspot-belly`, `.hotspot-thigh`, `.hotspot-knee`)
   är positionerade med `top`/`left` i procent i `style.css` — justera dessa värden så
   att prickarna hamnar rätt på det riktiga fotot.

## Lägga till riktiga vittnesmålsvideor

Varje info-panel (`.info-panel-media` i `index.html`) har en platshållare med play-knapp.
Ersätt med en `<video controls poster="assets/poster-x.jpg"><source src="assets/video-x.mp4"></video>`
när verkligt material finns, eller koppla play-knappen till en modal/lightbox i `js/main.js`.

## Innehåll

Alla texter är baserade på det ursprungliga kampanjmaterialet (bifogade bilder).
Statistiken om Talita (antal boende, m.m.) är hållen generisk/beskrivande — komplettera
med verifierade siffror från Talita innan publicering.
