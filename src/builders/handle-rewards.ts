import { rewardRouterAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import type { HandleRewardsParams, TxStep } from "../types";

/** `handleRewards(...)` — claim/compound staking rewards. The four flags map 1:1
 *  to the contract args (claim OP BMX, stake multiplier points, claim WETH,
 *  convert WETH→ETH). Base-only. No approve needed. */
export function buildHandleRewardsSteps(params: HandleRewardsParams): TxStep[] {
  const {
    chainId,
    shouldClaimOpBmx,
    shouldStakeMultiplierPoints,
    shouldClaimWeth,
    shouldConvertWethToEth,
  } = params;
  const rewardRouter = assertDeployed(chainId, "rewardRouter");
  return [
    {
      id: "handle-rewards",
      label: "Claim rewards",
      request: {
        abi: rewardRouterAbi,
        address: rewardRouter,
        functionName: "handleRewards",
        args: [
          shouldClaimOpBmx,
          shouldStakeMultiplierPoints,
          shouldClaimWeth,
          shouldConvertWethToEth,
        ],
      },
    },
  ];
}
