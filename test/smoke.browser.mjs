// End-to-end smoke test: serve the app over HTTP (ES modules need it) and drive it
// in a real browser. Catches the integration the Vitest unit suite can't — that
// index.html actually loads ./lib/logic.js and renders a computed arrival.
//
//   npm run test:browser
//
// Not a *.test.js file, so `vitest run` ignores it; it runs on its own script.
// Browser binary: PLAYWRIGHT_EXECUTABLE_PATH overrides; otherwise Playwright's
// managed download is used (what CI installs via `playwright install chromium`).
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html":"text/html", ".js":"text/javascript",
  ".webmanifest":"application/manifest+json", ".png":"image/png" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});

const fail = msg => { console.error("SMOKE FAIL:", msg); process.exitCode = 1; };

await new Promise(r => server.listen(0, r));
const port = server.address().port;

const launch = {};
if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) launch.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = await chromium.launch(launch);
const page = await browser.newPage();

const errors = [];
// Ignore the browser's automatic /favicon.ico probe — the app never references it.
page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("response", r => {
  if (r.status() >= 400 && !r.url().endsWith("/favicon.ico"))
    errors.push(`http ${r.status()} ${r.url()}`);
});

try {
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });

  // The module must have loaded and be importable in-page.
  const moduleOk = await page.evaluate(async () => {
    const m = await import("./lib/logic.js");
    return typeof m.solveEta === "function" && typeof m.resolvePlace === "function";
  });
  if (!moduleOk) fail("./lib/logic.js did not load as a module in the page");

  // Opening state must be the clean empty state (no phantom 1200-mile calc): miles empty,
  // placeholder readout, CLEAR inert — identical to the post-CLEAR state asserted below.
  if ((await page.inputValue("#miles")) !== "")
    fail("miles should start empty on first load");
  if (((await page.textContent("#etaClock"))?.trim()) !== "--:--")
    fail("readout should start at the placeholder on first load");
  if (!(await page.isDisabled("#etaClear")))
    fail("CLEAR should start inert on first load");

  // No-destination arrival label is the simplified form — no "your clock", no tz tag.
  const label = (await page.textContent("#etaLabel"))?.trim();
  if (label !== "Arrival · set a destination below")
    fail(`unexpected no-destination label: ${JSON.stringify(label)}`);

  // Drive the ETA tool and expect a real arrival clock, not the placeholder.
  await page.fill("#miles", "1300");
  await page.fill("#depart", "2026-06-15T08:00");
  await page.dispatchEvent("#miles", "input");
  await page.dispatchEvent("#depart", "input");
  await page.waitForTimeout(150);
  const etaClock = (await page.textContent("#etaClock"))?.trim();
  if (!/^\d{2}:\d{2}$/.test(etaClock || "") || etaClock === "--:--")
    fail(`expected a computed arrival clock, got ${JSON.stringify(etaClock)}`);

  // The "who's driving on arrival" line: hidden on Estimated (default), shown on Tuned.
  if (await page.isVisible("#etaShift"))
    fail("shift line should be hidden on the Estimated sub-tab");
  await page.click("#tabTuned");
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#etaShift")))
    fail("shift line should be visible on the Tuned sub-tab");
  const shiftText = (await page.textContent("#etaShift"))?.trim();
  if (!/^(day|night) shift driving$/.test(shiftText || ""))
    fail(`expected a shift readout, got ${JSON.stringify(shiftText)}`);
  await page.click("#tabQuick");
  await page.waitForTimeout(100);
  if (await page.isVisible("#etaShift"))
    fail("shift line should hide again when switching back to Estimated");

  // CLEAR button: enabled once there's a load, two-tap arm/confirm empties the load
  // and returns the readout to its placeholder.
  if (await page.isDisabled("#etaClear"))
    fail("CLEAR should be enabled while a load is entered");
  await page.click("#etaClear");                 // arm
  await page.click("#etaClear");                 // confirm
  await page.waitForTimeout(100);
  const milesAfter = await page.inputValue("#miles");
  const clockAfter = (await page.textContent("#etaClock"))?.trim();
  if (milesAfter !== "") fail(`CLEAR should empty miles, got ${JSON.stringify(milesAfter)}`);
  if (clockAfter !== "--:--") fail(`CLEAR should reset the readout, got ${JSON.stringify(clockAfter)}`);
  if (!(await page.isDisabled("#etaClear")))
    fail("CLEAR should be inert again once the load is empty");

  // 34 Reset tab: choosing a date must NOT start the reset (picker-lockout regression).
  await page.click("#tabReset");
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#rsInputCard")))
    fail("shutdown input should be visible in the empty reset state");

  // A future shutdown (planned ahead), so committing it starts a live reset rather than
  // tripping the auto-clear that a long-past date would.
  const soon = new Date(Date.now() + 2 * 24 * 3600e3);
  const pad = n => String(n).padStart(2, "0");
  const wall = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T08:00`;

  // Setting the field value fires input/change — as the native picker does on open/scroll.
  // The input must stay up: a reset starts only on an explicit commit.
  await page.fill("#shut", wall);
  await page.dispatchEvent("#shut", "change");
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#rsInputCard")))
    fail("choosing a date must not start the reset or hide the input");

  // Commit the chosen date with SET — now the reset starts and the input collapses.
  await page.click("#rsSetShut");
  await page.waitForTimeout(100);
  if (await page.isVisible("#rsInputCard"))
    fail("shutdown input should collapse once a chosen date is committed with SET");
  if (((await page.textContent("#rsClock"))?.trim()) === "--:--")
    fail("committing a shutdown should show the computed legal time");
  await page.click("#rsClear");                  // arm
  await page.click("#rsClear");                  // confirm CLEAR TIMER
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#rsInputCard")))
    fail("shutdown input should return after CLEAR TIMER");

  // NOW is unchanged: it starts a reset from now and collapses the input.
  await page.click("#rsNow");
  await page.waitForTimeout(100);
  if (await page.isVisible("#rsInputCard"))
    fail("NOW should start a reset and hide the input");
  await page.click("#rsClear");
  await page.click("#rsClear");
  await page.waitForTimeout(100);

  // Auto-clear edge case: a reset that completed over 10 min ago must open in the clean
  // empty state (never a stale "Complete" screen or a negative countdown). Seed a stale
  // completed reset into storage, reload, and confirm the app clears it on open.
  await page.evaluate(() => {
    const shutMs = Date.now() - 35 * 3600e3;     // finished ~1h ago, past the 10-min window
    localStorage.setItem("milespost.reset",
      JSON.stringify({ shutMs, tz: "America/New_York", tzName: "Test" }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.click("#tabReset");
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#rsInputCard")))
    fail("a long-completed reset should auto-clear to the empty state on open");
  if (((await page.textContent("#rsClock"))?.trim()) !== "--:--")
    fail("auto-cleared reset should show the placeholder readout, not a stale time");

  if (errors.length) fail("page errors: " + JSON.stringify(errors, null, 2));

  // ---- LIVE ETA wiring: mocked HERE fetch + mocked geolocation. No real key, no network.
  // Happy path: GPS ok, geocode + truck route answer -> LIVE line renders with the arrival.
  const livePage = await browser.newPage();
  const liveErrors = [];
  livePage.on("pageerror", e => liveErrors.push("pageerror: " + e.message));
  await livePage.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: ok => ok({ coords: { latitude: 41.8781, longitude: -87.6298 } })
    }});
    const realFetch = window.fetch.bind(window);
    window.__hereUrls = [];
    window.fetch = (url, ...rest) => {
      const u = String(url);
      if (u.includes("hereapi.com")) window.__hereUrls.push(u);
      if (u.includes("geocode.search.hereapi.com"))
        return Promise.resolve(new Response(JSON.stringify(
          { items: [{ position: { lat: 36.1627, lng: -86.7816 } }] })));
      if (u.includes("router.hereapi.com"))
        return Promise.resolve(new Response(JSON.stringify(
          // 6h drive, 20min of it traffic, 400 mi (643,738 m)
          { routes: [{ sections: [{ summary: { duration: 21600, baseDuration: 20400, length: 643738 } }] }] })));
      return realFetch(url, ...rest);
    };
  });
  await livePage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await livePage.fill("#miles", "400");
  await livePage.dispatchEvent("#miles", "input");
  await livePage.fill("#destIn", "Nashville TN");
  await livePage.click("#destSet");
  await livePage.click("#tabTuned");
  await livePage.click("#liveBtn");
  await livePage.waitForTimeout(300);
  if (!(await livePage.isVisible("#liveLine")))
    fail("LIVE line should render after a successful mocked HERE fetch");
  const liveText = (await livePage.textContent("#liveLine"))?.trim() || "";
  if (!/^LIVE · \d{2}:\d{2}/.test(liveText))
    fail(`LIVE line should lead with an arrival clock, got ${JSON.stringify(liveText)}`);
  if (!liveText.includes("400 mi")) fail(`LIVE line should show the route miles, got ${JSON.stringify(liveText)}`);
  if (!liveText.includes("traffic +20m")) fail(`LIVE line should show the traffic cost, got ${JSON.stringify(liveText)}`);
  // Route params sanity: the request must be truck mode with the vehicle[...] dimensions —
  // never a silent fall-back to car routing.
  const routeUrl = await livePage.evaluate(() =>
    (window.__hereUrls || []).find(u => u.includes("router.hereapi.com")) || "");
  if (!routeUrl.includes("transportMode=truck")) fail("routing request must use transportMode=truck");
  for (const p of ["vehicle%5BgrossWeight%5D=36287", "vehicle%5Bheight%5D=412",
                   "vehicle%5BaxleCount%5D=5", "vehicle%5BtrailerCount%5D=1"])
    if (!routeUrl.includes(p)) fail(`routing request missing truck param ${decodeURIComponent(p)}`);
  if (!routeUrl.includes("departureTime=now")) fail("routing request must be traffic-aware (departureTime=now)");
  await livePage.click("#tabQuick");
  await livePage.waitForTimeout(100);
  if (await livePage.isVisible("#liveLine")) fail("LIVE line must not show on the Estimated tab");
  if (liveErrors.length) fail("live page errors: " + JSON.stringify(liveErrors, null, 2));
  await livePage.close();

  // Denied path: GPS permission refused -> LIVE line stays hidden, tuned readout intact,
  // unobtrusive note shown. The UI must never block or error.
  const deniedPage = await browser.newPage();
  const deniedErrors = [];
  deniedPage.on("pageerror", e => deniedErrors.push("pageerror: " + e.message));
  await deniedPage.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: (_ok, err) => err({ code: 1, message: "denied" })
    }});
  });
  await deniedPage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await deniedPage.fill("#miles", "400");
  await deniedPage.dispatchEvent("#miles", "input");
  await deniedPage.fill("#destIn", "Nashville TN");
  await deniedPage.click("#destSet");
  await deniedPage.click("#tabTuned");
  await deniedPage.click("#liveBtn");
  await deniedPage.waitForTimeout(300);
  if (await deniedPage.isVisible("#liveLine"))
    fail("LIVE line must stay hidden when GPS is denied");
  const noteText = (await deniedPage.textContent("#liveNote"))?.trim() || "";
  if (!/live unavailable/.test(noteText))
    fail(`denied path should show the unobtrusive fallback note, got ${JSON.stringify(noteText)}`);
  const tunedClock = (await deniedPage.textContent("#etaClock"))?.trim();
  if (!/^\d{2}:\d{2}$/.test(tunedClock || "") || tunedClock === "--:--")
    fail("tuned readout must stay intact when live is unavailable");
  if (deniedErrors.length) fail("denied page errors: " + JSON.stringify(deniedErrors, null, 2));
  await deniedPage.close();

  if (!process.exitCode)
    console.log(`SMOKE OK: arrival ${etaClock}, shift "${shiftText}" (Tuned only), CLEAR empties the load, reset picker stays up until SET/NOW, LIVE renders from mocked HERE + hides on GPS denial, module loaded, no page errors`);
} finally {
  await browser.close();
  server.close();
}
