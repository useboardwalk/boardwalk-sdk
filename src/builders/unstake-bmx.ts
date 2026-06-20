// Ported from token-launcher/hooks/contracts/useUnstakeBmx.ts.
import { rewardRouterAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import type { TxStep, UnstakeBmxParams } from "../types";

/** `unstakeBmx(amount)` — unstake BMX. No approve needed (burning your staked
 *  balance). Base-only — throws on chains where the reward router is undeployed. */
export function buildUnstakeBmxSteps(params: UnstakeBmxParams): TxStep[] {
  const { chainId, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Unstake amount must be greater than 0");
  const rewardRouter = assertDeployed(chainId, "rewardRouter");
  return [
    {
      id: "unstake-bmx",
      label: "Unstake BMX",
      request: {
        abi: rewardRouterAbi,
        address: rewardRouter,
        functionName: "unstakeBmx",
        args: [amount],
      },
    },
  ];
}
