// Ported from token-launcher/hooks/contracts/useStakeBmx.ts.
import type { Address, PublicClient } from "viem";
import { rewardRouterAbi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { TxStep } from "../flow/types";

export interface StakeBmxParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  /** BMX amount in wei. */
  amount: bigint;
}

/** Conditional approve BMX → stakedBmxTracker, then `stakeBmx(amount)`. Base-only today. */
export async function buildStakeBmxSteps(
  params: StakeBmxParams,
): Promise<TxStep[]> {
  const { client, account, chainId, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Stake amount must be greater than 0");

  const rewardRouter = assertDeployed(chainId, "rewardRouter");
  const stakedBmxTracker = assertDeployed(chainId, "stakedBmxTracker");
  const { bmxToken } = getContracts(chainId);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(client, {
    id: "approve-bmx",
    label: "Approve BMX",
    token: bmxToken,
    owner: account,
    spender: stakedBmxTracker,
    amount,
  });
  if (approve) steps.push(approve);

  steps.push({
    id: "stake-bmx",
    label: "Stake BMX",
    request: {
      abi: rewardRouterAbi,
      address: rewardRouter,
      functionName: "stakeBmx",
      args: [amount],
    },
  });

  return steps;
}
