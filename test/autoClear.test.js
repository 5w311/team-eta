import { describe, it, expect } from "vitest";
import { autoClearElapsed, AUTO_CLEAR_MS, RESET_HOURS } from "../lib/logic.js";

const shut = Date.UTC(2026, 5, 1, 12, 0, 0);          // arbitrary shutdown instant
const completion = shut + RESET_HOURS * 3600e3;        // when the 34 finishes

describe("autoClearElapsed", () => {
  it("does not clear a reset that is still running", () => {
    expect(autoClearElapsed(shut, shut + 10 * 3600e3)).toBe(false);   // 10h in
  });

  it("does not clear the moment the 34 just completed", () => {
    expect(autoClearElapsed(shut, completion)).toBe(false);
  });

  it("does not clear partway through the 10-minute window", () => {
    expect(autoClearElapsed(shut, completion + 5 * 60 * 1000)).toBe(false);
  });

  it("clears once 10+ minutes have passed since completion", () => {
    expect(autoClearElapsed(shut, completion + AUTO_CLEAR_MS + 1000)).toBe(true);
    expect(autoClearElapsed(shut, completion + 30 * 60 * 1000)).toBe(true);
  });

  it("clears exactly at the window boundary (countdown hits zero)", () => {
    expect(autoClearElapsed(shut, completion + AUTO_CLEAR_MS)).toBe(true);
  });

  it("stays cleared even when reopened long after (never a negative countdown)", () => {
    expect(autoClearElapsed(shut, completion + 24 * 3600e3)).toBe(true);
  });

  it("is false when there is no reset set", () => {
    expect(autoClearElapsed(null, Date.now())).toBe(false);
  });
});
