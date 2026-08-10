import { describe, it, expect } from "vitest";
import type { PublicClient } from "viem";
import {
  getAuctionDurationMs,
  formatAuctionDuration,
  getGraduationThresholdWei,
} from "../src/registry/launch-config";
import {
  fetchAuctionDuration,
  fetchGraduationThreshold,
  fetchLaunchParams,
} from "../src/read/launches";

const BASE = 8453;
const UNSUPPORTED = 999999;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Minimal stub — `fetchAuctionDuration` only ever calls `readContract`. */
function clientReturning(value: unknown): PublicClient {
  return { readContract: async () => value } as unknown as PublicClient;
}
/** Stub for the batched read — `multicall` resolves both values at once. */
function clientMulticall(values: unknown[]): PublicClient {
  return { multicall: async () => values } as unknown as PublicClient;
}
function clientMulticallThrowing(): PublicClient {
  return {
    multicall: async () => {
      throw new Error("no multicall3");
    },
  } as unknown as PublicClient;
}
function clientThrowing(): PublicClient {
  return {
    readContract: async () => {
      throw new Error("rpc down");
    },
  } as unknown as PublicClient;
}

describe("formatAuctionDuration", () => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;

  it("renders the live defaults and the admin-range bounds", () => {
    expect(formatAuctionDuration(24 * HOUR)).toBe("24 Hours");
    expect(formatAuctionDuration(2 * DAY_MS)).toBe("2 Days");
    expect(formatAuctionDuration(14 * DAY_MS)).toBe("14 Days");
  });

  it("never rounds a sub-hour window away", () => {
    // `SET_EXPRESS_DURATION` only requires > 0, so these are all reachable.
    expect(formatAuctionDuration(30 * MIN)).toBe("30 Minutes");
    expect(formatAuctionDuration(90 * MIN)).toBe("1 Hour 30 Minutes");
    expect(formatAuctionDuration(1000)).toBe("1 Second");
    expect(formatAuctionDuration(45 * 1000)).toBe("45 Seconds");
  });

  it("uses singular units for one", () => {
    expect(formatAuctionDuration(HOUR)).toBe("1 Hour");
    expect(formatAuctionDuration(MIN)).toBe("1 Minute");
  });

  it("keeps sub-day windows in hours and composes longer ones", () => {
    expect(formatAuctionDuration(36 * HOUR)).toBe("36 Hours");
    expect(formatAuctionDuration(2 * DAY_MS + 12 * HOUR)).toBe(
      "2 Days 12 Hours",
    );
  });
});

describe("getAuctionDurationMs", () => {
  it("matches the live factory defaults", () => {
    expect(getAuctionDurationMs("express")).toBe(DAY_MS);
    expect(getAuctionDurationMs("advanced")).toBe(2 * DAY_MS);
  });
});

describe("fetchAuctionDuration", () => {
  it("converts a valid factory value from seconds to ms", async () => {
    const ms = await fetchAuctionDuration(
      clientReturning(BigInt(172800)),
      BASE,
      "advanced",
    );
    expect(ms).toBe(2 * DAY_MS);
  });

  it("falls back on zero, non-bigint, and RPC failure", async () => {
    const fallback = getAuctionDurationMs("advanced");
    expect(
      await fetchAuctionDuration(clientReturning(BigInt(0)), BASE, "advanced"),
    ).toBe(fallback);
    expect(
      await fetchAuctionDuration(clientReturning("172800"), BASE, "advanced"),
    ).toBe(fallback);
    expect(await fetchAuctionDuration(clientThrowing(), BASE, "advanced")).toBe(
      fallback,
    );
  });

  it("falls back on an out-of-range duration rather than losing precision", async () => {
    // `SET_EXPRESS_DURATION` only requires > 0, so a huge value is reachable.
    const absurd = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1000);
    expect(
      await fetchAuctionDuration(clientReturning(absurd), BASE, "express"),
    ).toBe(getAuctionDurationMs("express"));
  });

  it("surfaces an unsupported chain instead of masking it as a fallback", async () => {
    await expect(
      fetchAuctionDuration(clientReturning(BigInt(172800)), UNSUPPORTED, "advanced"),
    ).rejects.toThrow();
  });
});

describe("fetchGraduationThreshold", () => {
  it("returns the live value and falls back on failure", async () => {
    const live = BigInt("2500000000000000000");
    expect(
      await fetchGraduationThreshold(clientReturning(live), BASE, "advanced"),
    ).toBe(live);
    expect(
      await fetchGraduationThreshold(clientThrowing(), BASE, "advanced"),
    ).toBe(getGraduationThresholdWei("advanced"));
  });

  it("surfaces an unsupported chain instead of masking it as a fallback", async () => {
    await expect(
      fetchGraduationThreshold(clientReturning(BigInt(1)), UNSUPPORTED, "advanced"),
    ).rejects.toThrow();
  });
});

describe("fetchLaunchParams", () => {
  const LIVE_THRESHOLD = BigInt("2500000000000000000");

  it("returns both live values from a single multicall", async () => {
    const r = await fetchLaunchParams(
      clientMulticall([LIVE_THRESHOLD, BigInt(172800)]),
      BASE,
      "advanced",
    );
    expect(r.thresholdWei).toBe(LIVE_THRESHOLD);
    expect(r.durationMs).toBe(2 * DAY_MS);
  });

  it("falls back per-field when only one value is unusable", async () => {
    const r = await fetchLaunchParams(
      clientMulticall([LIVE_THRESHOLD, BigInt(0)]),
      BASE,
      "advanced",
    );
    expect(r.thresholdWei).toBe(LIVE_THRESHOLD);
    expect(r.durationMs).toBe(getAuctionDurationMs("advanced"));
  });

  it("falls back on both when the batched call fails", async () => {
    const r = await fetchLaunchParams(
      clientMulticallThrowing(),
      BASE,
      "advanced",
    );
    expect(r.thresholdWei).toBe(getGraduationThresholdWei("advanced"));
    expect(r.durationMs).toBe(getAuctionDurationMs("advanced"));
  });

  it("surfaces an unsupported chain instead of masking it as a fallback", async () => {
    await expect(
      fetchLaunchParams(
        clientMulticall([LIVE_THRESHOLD, BigInt(172800)]),
        UNSUPPORTED,
        "advanced",
      ),
    ).rejects.toThrow();
  });
});
