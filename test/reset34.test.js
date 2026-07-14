import { describe, it, expect } from "vitest";
import { RESET_HOURS, fromWall, clockOf, dayOf } from "../lib/logic.js";

const NY = "America/New_York";
// The reset is defined as: legal = shut + RESET_HOURS real hours (pure ms math).
const legalFrom = shutMs => new Date(shutMs + RESET_HOURS * 3600e3);

describe("34-hour reset — elapsed time", () => {
  it("counts exactly 34 real hours regardless of timezone or DST", () => {
    const shut = fromWall("2026-06-01T20:00", NY).getTime();
    expect(legalFrom(shut).getTime() - shut).toBe(RESET_HOURS * 3600e3);
  });

  it("stays 34 REAL hours across spring-forward, so the wall clock gains an hour", () => {
    // Shut down Sat 2026-03-07 20:00 EST. DST springs forward Sun 03-08 02:00.
    // 34 real hours later is Mon 03-09 07:00 EDT. Naive wall math (20:00 + 34h)
    // would say 06:00 and hand the driver an illegal early clock-in.
    const shut = fromWall("2026-03-07T20:00", NY).getTime();
    const legal = legalFrom(shut);
    expect(clockOf(legal, NY)).toBe("07:00");
    expect(dayOf(legal, NY)).toBe("Mon, Mar 9");
  });

  it("stays 34 REAL hours across fall-back, so the wall clock loses an hour", () => {
    // Shut down Sat 2026-10-31 20:00 EDT. DST ends Sun 11-01 02:00 -> 01:00.
    // 34 real hours later is Mon 11-02 05:00 EST. Naive wall math (20:00 + 34h)
    // would say 06:00 and rob the driver of an hour they've legally earned.
    const shut = fromWall("2026-10-31T20:00", NY).getTime();
    const legal = legalFrom(shut);
    expect(clockOf(legal, NY)).toBe("05:00");
    expect(dayOf(legal, NY)).toBe("Mon, Nov 2");
  });
});
