# Team ETA

Team-driver ETA calculator. Two models: dispatch's `miles ÷ 50`, and a tuned model
built from real cruise speed + fuel/swap stops. Resolves destination timezones from
a town name. **Runs 100% offline** — no server, no API, no signal required.

## Files

| File | What it is |
|---|---|
| `index.html` | The entire app — markup, styles, logic. No dependencies. |
| `sw.js` | Service worker. Caches everything so it works with zero bars. |
| `manifest.webmanifest` | Makes it installable to the home screen. |
| `icon-192.png` `icon-512.png` `apple-touch-icon.png` | App icons. |

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
