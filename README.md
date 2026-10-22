# Pizza HQ 🍕

Mobile-first Pizza-Teig-Rechner, Gärplaner und persönliche Kreationen-Bibliothek im Fumetto-Stil. Die App ist eine Next.js-App mit App Router und wird auf Vercel direkt mit Neon Postgres betrieben.

## Lokal starten

```bash
npm install
cp .env.example .env.local
# DATABASE_URL in .env.local eintragen
npm run dev
```

Ohne `DATABASE_URL` ist der Rechner voll nutzbar; die Bibliothek und Presets zeigen bewusst einen Offline-Status und werden nicht gespeichert.

## Neon einrichten

1. In [Neon](https://neon.tech) ein neues Postgres-Projekt anlegen.
2. Den Connection String kopieren und lokal in `.env.local` als `DATABASE_URL` eintragen.
3. Die Migration ausführen, z. B. im Neon SQL Editor den Inhalt von `migrations/0001_initial.sql` einfügen und ausführen.

Die Tabellen heißen `pizza_kreationen` und `teig_presets`. Alle API-Routen greifen ausschließlich über die Umgebungsvariable zu:

- `GET/POST/PUT/DELETE /api/kreationen`
- `GET/POST/PUT/DELETE /api/presets`

## Vercel Deploy

1. Repo zu GitHub pushen oder im Projektordner `vercel deploy` ausführen.
2. In Vercel unter **Settings → Environment Variables** `DATABASE_URL` mit dem Neon Connection String setzen.
3. Deploy erneut auslösen. Es sind keine weiteren Server-Konfigurationen nötig.

## PWA / eigenes Icon

`public/manifest.json`, die Apple-Web-App-Metadaten und Platzhalter-Icons sind bereits vorhanden. Sobald dein Comic-Icon vorliegt, ersetze `public/icon.png` (512 × 512) sowie `public/apple-touch-icon.png` (180 × 180); die Pfade sind bereits korrekt hinterlegt.

Auf dem iPhone in Safari öffnen → **Teilen → Zum Home-Bildschirm**. Desktop-Browser bieten die Installation über ihr jeweiliges Install-Symbol an.

## Hinweise

- Fotos werden derzeit als Base64 direkt in Neon gespeichert. Für große oder viele Fotos empfiehlt sich später ein Wechsel auf Vercel Blob; das Schema-Feld `photo` ist dafür bereits vorgesehen.
- Die Teigberechnung verwendet Baker's Math mit Mehl als 100%-Basis. Öl wird in Gramm ausgewiesen; Wasser in Millilitern entspricht näherungsweise demselben Gewicht in Gramm.


## Teig planen und begleiten

Backdatum und Uhrzeit werden über einen eigenen Kalender mit Schnellwahl sowie eine Stunden-/Minutenauswahl gesetzt. Beliebige Minuten sind direkt als HH:MM eingebbar. Nach Wahl eines Backtermins bleibt „Starten“ in einer fixierten unteren Leiste erreichbar. Zusätzlicher Platz am Seitenende und die Berücksichtigung der Safe Area verhindern verdeckte letzte Inhalte. Während der Kalender-/Zeitauswahl wird die Leiste ausgeblendet.

- Formen: „Empfohlen“ wählt für neapolitanischen Direktteig bei Raumtemperatur frühes Formen. Die warme Stockgare wird zur Stückgare bei unveränderter Gesamtdauer. Nach dem letzten Falten bleiben 30 Minuten Ruhe. Bei kalter Führung ist frühes Formen mit kalter Stückgare und separatem Akklimatisieren wählbar; späteres Formen bleibt verfügbar. Presets speichern diese Wahl, alte Presets und laufende Teige behalten ihren bisherigen Ablauf.
- Zwei Profile: neapolitanisch sowie dünn und knusprig mit 3–5 Minuten Backzeit; Vollkornanteil und Wasser bleiben anpassbar.
- Direktteig oder Poolish sind unabhängig von Raumtemperatur oder kalter Führung wählbar. Die Knöpfe „24 h“ und „48 h“ bezeichnen die kalte Gare und benennen je nach Formzeitpunkt Stockgare oder Stückgare. Vorbereitung, Poolish und warme Stückgare kommen hinzu.
- Der Rückwärtsplan enthält Mischen, volle Ruheintervalle vor und zwischen 0–3 Faltzyklen, Stockgare, Teiglinge, Vorheizen und Backen. Stunden sind echte verstrichene Stunden, auch über die Zeitumstellung.
- Nach dem Start wechselt die App in „Mein Teig läuft“. Der segmentierte Ablaufbalken gibt jeder Phase gleich viel Platz: Bestätigte Handgriffe schließen ein Segment ab, die Wartezeit bewegt das aktuelle Segment kontinuierlich weiter. Ohne Bestätigung bleibt ein fälliges Segment bei höchstens 95 %. Der Countdown zeigt Tage und HH:MM:SS ohne Neuladen; beim Zurückkehren wird die Uhrzeit neu abgeglichen. Der Balken beschreibt den Ablauf, nicht den biologischen Reifegrad. Ausgeführte Schritte und Reifeprüfungen werden mit Zeitstempel gespeichert.
- Ein später Handgriff verschiebt die verbleibenden Ruhezeiten. Der ursprünglich gewünschte Backtermin bleibt separat sichtbar. Ein früher Start vor einer kalten Stockgare kann den zusätzlichen Vorlauf in die kalte Phase legen.
- Der laufende Teig ist ein eingefrorener Stand von Rezept und Ablauf im lokalen Browser. Ein neuer Planentwurf verändert ihn nicht. Presets speichern Rezept und Führung über die bestehende Neon-API; ältere reine Rezept-Presets bleiben ladbar.

### Berechnungsgrundlage

`doughMath.ts` hält Mengenbilanz, Wasserorientierung und Hefeschätzung getrennt von der Oberfläche. Poolish besteht aus gleich schweren Anteilen hellem Mehl und Wasser; Vollkorn, Salz und Öl werden im Hauptteig ergänzt. Alle Anteile werden von den Gesamtmengen abgezogen.

Die Hefewerte sind Startwerte der App. Als Bezug für die kalte Rezeptur dient [Oonis Cold-Proof Pizza Dough](https://ooni.com/blogs/recipes/cold-prove-pizza-dough) (1,4 g Instanthefe auf 607 g Mehl). Für den Poolish dient die [ASB-Tabelle](https://asbe.org/article/poolish/) als zeitabhängiger Bezug; Frischhefe wird näherungsweise durch drei geteilt. Interpolation und Temperaturkorrekturen sind App-Schätzungen und keine validierte Vorhersage des Reifegrades. Mehl, Kühlverlauf und tatsächliche Teigtemperatur müssen beim Backen beobachtet werden.

### Prüfen

```bash
npm test
npm run lint
npm run build
```

Die gezielten Tests prüfen Mengenbilanz mit Vollkorn/Poolish, echte Garstunden über die Zeitumstellung sowie frühe und verspätete Handgriffe bei unverändertem Zieltermin. Build und Entwicklungsserver nacheinander ausführen, da beide `.next` verwenden.
