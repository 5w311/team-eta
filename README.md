# Team ETA

Team-driver ETA calculator. Two models: dispatch's `miles ÷ 50`, and a tuned model
built from real cruise speed + fuel/swap stops. Resolves destination timezones from
a town name. **Runs 100% offline** — no server, no API, no signal required.

**Current version: v1.1**

## Files

| File | What it is |
|---|---|
| `index.html` | The entire app — markup, styles, logic. No dependencies. |
| `sw.js` | Service worker. Caches everything so it works with zero bars. |
| `manifest.webmanifest` | Makes it installable to the home screen. |
| `icon-192.png` `icon-512.png` `apple-touch-icon.png` | App icons. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. Don't delete it — Pages won't build without a push, and this file is what got the first build to fire. |

## Install it to the home screen

**iPhone:** open the link in Safari → Share → *Add to Home Screen*.
**Android:** open in Chrome → menu → *Install app* / *Add to Home Screen*.

It gets its own icon, opens fullscreen with no browser bars, and works in a dead zone
because the service worker cached it on first load.

## Notes

- Settings (cruise speed, stop habits, rate, mode) persist per-device via `localStorage`.
- Timezone resolution is a lookup table covering all 50 states, with per-city handling
  for the split states (TX, TN, KY, FL, IN, ND, SD, NE, KS, ID, OR, MI). Unknown towns
  fall back to a manual zone picker.
- "Rolling out" defaults to your phone's current timezone, which updates on its own as
  you cross zone lines.
- HOS is **not** modeled. No 10-hour reset is built in — the math assumes the truck keeps
  moving through driver swaps. The 11/14 and the 70-hour cycle are still on you.

## Version history

### v1.1

Preset defaults retuned to real team-driving numbers:

| Preset | Cruise | Fuel / swap | Stretch | Effective |
|---|---|---|---|---|
| Conservative | 64 mph | every 500 mi, 15 min | every 4 h, 20 min | ~60 mph |
| Realistic | 65 mph | every 650 mi, 15 min | every 5 h, 20 min | ~62 mph |
| Push | 68 mph | every 800 mi, 20 min | every 6 h, 15 min | ~66 mph |

Also in this release:

- **Saved settings are versioned** (`PRESET_VERSION` in `index.html`). Without this, a
  phone that already had the app would keep restoring the *old* presets from
  `localStorage` and silently override the new defaults. Driver-specific settings
  (mode, company rate) survive the upgrade; preset tuning resets.
- **Auto-update.** When a new version is deployed, the app reloads itself on the next
  launch instead of needing two.
- Version stamp in the footer, so you can tell at a glance which build a phone is running.
- Service worker cache bumped to `team-eta-v1.1`.

### v1.0

Initial release. Two models (÷50 and tuned), offline timezone resolver, appointment
cushion, installable PWA.

## Updating the app

Three things have to happen or the update won't reach phones that already installed it:

1. **Bump `CACHE` in `sw.js`** (`team-eta-v1.1` → `team-eta-v1.2`). This is the one that
   forces installed devices to pull the new build. Skip it and nothing changes for anyone.
2. **Bump `PRESET_VERSION` in `index.html`** — but *only* if you changed the presets.
   Otherwise saved settings will override your new defaults.
3. **Update the version stamp** in the footer of `index.html`.

Then commit. Pages rebuilds on its own, and the app reloads itself on next launch.
