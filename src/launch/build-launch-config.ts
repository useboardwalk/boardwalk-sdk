// Adapted from token-launcher/lib/build-launch-config.ts — the Redux
// `FormStateByPath` input is replaced with a clean `LaunchInput`; the
// proportional-bps math and normalization/validation are unchanged.
import { isAddress, zeroAddress, type Address } from "viem";
import type { LaunchConfig } from "./launch-config";
import { resolveDescription } from "./description";
import {
  normalizeTokenName,
  normalizeTokenTicker,
  trimTokenName,
  validateTokenName,
  validateTokenTicker,
} from "./token-identity";

export interface FeeRecipientInput {
  address: Address;
  /** Relative weight; recipients are normalized to bps summing to 10000. */
  percent: number;
  label?: string;
}

export interface LaunchInput {
  name: string;
  ticker: string;
  category: string;
  description?: string;
  path: "express" | "advanced";
  /** Numeric chain id — used only to validate chain-reserved tickers. */
  chainId?: number;

  // Express
  /** Single issuer-fee recipient (receives 100% of the issuer fee). */
  issuerFeeRecipient?: Address;

  // Advanced
  /** Presale supply percent (default 50). */
  presaleSupplyPercent?: number;
  issuerFee?: FeeRecipientInput[];
  vesting?: FeeRecipientInput[];
  referrer?: Address;
}

/** Converts relative percents among valid-address recipients to bps summing to 10000. */
function toProportionalBps(entries: FeeRecipientInput[]): {
  addresses: Address[];
  splits: bigint[];
  labels: string[];
} {
  const valid = entries
    .map((e) => ({ ...e, address: e.address.trim() as Address }))
    .filter((e) => isAddress(e.address));
  if (valid.length === 0) return { addresses: [], splits: [], labels: [] };

  const totalPct = valid.reduce((sum, e) => sum + e.percent, 0);
  const splits: bigint[] = [];
  let remaining = BigInt(10000);
  for (let i = 0; i < valid.length; i++) {
    const entry = valid[i]!;
    if (i === valid.length - 1) {
      splits.push(remaining);
    } else {
      const bps =
        totalPct > 0
          ? BigInt(Math.round((entry.percent / totalPct) * 10000))
          : BigInt(Math.round(10000 / valid.length));
      splits.push(bps);
      remaining -= bps;
    }
  }

  return {
    addresses: valid.map((e) => e.address),
    splits,
    labels: valid.map((e, i) => e.label ?? `recipient-${i}`),
  };
}

/**
 * Build a `LaunchConfig` (the `createLaunch` tuple) from clean inputs.
 * Throws with a human-readable reason on invalid name/ticker/category.
 */
export function buildLaunchConfig(input: LaunchInput): LaunchConfig {
  const name = trimTokenName(normalizeTokenName(input.name));
  const ticker = normalizeTokenTicker(input.ticker);

  const nameCheck = validateTokenName(name);
  if (!nameCheck.ok) throw new Error(`Invalid token name: ${nameCheck.reason}`);
  const tickerCheck = validateTokenTicker(ticker, input.chainId);
  if (!tickerCheck.ok)
    throw new Error(`Invalid token ticker: ${tickerCheck.reason}`);
  if (!input.category) throw new Error("category is required");

  const isExpress = input.path === "express";

  let presalePercent: bigint;
  if (isExpress) {
    presalePercent = BigInt(5000); // fixed 50%
  } else {
    const pct = Number(input.presaleSupplyPercent ?? 50);
    presalePercent = BigInt(Math.round(pct * 100));
  }

  let issuerFee: { addresses: Address[]; splits: bigint[]; labels: string[] };
  if (isExpress) {
    const addr = input.issuerFeeRecipient?.trim() ?? "";
    issuerFee =
      addr && isAddress(addr)
        ? {
            addresses: [addr as Address],
            splits: [BigInt(10000)],
            labels: ["individual"],
          }
        : { addresses: [], splits: [], labels: [] };
  } else {
    issuerFee = toProportionalBps(input.issuerFee ?? []);
  }

  const vesting = isExpress
    ? { addresses: [], splits: [], labels: [] }
    : toProportionalBps(input.vesting ?? []);

  const referrerRaw = input.referrer?.trim() ?? "";
  const referrer: Address =
    !isExpress && referrerRaw && isAddress(referrerRaw)
      ? (referrerRaw as Address)
      : zeroAddress;

  return {
    name,
    ticker,
    category: input.category,
    description: resolveDescription(input.description),
    path: isExpress ? 0 : 1,
    presalePercent,
    vestingRecipients: vesting.addresses,
    vestingPercents: vesting.splits,
    vestingLabels: vesting.labels,
    referrer,
    issuerFeeRecipients: issuerFee.addresses,
    issuerFeeSplits: issuerFee.splits,
    issuerFeeLabels: issuerFee.labels,
  };
}
