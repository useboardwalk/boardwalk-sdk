// Builds the on-chain `createLaunch` config from a clean `LaunchInput`:
// proportional-bps fee/vesting math plus name/ticker normalization + validation.
import { isAddress, zeroAddress, type Address } from "viem";
import type { FeeRecipientInput, LaunchConfig, LaunchInput } from "../types";
import { resolveDescription } from "./description";
import {
  normalizeTokenName,
  normalizeTokenTicker,
  trimTokenName,
  validateTokenName,
  validateTokenTicker,
} from "./token-identity";

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
    // Mirrors the factory's configured range: 2500–5000 bps, divisible by 500.
    // The on-chain bounds are admin-tunable (`min`/`maxPresalePercent`); read
    // them from the factory if you need to track a change to that range.
    if (!Number.isInteger(pct) || pct < 25 || pct > 50 || pct % 5 !== 0) {
      throw new Error(
        `Invalid presaleSupplyPercent "${input.presaleSupplyPercent}": standard launches (--path advanced) require an integer 25–50 divisible by 5`,
      );
    }
    presalePercent = BigInt(pct * 100);
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

  // Standard launches (path "advanced") split the issuer fee across recipients — at least one is
  // required (mirrors the FE fee-breakdown step's "hasAnyRecipient" gate).
  if (!isExpress && issuerFee.addresses.length === 0) {
    throw new Error(
      "Standard launches (--path advanced) require at least one issuer-fee recipient (--fee)",
    );
  }

  // Contract caps: MAX_FEE_RECIPIENTS = 4, MAX_VESTING_RECIPIENTS = 5
  // (TooManyRecipients) — reject here instead of emitting a guaranteed revert.
  if (issuerFee.addresses.length > 4) {
    throw new Error("At most 4 issuer-fee recipients are allowed");
  }
  if (vesting.addresses.length > 5) {
    throw new Error("At most 5 vesting recipients are allowed");
  }

  // Contract requires vesting recipients when the presale doesn't distribute the
  // full supply (advanced + presalePercent < 50) — IssuerVestingRecipientsRequired.
  if (
    !isExpress &&
    presalePercent < BigInt(5000) &&
    vesting.addresses.length === 0
  ) {
    throw new Error(
      "Standard launches with presaleSupplyPercent < 50 require at least one vesting recipient",
    );
  }

  // Contract rejects vesting when the presale distributes the full supply
  // (advanced + presalePercent == 50) — VestingNotAllowedAtFullPresale.
  if (
    !isExpress &&
    presalePercent === BigInt(5000) &&
    vesting.addresses.length > 0
  ) {
    throw new Error(
      "Standard launches with presaleSupplyPercent = 50 cannot have vesting recipients (the presale sells the full supply); use 25–45 with vesting, or drop --vesting",
    );
  }

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
