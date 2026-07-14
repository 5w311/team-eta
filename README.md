# Team ETA

Team-driver ETA calculator. Two models: dispatch's `miles ÷ 50`, and a tuned model
built from real cruise speed + fuel/swap stops. Resolves destination timezones from
a town name. **Runs 100% offline** — no server, no API, no signal required.

**Current version: v1.1.1**

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

### v1.1.1

**Tabs:** *Estimated ETA* (dispatch's fixed `miles ÷ 50`) and *Tuned Model ETA* (your real
pace). The ÷50 rate is hardcoded — it's always 50, so there's nothing to edit and the
settings card under that tab is gone.

**Swaps and fuel stops are now modeled separately.** They were lumped into one
mileage-based stop, which was wrong: fuel is on the odometer, but a driver swap is on
the clock.

- **Swaps run on a fixed schedule** — 06:00 and 18:00 by default — anchored to a chosen
  timezone (Eastern), so the schedule does *not* drift as the truck moves west. A run
  from 15:40 ET takes its swaps at 18:00 and 06:00 ET no matter what state you're in.
  Editable under *Tune to your truck → Swap schedule*.
- **Swap duration is its own setting** (~30–40 min), split out from the fuel stop
  (~15–20 min). Per preset: Conservative 40 min, Realistic 35, Push 30.
- Arrival is now solved iteratively, because the number of swaps depends on when you
  arrive, and when you arrive depends on how many swaps you took.
- Short runs that finish inside one shift now correctly take **zero** swaps.
- The run strip color-codes stops: **blue = swap**, **dark amber = fuel**,
  **slate = stretch**.

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

1. **Bump `CACHE` in `sw.js`.** It's a *build* marker, not a version number — change it on
   every single deploy, even if the app version stays the same. This is the one that forces
   installed devices to pull the new build. Skip it and nothing changes for anyone, and
   you'll waste an hour wondering why.
2. **Bump `PRESET_VERSION` in `index.html`** — but *only* if you changed the presets.
   Otherwise saved settings will override your new defaults.
3. **Update the version stamp** in the footer of `index.html`.

Then commit. Pages rebuilds on its own, and the app reloads itself on next launch.
