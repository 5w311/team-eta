import { describe, it, expect } from "vitest";
import { shiftAtArrival, fromWall } from "../lib/logic.js";

const NY = "America/New_York";
const at = w => fromWall(w, NY);
const swap = { times: ["06:00", "18:00"], tz: NY };

describe("shiftAtArrival", () => {
  it("mid-day-shift arrival is the day driver", () => {
    expect(shiftAtArrival(at("2026-06-15T12:00"), swap)).toBe("day");
  });
  it("mid-night-shift arrival is the night driver", () => {
    expect(shiftAtArrival(at("2026-06-15T23:00"), swap)).toBe("night");
  });
  it("after-midnight arrival is still the night driver (the shift wraps midnight)", () => {
    expect(shiftAtArrival(at("2026-06-15T02:00"), swap)).toBe("night");
  });
  it("just before the day swap is still night", () => {
    expect(shiftAtArrival(at("2026-06-15T05:59"), swap)).toBe("night");
  });

  describe("at an exact swap instant, the incoming driver is up", () => {
    it("exactly at the day swap -> day", () => {
      expect(shiftAtArrival(at("2026-06-15T06:00"), swap)).toBe("day");
    });
    it("exactly at the night swap -> night", () => {
      expect(shiftAtArrival(at("2026-06-15T18:00"), swap)).toBe("night");
    });
  });

  describe("keys off the schedule, not hardcoded 06/18", () => {
    const custom = { times: ["05:30", "17:30"], tz: NY };
    it("06:00 is day under an 05:30 start", () => {
      expect(shiftAtArrival(at("2026-06-15T06:00"), custom)).toBe("day");
    });
    it("05:00 is still night under an 05:30 start", () => {
      expect(shiftAtArrival(at("2026-06-15T05:00"), custom)).toBe("night");
    });
    it("exactly at the custom night swap -> night", () => {
      expect(shiftAtArrival(at("2026-06-15T17:30"), custom)).toBe("night");
    });
    it("respects the schedule even when the two times are stored out of order", () => {
      const reversed = { times: ["17:30", "05:30"], tz: NY };
      expect(shiftAtArrival(at("2026-06-15T06:00"), reversed)).toBe("day");
      expect(shiftAtArrival(at("2026-06-15T05:00"), reversed)).toBe("night");
    });
  });

  it("classifies by wall clock, so it stays correct across a DST change", () => {
    // 2026-03-08 is spring-forward day (02:00 -> 03:00).
    expect(shiftAtArrival(at("2026-03-08T12:00"), swap)).toBe("day");
    expect(shiftAtArrival(at("2026-03-08T03:00"), swap)).toBe("night");
  });
});
