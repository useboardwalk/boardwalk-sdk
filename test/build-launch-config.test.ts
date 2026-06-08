import { describe, it, expect } from "vitest";
import { zeroAddress, type Address } from "viem";
import { buildLaunchConfig } from "../src/launch/build-launch-config";
import { effectiveCost } from "../src/launch/member-discount";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;

describe("buildLaunchConfig", () => {
  it("builds an express config (50% presale, single issuer fee, no vesting)", () => {
    const cfg = buildLaunchConfig({
      name: "Test Token",
      ticker: "TEST",
      category: "meme-culture",
      path: "express",
      issuerFeeRecipient: A,
    });
    expect(cfg.path).toBe(0);
    expect(cfg.presalePercent).toBe(BigInt(5000));
    expect(cfg.issuerFeeRecipients).toEqual([A]);
    expect(cfg.issuerFeeSplits).toEqual([BigInt(10000)]);
    expect(cfg.vestingRecipients).toEqual([]);
    expect(cfg.referrer).toBe(zeroAddress);
    expect(cfg.name).toBe("Test Token");
    expect(cfg.ticker).toBe("TEST");
  });

  it("normalizes proportional issuer-fee splits to bps summing to 10000 (advanced)", () => {
    const cfg = buildLaunchConfig({
      name: "Adv Token",
      ticker: "ADV",
      category: "ai-agents",
      path: "advanced",
      presaleSupplyPercent: 40,
      issuerFee: [
        { address: A, percent: 75 },
        { address: B, percent: 25 },
      ],
    });
    expect(cfg.path).toBe(1);
    expect(cfg.presalePercent).toBe(BigInt(4000));
    expect(cfg.issuerFeeSplits).toEqual([BigInt(7500), BigInt(2500)]);
    expect(cfg.issuerFeeSplits.reduce((a, b) => a + b, BigInt(0))).toBe(
      BigInt(10000),
    );
  });

  it("uppercases/normalizes the ticker and throws on an invalid one", () => {
    expect(
      buildLaunchConfig({
        name: "Lower Case",
        ticker: "low",
        category: "other",
        path: "express",
      }).ticker,
    ).toBe("LOW");
    expect(() =>
      buildLaunchConfig({
        name: "Test Token",
        ticker: "!!",
        category: "other",
        path: "express",
      }),
    ).toThrow(/ticker/i);
  });

  it("rejects an impersonating name", () => {
    expect(() =>
      buildLaunchConfig({
        name: "Boardwalk Official",
        ticker: "ABCD",
        category: "other",
        path: "express",
      }),
    ).toThrow(/name/i);
  });
});

describe("effectiveCost", () => {
  it("returns base for non-members", () => {
    expect(effectiveCost(BigInt(1000), BigInt(2000), false)).toBe(BigInt(1000));
  });
  it("applies the member discount", () => {
    expect(effectiveCost(BigInt(1000), BigInt(2000), true)).toBe(BigInt(800)); // 20% off
  });
  it("never goes below zero", () => {
    expect(effectiveCost(BigInt(1000), BigInt(10000), true)).toBe(BigInt(0));
  });
});
