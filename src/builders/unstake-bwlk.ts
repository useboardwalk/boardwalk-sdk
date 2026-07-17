import { rewardRouterAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import type { TxStep, UnstakeBwlkParams } from "../types";

/** `unstakeBwlk(amount)` — unstake BWLK. No approve needed (burning your staked
 *  balance). Ethereum-only — throws on chains where the reward router is undeployed. */
export function buildUnstakeBwlkSteps(params: UnstakeBwlkParams): TxStep[] {
  const { chainId, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Unstake amount must be greater than 0");
  const rewardRouter = assertDeployed(chainId, "rewardRouter");
  return [
    {
      id: "unstake-bwlk",
      label: "Unstake BWLK",
      request: {
        abi: rewardRouterAbi,
        address: rewardRouter,
        functionName: "unstakeBwlk",
        args: [amount],
      },
    },
  ];
}
