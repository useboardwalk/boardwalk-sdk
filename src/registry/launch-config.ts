// Per-chain launch defaults. The graduation thresholds and auction durations
// mirror `LaunchFactory.graduation*` / `*Duration` and are the fallbacks for
// `fetchGraduationThreshold` / `fetchAuctionDuration`, which read the live
// factory values.
import { mainnet, base, arbitrum, robinhood } from "viem/chains";
import { parseUnits, formatUnits } from "viem";

export interface ChainLaunchConfig {
  /** Display unit for the raise token (canonical WETH on every chain). */
  raiseTokenSymbol: string;
  /** @deprecated Durations are per-path, not per-chain, and are timelock-tunable.
   *  Use `getAuctionDurationMs("express")` or `fetchAuctionDuration`. Removed in
   *  the next major. */
  expressDuration: string;
  /** @deprecated Use `getAuctionDurationMs("advanced")` or `fetchAuctionDuration`.
   *  Removed in the next major. */
  advancedDuration: string;
}

/** Thousands-separated human display of a wei threshold (mirrors the FE
 *  `formatValue` output for these thresholds). */
export function formatThreshold(wei: bigint, symbol: string): string {
  const num = Number(formatUnits(wei, 18));
  return `${new Intl.NumberFormat("en-US").format(num)} ${symbol}`;
}

/**
 * Auction window per launch path, in ms.
 *
 * `LaunchFactory.expressDuration` / `advancedDuration` are separate timelocked
 * values (advanced is admin-tunable in the 2-14 day range), so these can change
 * without a release and can diverge from each other. Fallbacks only — prefer
 * `fetchAuctionDuration` where a client is available.
 *
 * Advanced also carries a fixed 24-hour start delay before the window opens
 * (`PresaleManager.ADVANCED_START_DELAY`, an immutable contract constant).
 */
const AUCTION_DURATION_FALLBACK_MS: Record<"express" | "advanced", number> = {
  express: 24 * 60 * 60 * 1000,
  advanced: 2 * 24 * 60 * 60 * 1000,
};

/** Fallback auction window for `path`. Uniform across supported chains. */
export function getAuctionDurationMs(path: "express" | "advanced"): number {
  return AUCTION_DURATION_FALLBACK_MS[path];
}

/** Human display of an auction window, e.g. "24 Hours" or "2 Days". */
export function formatAuctionDuration(durationMs: number): string {
  const hours = Math.round(durationMs / (60 * 60 * 1000));
  if (hours % 24 === 0 && hours >= 48) return `${hours / 24} Days`;
  return `${hours} Hours`;
}

function makeLaunchConfig(raiseTokenSymbol: string): ChainLaunchConfig {
  return {
    raiseTokenSymbol,
    expressDuration: formatAuctionDuration(getAuctionDurationMs("express")),
    advancedDuration: formatAuctionDuration(getAuctionDurationMs("advanced")),
  };
}

export const chainLaunchConfig: Record<number, ChainLaunchConfig> = {
  [mainnet.id]: makeLaunchConfig("wETH"),
  [base.id]: makeLaunchConfig("wETH"),
  [arbitrum.id]: makeLaunchConfig("wETH"),
  [robinhood.id]: makeLaunchConfig("wETH"),
};

const FALLBACK: ChainLaunchConfig = makeLaunchConfig("wETH");

/** Launch config (raise-token symbol, durations) for a chain. Falls back to a
 *  sane default for unsupported/undefined chains so display-only callers don't
 *  need to branch on `undefined`. */
export function getLaunchConfig(
  chainId: number | undefined,
): ChainLaunchConfig {
  if (chainId == null) return FALLBACK;
  return chainLaunchConfig[chainId] ?? FALLBACK;
}

/**
 * Graduation minimums per launch path, in the raise token (wei).
 *
 * The factory keeps these as two independently timelocked values, so the paths
 * can diverge between executions — never collapse them back into one number.
 * These are fallbacks: prefer `fetchGraduationThreshold` where a client is
 * available.
 */
const GRADUATION_FALLBACK_WEI: Record<"express" | "advanced", bigint> = {
  express: parseUnits("2.5", 18),
  advanced: parseUnits("2.5", 18),
};

/** Fallback graduation threshold for `path`. Uniform across supported chains. */
export function getGraduationThresholdWei(
  path: "express" | "advanced",
): bigint {
  return GRADUATION_FALLBACK_WEI[path];
}
