// Ported from token-launcher/hooks/contracts/useGovernanceVote.ts.
import { base } from "viem/chains";
import type { Address, PublicClient } from "viem";
import { governanceVoterAbi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { TxStep } from "../flow/types";

/** 1 = Treasury, 2 = Buy & Burn BMX, 3 = Buy & Burn LP, 4 = Participation. */
export type VoteOption = 1 | 2 | 3 | 4;

export interface VoteParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  option: VoteOption;
}

/** Conditional approve BMX → governanceVoter (only if burn > 0), then `vote(option)`. Base-only. */
export async function buildVoteSteps(params: VoteParams): Promise<TxStep[]> {
  const { client, account, chainId, option } = params;
  if (chainId !== base.id) {
    throw new Error("Governance voting is only available on Base");
  }
  if (!Number.isInteger(option) || option < 1 || option > 4) {
    throw new Error("Vote option must be an integer 1–4");
  }

  const governanceVoter = assertDeployed(chainId, "governanceVoter");
  const { bmxToken } = getContracts(chainId);

  const burnAmount = (await client.readContract({
    abi: governanceVoterAbi,
    address: governanceVoter,
    functionName: "governanceBurnAmount",
  })) as bigint;

  const steps: TxStep[] = [];
  if (burnAmount > BigInt(0)) {
    const approve = await buildConditionalApproveStep(client, {
      id: "approve-bmx",
      label: "Approve BMX",
      token: bmxToken,
      owner: account,
      spender: governanceVoter,
      amount: burnAmount,
    });
    if (approve) steps.push(approve);
  }

  steps.push({
    id: "vote",
    label: "Cast vote",
    request: {
      abi: governanceVoterAbi,
      address: governanceVoter,
      functionName: "vote",
      args: [option],
    },
  });

  return steps;
}
