import { describe, it, expect } from "vitest";
import { resolvePlace, SPLIT, Z, STATE_TZ } from "../lib/logic.js";

describe("resolvePlace — basic parsing", () => {
  it("resolves a two-letter state abbreviation", () => {
    expect(resolvePlace("Columbus OH").tz).toBe(Z.E);
  });
  it("resolves a full state name", () => {
    expect(resolvePlace("Columbus Ohio").tz).toBe(Z.E);
  });
  it("resolves a multi-word state name", () => {
    expect(resolvePlace("Albuquerque New Mexico").tz).toBe(Z.M);
  });
  it("is punctuation- and case-insensitive", () => {
    expect(resolvePlace("  dallas,  tx ").tz).toBe(Z.C);
  });
  it("labels the resolved place in Title Case", () => {
    expect(resolvePlace("el paso tx").place).toBe("El Paso, TX");
  });
  it("returns null for an empty or unknown place", () => {
    expect(resolvePlace("")).toBeNull();
    expect(resolvePlace("Zzyzx Nowhere")).toBeNull();
  });
});

describe("resolvePlace — non-split states use the state zone regardless of city", () => {
  for (const [st, code] of Object.entries(STATE_TZ)) {
    it(`${st} -> ${code}`, () => {
      expect(resolvePlace("Anytown " + st).tz).toBe(Z[code]);
    });
  }
});

describe("resolvePlace — split-state city table is transcribed correctly", () => {
  // Data-driven: every city in every split state must resolve to its listed zone.
  for (const [st, sp] of Object.entries(SPLIT)) {
    for (const [city, code] of Object.entries(sp.cities)) {
      it(`${city}, ${st} -> ${code}`, () => {
        const r = resolvePlace(`${city} ${st}`);
        expect(r).not.toBeNull();
        expect(r.tz).toBe(Z[code]);
      });
    }
  }
});

describe("resolvePlace — split-state fallbacks", () => {
  it("falls back to the state default when the city is unlisted", () => {
    // Texas defaults to Central; a random TX town is Central.
    expect(resolvePlace("Waco TX").tz).toBe(Z.C);
  });
  it("returns null for a split state with no default and an unlisted city", () => {
    // Tennessee has def:null; an unlisted TN town cannot be placed.
    expect(resolvePlace("Nowheresville TN")).toBeNull();
  });
});
