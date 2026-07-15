import { describe, it, expect } from "vitest";
import { solveEta, fromWall, PRESETS, RATE } from "../lib/logic.js";

const NY = "America/New_York";
const swap = { times: ["06:00", "18:00"], tz: NY };
const P = PRESETS.Realistic; // mph 65, fuel every 650 @ 20 min, swap 30 min, DOT 30 min @ 5h
// Depart mid-day-shift so a short run finishes before the next swap and before the DOT mark.
const startMs = fromWall("2026-06-15T08:00", NY).getTime();

describe("solveEta — quick model", () => {
  it("quick arrival is always miles / 50, independent of the tuned model", () => {
    const { quickEta, quickH } = solveEta({ miles: 500, p: P, swap, startMs });
    expect(quickH).toBe(500 / RATE);
    expect(quickEta.getTime()).toBe(startMs + (500 / RATE) * 3600e3);
  });
});

describe("solveEta — short run inside one shift, before the DOT mark", () => {
  const r = solveEta({ miles: 100, p: P, swap, startMs });
  it("takes zero swaps", () => expect(r.swaps).toHaveLength(0));
  it("takes zero fuel stops", () => expect(r.fuelStops).toBe(0));
  it("takes zero DOT breaks", () => expect(r.dots).toHaveLength(0));
  it("has no stopped time, so tuned == pure drive time", () => {
    expect(r.stopH).toBe(0);
    expect(r.totalH).toBeCloseTo(100 / P.mph, 10);
  });
});

describe("solveEta — fuel stop counting (odometer, off-by-one)", () => {
  const fuel = miles => solveEta({ miles, p: P, swap, startMs }).fuelStops;
  it("needs no fuel stop when miles == fuelEvery", () => expect(fuel(650)).toBe(0));
  it("needs one fuel stop just past one tank", () => expect(fuel(651)).toBe(1));
  it("needs one fuel stop up to two tanks", () => expect(fuel(1300)).toBe(1));
  it("needs two fuel stops just past two tanks", () => expect(fuel(1301)).toBe(2));
});

describe("solveEta — a long run with swaps and DOT breaks", () => {
  const r = solveEta({ miles: 1300, p: P, swap, startMs });
  it("takes at least one swap", () => expect(r.swaps.length).toBeGreaterThanOrEqual(1));
  it("takes at least one DOT break", () => expect(r.dots.length).toBeGreaterThanOrEqual(1));
  it("converges: tuned time exceeds raw drive time and is finite", () => {
    expect(r.totalH).toBeGreaterThan(r.driveH);
    expect(Number.isFinite(r.totalH)).toBe(true);
  });
  it("stopped time equals the sum of the modeled stop minutes", () => {
    const mins = r.swaps.length * P.swapMin + r.fuelStops * P.fuelMin + r.dots.length * r.dotMin;
    expect(r.stopH).toBeCloseTo(mins / 60, 10);
  });
});

describe("solveEta — guards", () => {
  it("mph = 0 falls back to 1 mph rather than producing Infinity", () => {
    const r = solveEta({ miles: 50, p: { ...P, mph: 0 }, swap, startMs });
    expect(Number.isFinite(r.driveH)).toBe(true);
    expect(r.driveH).toBe(50); // 50 mi / 1 mph
  });
  it("fuelEvery = 0 falls back and yields no fuel stops on a short run", () => {
    const r = solveEta({ miles: 100, p: { ...P, fuelEvery: 0 }, swap, startMs });
    expect(r.fuelStops).toBe(0);
  });
  it("DOT duration is clamped to the 30-min floor inside the solve", () => {
    const r = solveEta({ miles: 1300, p: { ...P, dotMin: 10 }, swap, startMs });
    expect(r.dotMin).toBe(30);
  });
});
