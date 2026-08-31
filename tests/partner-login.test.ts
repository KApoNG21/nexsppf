import { describe, expect, it } from "vitest";
import { resolvePartnerLoginIdentifier } from "@/lib/partner-login";

describe("partner login identifier", () => {
  it("allows The Next to sign in with a simple username", () => {
    expect(resolvePartnerLoginIdentifier("thenext")).toBe("thenext@nexsppf.com");
    expect(resolvePartnerLoginIdentifier("The Next")).toBe("thenext@nexsppf.com");
  });

  it("keeps normal dealer email identifiers unchanged", () => {
    expect(resolvePartnerLoginIdentifier(" dealer@example.com ")).toBe("dealer@example.com");
  });
});
