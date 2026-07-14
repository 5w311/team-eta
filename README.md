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

## Deploy on GitHub Pages (free, permanent, yours)

1. Create a new public repo — call it `team-eta`.
2. Upload all six files to the repo root (drag and drop works in the browser).
3. **Settings → Pages → Source: Deploy from a branch → `main` / `root` → Save.**
4. Wait ~60 seconds. Your app is live at:
   `https://<your-username>.github.io/team-eta/`

That URL is permanent and public. Text it to your co-driver. To update the app later,
edit `index.html` and push — the URL serves the new version automatically.

> Pages must be **public** for a free account's site to be reachable. There's no
> account or login needed to *use* the app, so anyone with the link can just open it.

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

## Where to take it next

- Two driver clocks (11/14 + 70-hour recap) tracked separately — the real gap on
  coast-to-coast runs, where the truck can make it but a driver's cycle can't.
- Fuel stop planner, trip log, settlement/pay tracker.
- If you ever want it in the App Store, wrap this exact HTML with
  [Capacitor](https://capacitorjs.com) — it becomes a native shell around the same code.
