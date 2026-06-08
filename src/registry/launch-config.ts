// Per-chain launch defaults — ported from token-launcher/config/launch.ts.
// These mirror the on-chain graduation thresholds (LaunchFactory.graduation*)
// and durations; kept as constants so callers don't hit RPC for static values.
import { mainnet, base, fraxtal, katana, ink } from "viem/chains";
import { parseUnits } from "viem";

export interface ChainLaunchConfig {
  /** Minimum raise (in the raise token, wei) for an auction to graduate. */
  graduationThresholdWei: bigint;
  /** Display unit for the raise token (wETH / frxUSD / KAT). */
  raiseTokenSymbol: string;
  expressDuration: string;
  advancedDuration: string;
}

const ETH_10 = parseUnits("10", 18);

function make(
  graduationThresholdWei: bigint,
  raiseTokenSymbol: string,
): ChainLaunchConfig {
  return {
    graduationThresholdWei,
    raiseTokenSymbol,
    expressDuration: "24 Hours",
    advancedDuration: "7 Days",
  };
}

/** Graduation thresholds per chain (in the raise token). */
export const chainLaunchConfig: Record<number, ChainLaunchConfig> = {
  [mainnet.id]: make(ETH_10, "wETH"),
  [base.id]: make(ETH_10, "wETH"),
  [fraxtal.id]: make(parseUnits("20000", 18), "frxUSD"),
  [katana.id]: make(parseUnits("2000000", 18), "KAT"),
  [ink.id]: make(ETH_10, "wETH"),
};

/** Launch config (graduation threshold, raise-token symbol, durations) for a chain. Throws if unsupported. */
export function getLaunchConfig(chainId: number): ChainLaunchConfig {
  const cfg = chainLaunchConfig[chainId];
  if (!cfg) throw new Error(`Unsupported chain: ${chainId}`);
  return cfg;
}
