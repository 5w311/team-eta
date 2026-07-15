import { describe, it, expect } from "vitest";
import { dotBreaks, dotDuration, DOT_MIN_FLOOR, fromWall, clockOf, dayOf } from "../lib/logic.js";

const NY = "America/New_York";
const at = w => fromWall(w, NY).getTime();
const swap = { times: ["06:00", "18:00"], tz: NY };   // shifts start 06:00 and 18:00
const DOT_AT = 5;                                      // Realistic: 5h into shift → marks at 11:00 / 23:00

describe("dotDuration — 30-minute floor", () => {
  it("clamps values under 30 up to 30", () => {
    expect(dotDuration(10)).toBe(30);
    expect(dotDuration(29)).toBe(30);
    expect(dotDuration(0)).toBe(30);
  });
  it("keeps 30 and anything above", () => {
    expect(dotDuration(30)).toBe(30);
    expect(dotDuration(40)).toBe(40);
    expect(dotDuration(45)).toBe(45);
  });
  it("treats blank/invalid input as the floor", () => {
    expect(dotDuration("")).toBe(30);
    expect(dotDuration(undefined)).toBe(30);
    expect(dotDuration(null)).toBe(30);
  });
  it("exposes the floor constant", () => expect(DOT_MIN_FLOOR).toBe(30));
});

describe("dotBreaks — one break per shift, at dotAt into the shift", () => {
  it("run within a shift that ends before the DOT mark → 0 breaks", () => {
    // Depart 07:00 (day shift began 06:00, mark 11:00); end 10:00, before the mark.
    expect(dotBreaks(at("2026-06-15T07:00"), at("2026-06-15T10:00"), swap, DOT_AT)).toHaveLength(0);
  });

  it("run within a shift that reaches the DOT mark → 1 break, placed 5h in", () => {
    const d = dotBreaks(at("2026-06-15T07:00"), at("2026-06-15T14:00"), swap, DOT_AT);
    expect(d).toHaveLength(1);
    expect(clockOf(d[0], NY)).toBe("11:00");       // 06:00 shift start + 5h
  });

  it("run that departs after the mark takes 0 for that shift", () => {
    // Depart 12:00 (mark 11:00 already passed), end 14:00, no new shift.
    expect(dotBreaks(at("2026-06-15T12:00"), at("2026-06-15T14:00"), swap, DOT_AT)).toHaveLength(0);
  });

  it("run across three shifts → three breaks, one per shift", () => {
    const d = dotBreaks(at("2026-06-15T07:00"), at("2026-06-16T12:00"), swap, DOT_AT);
    expect(d).toHaveLength(3);
    expect(d.map(x => clockOf(x, NY) + " " + dayOf(x, NY))).toEqual([
      "11:00 Mon, Jun 15",   // day shift  (06:00 + 5h)
      "23:00 Mon, Jun 15",   // night shift (18:00 + 5h)
      "11:00 Tue, Jun 16",   // next day shift (06:00 + 5h)
    ]);
  });

  it("returns break instants sorted ascending", () => {
    const d = dotBreaks(at("2026-06-15T07:00"), at("2026-06-16T12:00"), swap, DOT_AT);
    for (let i = 1; i < d.length; i++) expect(d[i] >= d[i - 1]).toBe(true);
  });

  it("empty / inverted window → no breaks", () => {
    const s = at("2026-06-15T08:00");
    expect(dotBreaks(s, s, swap, DOT_AT)).toHaveLength(0);
    expect(dotBreaks(s, at("2026-06-15T07:00"), swap, DOT_AT)).toHaveLength(0);
  });
});

describe("dotBreaks — keys off the swap schedule, not hardcoded hours", () => {
  const custom = { times: ["05:00", "17:00"], tz: NY };   // shifts start 05:00 / 17:00
  const DOT_AT_C = 4;                                       // marks at 09:00 / 21:00

  it("places the break relative to the custom shift start", () => {
    const d = dotBreaks(at("2026-06-15T05:30"), at("2026-06-15T10:00"), custom, DOT_AT_C);
    expect(d).toHaveLength(1);
    expect(clockOf(d[0], NY)).toBe("09:00");       // 05:00 shift start + 4h
  });

  it("counts one break per custom shift the run reaches the mark of", () => {
    // 05:30 → 20:00 crosses the 17:00 swap, but ends before that shift's 21:00 mark.
    const d = dotBreaks(at("2026-06-15T05:30"), at("2026-06-15T20:00"), custom, DOT_AT_C);
    expect(d).toHaveLength(1);
    expect(clockOf(d[0], NY)).toBe("09:00");
  });
});
