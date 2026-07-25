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
- Die Teigberechnung verwendet Baker's Math mit Mehl als 100%-Basis. Öl und Wasser werden millilitergenau näherungsweise wie Gramm behandelt.
