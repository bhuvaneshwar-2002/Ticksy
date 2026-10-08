# Daily Checklist

A personal checklist with daily, weekly and monthly items and a dashboard of charts.
Built with React + TypeScript (Vite). All data is stored in your browser with IndexedDB
(via Dexie), so it survives page refreshes and never leaves your device.

## Features

- **Checklist**: tabs for Daily, Weekly and Monthly items; step back to earlier periods to fill in what you missed.
- **Settings**: add, edit, reorder, pause or delete items and choose each item's frequency. Export and import a JSON backup.
- **Dashboard**: today / this week / this month progress, completion rate, completion over time, rate by frequency,
  a 16-week daily heatmap, and per-item streaks. Missed periods count as not done.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages.
One-time setup: in the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.

The site uses hash routing and a relative base path, so it works at `https://<user>.github.io/<repo>/` under any repo name.

## Your data

Data lives in this browser only (per device and per browser). Use **Settings → Backup** to export a file you can
import elsewhere. Clearing site data in the browser erases it.
