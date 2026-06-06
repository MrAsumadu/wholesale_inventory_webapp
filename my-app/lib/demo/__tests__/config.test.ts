import { describe, it, expect, afterEach, vi } from "vitest";
import { isDemoMode } from "@/lib/demo/config";

describe("isDemoMode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is true only when NEXT_PUBLIC_DEMO_MODE === 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
  });

  it("is false when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "");
    expect(isDemoMode()).toBe(false);
  });
});
