import { describe, it, expect } from "vitest";
import { icsStamp, esc } from "../lib/logic.js";

describe("icsStamp", () => {
  it("formats an instant as a UTC iCalendar stamp", () => {
    expect(icsStamp(new Date("2026-07-14T12:34:56.789Z"))).toBe("20260714T123456Z");
  });
  it("drops the fractional seconds", () => {
    expect(icsStamp(new Date("2026-01-01T00:00:00.000Z"))).toBe("20260101T000000Z");
  });
});

describe("esc — iCalendar text escaping", () => {
  it("escapes commas, semicolons and backslashes", () => {
    expect(esc("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
  });
  it("leaves ordinary text untouched", () => {
    expect(esc("Shut down Mon, ")).toBe("Shut down Mon\\, ");
    expect(esc("no specials here")).toBe("no specials here");
  });
});
