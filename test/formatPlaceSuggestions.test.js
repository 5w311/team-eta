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

  it("falls back to parsing address.label when city/stateCode fields are absent " +
     "(this account's plan returns only a flat label, not structured fields)", () => {
    // The exact real-world shape reported: resultType is "locality" (so the type
    // filter is right), but address has only { label } — no city, no stateCode.
    const items = [{
      title: "Chattanooga, TN, United States",
      id: "here:cm:namedplace:21020565",
      resultType: "locality",
      localityType: "city",
      address: { label: "Chattanooga, TN, United States" },
    }];
    expect(formatPlaceSuggestions(items)).toEqual(["Chattanooga, TN"]);
  });

  it("falls back to title when address.label is also missing", () => {
    const items = [{ resultType: "locality", title: "Nashville, TN, United States", address: {} }];
    expect(formatPlaceSuggestions(items)).toEqual(["Nashville, TN"]);
  });

  it("prefers structured city/stateCode over the label when both are present", () => {
    const items = [{
      resultType: "locality",
      address: { city: "El Paso", stateCode: "TX", label: "Something Else, ZZ, Nowhere" },
    }];
    expect(formatPlaceSuggestions(items)).toEqual(["El Paso, TX"]);
  });

  it("drops a parsed result if the label's second segment isn't a 2-letter code", () => {
    const items = [{ resultType: "locality", address: { label: "Paris, Ile-de-France, France" } }];
    expect(formatPlaceSuggestions(items)).toEqual([]);
  });

  it("dedupes across structured and label-parsed results that resolve the same", () => {
    const items = [
      { resultType: "locality", address: { city: "Austin", stateCode: "TX" } },
      { resultType: "locality", address: { label: "Austin, TX, United States" } },
    ];
    expect(formatPlaceSuggestions(items)).toEqual(["Austin, TX"]);
  });
});
