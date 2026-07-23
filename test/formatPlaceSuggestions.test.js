import { describe, it, expect } from "vitest";
import { formatPlaceSuggestions } from "../lib/logic.js";

describe("formatPlaceSuggestions", () => {
  it("keeps only locality (city) results, dropping businesses/categories/regions", () => {
    const items = [
      { resultType: "locality", address: { city: "Laredo", stateCode: "TX" } },
      { resultType: "place", address: { city: "Laredo", stateCode: "TX", label: "Joe's Diner" } },
      { resultType: "administrativeArea", address: { stateCode: "TX" } },
      { resultType: "street", address: { city: "Laredo", stateCode: "TX" } },
    ];
    expect(formatPlaceSuggestions(items)).toEqual(["Laredo, TX"]);
  });

  it("formats as 'City, ST' with an uppercased state code", () => {
    const items = [{ resultType: "locality", address: { city: "Nashville", stateCode: "tn" } }];
    expect(formatPlaceSuggestions(items)).toEqual(["Nashville, TN"]);
  });

  it("drops locality items missing city or stateCode", () => {
    const items = [
      { resultType: "locality", address: { stateCode: "TX" } },          // no city
      { resultType: "locality", address: { city: "Laredo" } },           // no stateCode
      { resultType: "locality", address: {} },                           // neither
      { resultType: "locality", address: { city: "El Paso", stateCode: "TX" } },
    ];
    expect(formatPlaceSuggestions(items)).toEqual(["El Paso, TX"]);
  });

  it("dedupes identical 'City, ST' results, keeping the first occurrence", () => {
    const items = [
      { resultType: "locality", address: { city: "Austin", stateCode: "TX" } },
      { resultType: "locality", address: { city: "Austin", stateCode: "TX" } },
      { resultType: "locality", address: { city: "Austin", stateCode: "tx" } },  // same after uppercasing
    ];
    expect(formatPlaceSuggestions(items)).toEqual(["Austin, TX"]);
  });

  it("handles missing/empty/malformed input without throwing", () => {
    expect(formatPlaceSuggestions(undefined)).toEqual([]);
    expect(formatPlaceSuggestions(null)).toEqual([]);
    expect(formatPlaceSuggestions([])).toEqual([]);
    expect(formatPlaceSuggestions([null, undefined, {}])).toEqual([]);
  });

  it("preserves result order for distinct cities", () => {
    const items = [
      { resultType: "locality", address: { city: "Dallas", stateCode: "TX" } },
      { resultType: "locality", address: { city: "Fort Worth", stateCode: "TX" } },
    ];
    expect(formatPlaceSuggestions(items)).toEqual(["Dallas, TX", "Fort Worth, TX"]);
  });
});
