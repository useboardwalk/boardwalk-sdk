import { presaleManagerAbi } from "../registry/abis";
import type { SeedLiquidityParams, TxStep } from "../types";

/** `seedLiquidity()` — activate trading by seeding liquidity after a successful presale. */
export function buildSeedLiquiditySteps(params: SeedLiquidityParams): TxStep[] {
  return [
    {
      id: "seed-liquidity",
      label: "Seed liquidity",
      request: {
        abi: presaleManagerAbi,
        address: params.presale,
        functionName: "seedLiquidity",
      },
    },
  ];
}
