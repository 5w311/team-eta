import { describe, it, expect } from "vitest";
import { hm, hms, titleCase } from "../lib/logic.js";

describe("hm — hours as 'Nh MMm'", () => {
  it("formats a fractional hour", () => expect(hm(1.5)).toBe("1h 30m"));
  it("zero-pads the minutes", () => expect(hm(2.05)).toBe("2h 03m"));
  it("uses the magnitude of negatives (for 'late by' / 'ahead')", () => {
    expect(hm(-0.5)).toBe("0h 30m");
  });
  it("rounds to the nearest minute", () => expect(hm(1 / 60 + 0.4 / 60)).toBe("0h 01m"));
});

describe("hms — milliseconds as 'Nh MMm SSs'", () => {
  it("formats a full countdown", () => expect(hms(3661000)).toBe("1h 01m 01s"));
  it("clamps negatives to zero (never shows a negative countdown)", () => {
    expect(hms(-5000)).toBe("0h 00m 00s");
  });
  it("floors partial seconds", () => expect(hms(1999)).toBe("0h 00m 01s"));
});

describe("titleCase", () => {
  it("capitalizes each word", () => expect(titleCase("el paso")).toBe("El Paso"));
  it("tolerates extra spaces without throwing", () => {
    expect(titleCase("de funiak springs")).toBe("De Funiak Springs");
  });
});
