import { rewardRouterAbi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { StakeBwlkParams, TxStep } from "../types";

/** Conditional approve BWLK → stakedBwlkTracker (the tracker pulls the tokens),
 *  then `RewardRouter.stakeBwlk(amount)`. Ethereum-only. */
export async function buildStakeBwlkSteps(
  params: StakeBwlkParams,
): Promise<TxStep[]> {
  const { client, account, chainId, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Stake amount must be greater than 0");

  const rewardRouter = assertDeployed(chainId, "rewardRouter");
  const stakedBwlkTracker = assertDeployed(chainId, "stakedBwlkTracker");
  const { bwlkToken } = getContracts(chainId);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(client, {
    id: "approve-bwlk",
    label: "Approve BWLK",
    token: bwlkToken,
    owner: account,
    spender: stakedBwlkTracker,
    amount,
  });
  if (approve) steps.push(approve);

  steps.push({
    id: "stake-bwlk",
    label: "Stake BWLK",
    request: {
      abi: rewardRouterAbi,
      address: rewardRouter,
      functionName: "stakeBwlk",
      args: [amount],
    },
  });

  return steps;
}
