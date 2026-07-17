// Per-chain launch defaults. These mirror the on-chain graduation thresholds
// (LaunchFactory.graduation*)
// and durations; kept as constants so callers don't hit RPC for static values.
import { mainnet, base, arbitrum, robinhood } from "viem/chains";
import { parseUnits, formatUnits } from "viem";

export interface ChainLaunchConfig {
  /** Minimum raise (in the raise token, wei) for an auction to graduate. */
  graduationThresholdWei: bigint;
  /** Display unit for the raise token (canonical WETH on every chain). */
  raiseTokenSymbol: string;
  /** Human display of the threshold with thousands separators (e.g. "5 wETH"). */
  graduationDisplay: string;
  expressDuration: string;
  advancedDuration: string;
}

const ETH_5 = parseUnits("5", 18);

/** Thousands-separated human display of a wei threshold (mirrors the FE
 *  `formatValue` output for these whole-number thresholds). */
function formatThreshold(wei: bigint, symbol: string): string {
  const num = Number(formatUnits(wei, 18));
  return `${new Intl.NumberFormat("en-US").format(num)} ${symbol}`;
}

// Derive `graduationDisplay` from the wei threshold so the number always carries
// thousands separators and can't drift from `graduationThresholdWei`.
function makeLaunchConfig(
  graduationThresholdWei: bigint,
  raiseTokenSymbol: string,
): ChainLaunchConfig {
  return {
    graduationThresholdWei,
    raiseTokenSymbol,
    graduationDisplay: formatThreshold(graduationThresholdWei, raiseTokenSymbol),
    expressDuration: "24 Hours",
    advancedDuration: "7 Days",
  };
}

/** Graduation thresholds per chain — 5 WETH everywhere, both paths. */
export const chainLaunchConfig: Record<number, ChainLaunchConfig> = {
  [mainnet.id]: makeLaunchConfig(ETH_5, "wETH"),
  [base.id]: makeLaunchConfig(ETH_5, "wETH"),
  [arbitrum.id]: makeLaunchConfig(ETH_5, "wETH"),
  [robinhood.id]: makeLaunchConfig(ETH_5, "wETH"),
};

const FALLBACK: ChainLaunchConfig = makeLaunchConfig(ETH_5, "wETH");

/** Launch config (graduation threshold, raise-token symbol, durations) for a
 *  chain. Falls back to a sane default for unsupported/undefined chains so
 *  display-only callers don't need to branch on `undefined`. */
export function getLaunchConfig(
  chainId: number | undefined,
): ChainLaunchConfig {
  if (chainId == null) return FALLBACK;
  return chainLaunchConfig[chainId] ?? FALLBACK;
}
