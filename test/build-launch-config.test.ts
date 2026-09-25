import { describe, it, expect } from "vitest";
import { zeroAddress, type Address } from "viem";
import { buildLaunchConfig } from "../src/launch/build-launch-config";
import { effectiveCost } from "../src/launch/member-discount";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;
const D = "0x4444444444444444444444444444444444444444" as Address;

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
      vesting: [{ address: A, percent: 100 }], // required when presale < 50
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

  it("drops a row that rounds to 0 bps and keeps every split positive", () => {
    const advanced = (issuerFee: { address: Address; percent: number; label?: string }[]) =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 50,
        issuerFee,
      });

    // Before: [10000, 0], so B silently got nothing.
    const two = advanced([
      { address: A, percent: 99.999 },
      { address: B, percent: 0.001 },
    ]);
    expect(two.issuerFeeRecipients).toEqual([A]);
    expect(two.issuerFeeSplits).toEqual([BigInt(10000)]);

    // Before: [3001, 3001, 3999, -1], which viem cannot encode.
    const four = advanced([
      { address: A, percent: 30.006, label: "individual" },
      { address: B, percent: 30.006, label: "entity" },
      { address: C, percent: 39.986, label: "publicGood" },
      { address: D, percent: 0.002, label: "growthTeam" },
    ]);
    expect(four.issuerFeeRecipients).toEqual([A, B, C]);
    expect(four.issuerFeeSplits).toEqual([BigInt(3001), BigInt(3001), BigInt(3998)]);
    expect(four.issuerFeeLabels).toEqual(["individual", "entity", "publicGood"]);
  });

  it("skips 0% rows and gives the remainder to the largest row (first on a tie)", () => {
    const cfg = buildLaunchConfig({
      name: "Adv Token",
      ticker: "ADV",
      category: "other",
      path: "advanced",
      presaleSupplyPercent: 50,
      issuerFee: [
        { address: A, percent: 0 },
        { address: B, percent: 1 },
        { address: C, percent: 1 },
        { address: D, percent: 1 },
      ],
    });
    expect(cfg.issuerFeeRecipients).toEqual([B, C, D]);
    expect(cfg.issuerFeeSplits).toEqual([BigInt(3334), BigInt(3333), BigInt(3333)]);
    expect(cfg.issuerFeeLabels).toEqual(["recipient-0", "recipient-1", "recipient-2"]);

    // All rows at 0% leave no recipient, so the launch fails loudly.
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 50,
        issuerFee: [
          { address: A, percent: 0 },
          { address: B, percent: 0 },
        ],
      }),
    ).toThrow(/issuer-fee/i);
  });

  it("rejects an out-of-range / non-divisible advanced presale percent", () => {
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 33,
        vesting: [{ address: A, percent: 100 }],
      }),
    ).toThrow(/presaleSupplyPercent/i);
  });

  it("requires vesting recipients for an advanced launch with presale < 50", () => {
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 40,
        issuerFee: [{ address: A, percent: 100 }],
      }),
    ).toThrow(/vesting/i);
  });

  it("rejects vesting recipients for an advanced launch at full (50%) presale", () => {
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 50,
        issuerFee: [{ address: A, percent: 100 }],
        vesting: [{ address: B, percent: 100 }],
      }),
    ).toThrow(/cannot have vesting/i);
  });

  it("requires at least one issuer-fee recipient for an advanced launch", () => {
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 50,
      }),
    ).toThrow(/issuer-fee/i);
  });

  it("caps recipient counts at the contract bounds (4 fee, 5 vesting)", () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        address: `0x${String(i + 1).padStart(40, "0")}` as Address,
        percent: 1,
      }));
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 50,
        issuerFee: many(5),
      }),
    ).toThrow(/at most 4/i);
    expect(() =>
      buildLaunchConfig({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        presaleSupplyPercent: 40,
        issuerFee: [{ address: A, percent: 100 }],
        vesting: many(6),
      }),
    ).toThrow(/at most 5/i);
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
    expect(() =>
      buildLaunchConfig({
        name: "Wrapped BWLK",
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
  it("rounds the discount down (cost up), matching the contract", () => {
    // base=10, bps=1 → discount floors to 0, so the member still pays 10
    // (`base - (base*bps)/10000`, NOT `base*(10000-bps)/10000` which pays 9).
    expect(effectiveCost(BigInt(10), BigInt(1), true)).toBe(BigInt(10));
  });
});
