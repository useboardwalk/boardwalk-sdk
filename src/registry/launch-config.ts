// Per-chain launch defaults. Durations are constants; the graduation thresholds
// mirror `LaunchFactory.graduationExpress`/`graduationAdvanced` and are the
// fallback for `fetchGraduationThreshold`, which reads the live factory value.
import { mainnet, base, arbitrum, robinhood } from "viem/chains";
import { parseUnits, formatUnits } from "viem";

export interface ChainLaunchConfig {
  /** Display unit for the raise token (canonical WETH on every chain). */
  raiseTokenSymbol: string;
  expressDuration: string;
  advancedDuration: string;
}

/** Thousands-separated human display of a wei threshold (mirrors the FE
 *  `formatValue` output for these thresholds). */
export function formatThreshold(wei: bigint, symbol: string): string {
  const num = Number(formatUnits(wei, 18));
  return `${new Intl.NumberFormat("en-US").format(num)} ${symbol}`;
}

function makeLaunchConfig(raiseTokenSymbol: string): ChainLaunchConfig {
  return {
    raiseTokenSymbol,
    expressDuration: "24 Hours",
    advancedDuration: "7 Days",
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
