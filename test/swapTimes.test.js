import { describe, it, expect } from "vitest";
import { swapTimes, fromWall, clockOf } from "../lib/logic.js";

const NY = "America/New_York";
const TIMES = ["06:00", "18:00"];
// Build an instant from a NY wall-clock string, for readable test setup.
const at = w => fromWall(w, NY);

describe("swapTimes", () => {
  it("returns [] when the window is empty or inverted", () => {
    const s = at("2026-06-15T08:00");
    expect(swapTimes(s, s, NY, TIMES)).toEqual([]);            // end == start
    expect(swapTimes(s, at("2026-06-15T07:00"), NY, TIMES)).toEqual([]); // end < start
  });

  it("finds zero swaps in a window that spans neither swap time", () => {
    // 08:00 -> 17:00, misses both 06:00 and 18:00
    expect(swapTimes(at("2026-06-15T08:00"), at("2026-06-15T17:00"), NY, TIMES)).toEqual([]);
  });

  it("finds one swap when the window covers exactly one time", () => {
    const out = swapTimes(at("2026-06-15T08:00"), at("2026-06-15T19:00"), NY, TIMES);
    expect(out).toHaveLength(1);
    expect(clockOf(out[0], NY)).toBe("18:00");
  });

  it("finds both daily swaps in a full calendar day", () => {
    const out = swapTimes(at("2026-06-15T00:00"), at("2026-06-16T00:00"), NY, TIMES);
    expect(out.map(d => clockOf(d, NY))).toEqual(["06:00", "18:00"]);
  });

  it("returns instants sorted ascending across multiple days", () => {
    const out = swapTimes(at("2026-06-15T00:00"), at("2026-06-17T00:00"), NY, TIMES);
    expect(out).toHaveLength(4);
    for (let i = 1; i < out.length; i++) expect(out[i] >= out[i - 1]).toBe(true);
  });

  it("uses (start, end] boundaries: excludes start, includes end", () => {
    // Window exactly [06:00, 18:00]: the 06:00 at the open start is excluded,
    // the 18:00 at the closed end is included -> exactly one swap.
    const out = swapTimes(at("2026-06-15T06:00"), at("2026-06-15T18:00"), NY, TIMES);
    expect(out).toHaveLength(1);
    expect(clockOf(out[0], NY)).toBe("18:00");
  });

  it("still counts exactly two swaps across a spring-forward day (DST-proof)", () => {
    // DST begins Sun 2026-03-08 in the US (02:00 -> 03:00). A naive day loop could
    // miscount here; the calendar-based increment must not.
    const out = swapTimes(at("2026-03-08T00:00"), at("2026-03-09T00:00"), NY, TIMES);
    expect(out.map(d => clockOf(d, NY))).toEqual(["06:00", "18:00"]);
  });

  it("still counts exactly two swaps across a fall-back day (DST-proof)", () => {
    // DST ends Sun 2026-11-01 in the US (02:00 -> 01:00).
    const out = swapTimes(at("2026-11-01T00:00"), at("2026-11-02T00:00"), NY, TIMES);
    expect(out.map(d => clockOf(d, NY))).toEqual(["06:00", "18:00"]);
  });
});
