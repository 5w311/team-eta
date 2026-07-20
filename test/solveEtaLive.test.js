import { describe, it, expect } from "vitest";
import { solveEta, solveEtaLive, overlayStops, liveFresh, LIVE_MAX_AGE_MS, fromWall, PRESETS } from "../lib/logic.js";

const NY = "America/New_York";
const swap = { times: ["06:00", "18:00"], tz: NY };
const P = PRESETS.Realistic; // mph 65, fuel every 650 @ 20 min, swap 30 min, DOT 30 min @ 5h
const startMs = fromWall("2026-06-15T08:00", NY).getTime();

const MI = 1609.344; // metres per mile

describe("solveEtaLive — uses the API drive time, not miles/mph", () => {
  it("drive hours come straight from driveSeconds, ignoring the preset mph", () => {
    // 6 h of driving per HERE, over a distance the tuned model would time very differently.
    const r = solveEtaLive({ driveSeconds: 6 * 3600, meters: 400 * MI, p: P, swap, startMs });
    expect(r.driveH).toBeCloseTo(6, 10);           // 400 mi / 65 mph would be ~6.15 h — not used
    expect(r.miles).toBeCloseTo(400, 6);
  });

  it("a slower (traffic-heavy) quote arrives later than a clean one over the same distance", () => {
    const clean = solveEtaLive({ driveSeconds: 6 * 3600, meters: 400 * MI, p: P, swap, startMs });
    const heavy = solveEtaLive({ driveSeconds: 7.5 * 3600, meters: 400 * MI, p: P, swap, startMs });
    expect(heavy.liveEta.getTime()).toBeGreaterThan(clean.liveEta.getTime());
  });

  it("metres convert to miles for the readout and fuel counting", () => {
    const r = solveEtaLive({ driveSeconds: 2 * 3600, meters: 651 * MI, p: P, swap, startMs });
    expect(r.miles).toBeCloseTo(651, 6);
    expect(r.fuelStops).toBe(1); // just past one 650-mile tank
  });

  it("guards against garbage input instead of producing NaN", () => {
    const r = solveEtaLive({ driveSeconds: undefined, meters: undefined, p: P, swap, startMs });
    expect(r.driveH).toBe(0);
    expect(r.miles).toBe(0);
    expect(Number.isFinite(r.liveEta.getTime())).toBe(true);
  });
});

describe("the overlay is identical for both lines", () => {
  // If the live drive time happens to equal the tuned drive time for the same distance,
  // the two solvers must agree to the millisecond — proving they share one overlay and the
  // only difference is the source of the raw drive time.
  const miles = 1300;
  const tuned = solveEta({ miles, p: P, swap, startMs });
  const live = solveEtaLive({ driveSeconds: tuned.driveH * 3600, meters: miles * MI, p: P, swap, startMs });

  it("same swaps, DOT breaks, and fuel stops", () => {
    expect(live.swaps.map(d => d.getTime())).toEqual(tuned.swaps.map(d => d.getTime()));
    expect(live.dots.map(d => d.getTime())).toEqual(tuned.dots.map(d => d.getTime()));
    expect(live.fuelStops).toBe(tuned.fuelStops);
  });
  it("same total time and same arrival instant", () => {
    expect(live.totalH).toBeCloseTo(tuned.totalH, 10);
    expect(live.liveEta.getTime()).toBe(tuned.tunedEta.getTime());
  });
  it("both routes go through overlayStops with the same shape", () => {
    const core = overlayStops({ driveH: tuned.driveH, miles, p: P, swap, startMs });
    expect(core.totalH).toBeCloseTo(tuned.totalH, 10);
    expect(core.totalH).toBeCloseTo(live.totalH, 10);
  });
});

describe("liveFresh — when to trust a cached live quote", () => {
  const t0 = 1_000_000_000_000;
  it("a just-fetched quote is fresh", () => expect(liveFresh(t0, t0)).toBe(true));
  it("fresh right up to the max age", () => expect(liveFresh(t0, t0 + LIVE_MAX_AGE_MS)).toBe(true));
  it("stale one ms past the max age", () => expect(liveFresh(t0, t0 + LIVE_MAX_AGE_MS + 1)).toBe(false));
  it("never fetched is not fresh", () => expect(liveFresh(null, t0)).toBe(false));
  it("a clock that jumped backwards is not treated as fresh", () => expect(liveFresh(t0, t0 - 1000)).toBe(false));
});
