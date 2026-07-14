# MilesPost

Team-driver tools. Two questions, two tabs:

**ETA** — when do I get there? Dispatch's `miles ÷ 50`, and a tuned model built from your
real cruise speed, fuel stops, and the fixed-clock driver swap.

**34 RESET** — when am I legal? Set the moment you shut down, get the moment your 70 comes
back, and hand a real alarm to your phone's Calendar.

Resolves timezones from a town name. Day and night modes. **Runs 100% offline** — no server,
no API, no signal required.

**Current version: v2.0.1**

## Files

| File | What it is |
|---|---|
| `index.html` | The entire app — markup, styles, logic. No dependencies. |
| `sw.js` | Service worker. Caches everything so it works with zero bars. |
| `manifest.webmanifest` | Makes it installable to the home screen. |
| `icon-192.png` `icon-512.png` `apple-touch-icon.png` | App icons. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is. Don't delete it. |

## Install it to the home screen

**iPhone:** open the link in Safari → Share → *Add to Home Screen*.
**Android:** open in Chrome → menu → *Install app* / *Add to Home Screen*.

Own icon, fullscreen, no browser bars, and it works in a dead zone because the service
worker cached it on first load.

## Notes

- Settings persist per-device via `localStorage`. Because storage is tied to the domain and
  not the folder, the rename from Team ETA carried everything over — tuning, swap schedule,
  theme.
- Timezone resolution is a lookup table covering all 50 states, with per-city handling for
  the split states (TX, TN, KY, FL, IN, ND, SD, NE, KS, ID, OR, MI). Unknown towns fall back
  to a manual zone picker.
- **Swaps run on a fixed clock**, not on mileage — 06:00 / 18:00 Eastern by default, anchored
  to a zone so the schedule doesn't drift west as the truck moves. Fuel is on the odometer.
  They're separate stops because they're separate things.
- The 34 counts **34 real elapsed hours**, so it stays correct across a DST change. Naive
  wall-clock math would cost you an hour in the fall and hand you an illegal 33 in the spring.
- No web app can fire a notification while it's closed. That's why the reset hands the alarm
  to your Calendar instead of pretending to have a timer.
- **HOS is not modeled.** No 10-hour reset is built into the ETA — the math assumes the truck
  keeps rolling through driver swaps. The 11/14 and the 70-hour cycle are still on you.

## Version history

### v2.0.1

- The 34-reset calendar event is now a single point in time (zero-length) instead of a
  15-minute block. The two alarms — 30 minutes out and the moment itself — are unchanged;
  they were always the part that pings you. The 15-minute span was only there to give the
  event a visible length, which isn't needed.

### v2.0 — MilesPost

Renamed from Team ETA. The old name only described half of what the app does.

- **34-hour reset timer**, merged in as a second tab. Shutdown time (now, or planned ahead),
  live countdown, one bar per hour, and a calendar handoff with two alarms — 30 minutes out
  and the moment itself.
- **Day / night modes.** Night is the Cascadia dash. Day is a cool ground with a darkened
  amber (`#A8490A`) that clears 4.5:1 contrast in glare — raw amber on white is 1.8:1 and
  vanishes in exactly the sunlight you'd need it in. Follows your phone, then remembers your
  choice.
- Background is painted on a layer the app owns, so a host page can't force it transparent
  and show its own dark canvas through.
- Nav restructured: **ETA** and **34 RESET** are two tools; *Estimated* and *Tuned Model* are
  two views of one calculation, so they nest under ETA.
- New icon and identity.

### v1.1.1

- **Tabs:** *Estimated ETA* (fixed `miles ÷ 50`) and *Tuned Model ETA*. The ÷50 is hardcoded.
- **Swaps and fuel stops modeled separately.** They were lumped into one mileage-based stop,
  which was wrong: fuel is on the odometer, a swap is on the clock. Arrival is now solved
  iteratively, because the number of swaps depends on when you arrive and when you arrive
  depends on how many swaps you took.
- Short runs that finish inside one shift correctly take **zero** swaps.
- Run strip colour-codes stops: **blue = swap**, **dark amber = fuel**, **slate = stretch**.

### v1.1

Presets retuned to real team numbers:

| Preset | Cruise | Fuel | Swap | Stretch |
|---|---|---|---|---|
| Conservative | 64 mph | every 500 mi, 15 min | 40 min | every 4 h, 20 min |
| Realistic | 65 mph | every 650 mi, 15 min | 35 min | every 5 h, 20 min |
| Push | 68 mph | every 800 mi, 20 min | 30 min | every 6 h, 15 min |

- Saved settings are versioned (`PRESET_VERSION`), so new defaults actually reach phones that
  already had the app instead of being overridden by `localStorage`.
- App auto-reloads when a new version is deployed.

### v1.0

Initial release. Two models, offline timezone resolver, appointment cushion, installable PWA.

## Updating the app

Three things have to happen or the update won't reach phones that already installed it:

1. **Bump `CACHE` in `sw.js`.** It's a *build* marker, not a version number — change it on
   every single deploy, even if the app version stays the same. Skip it and nothing changes
   for anyone, and you'll waste an hour wondering why.
2. **Bump `PRESET_VERSION` in `index.html`** — but *only* if you changed the presets.
   Otherwise saved settings will override your new defaults.
3. **Update the version stamp** at the bottom of `index.html`.

Then commit. Pages rebuilds on its own, and the app reloads itself on next launch.
