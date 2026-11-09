import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health";

describe("HealthResponseSchema", () => {
  it("accepts the health response", () => {
    expect(HealthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });

  it("rejects an unsuccessful health response", () => {
    expect(() => HealthResponseSchema.parse({ ok: false })).toThrow();
  });
});
