// Ported from token-launcher/hooks/contracts/useGovernanceVote.ts. The
// eligibility pre-checks mirror the guards in `GovernanceVoter.vote()`
// (boardwalk-contracts src/governance/GovernanceVoter.sol) so we refuse to
// emit a tx the contract is guaranteed to revert.
import { erc20Abi } from "viem";
import { base } from "viem/chains";
import { governanceVoterAbi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import {
  BPS_DENOMINATOR,
  MULTICALL3_ADDRESS,
  PARTICIPATION_POINTS_GATE_BPS,
} from "../constants";
import type { TxStep, VoteParams } from "../types";

/** Minimal RewardTracker fragment for the `depositBalances` eligibility reads
 *  `vote()` performs on-chain (no full RewardTracker ABI exists in the registry). */
const rewardTrackerAbi = [
  {
    type: "function",
    name: "depositBalances",
    inputs: [
      { name: "account", type: "address" },
      { name: "depositToken", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

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

  // Voter config in one multicall. The tracker addresses come from the voter
  // itself (not the registry) so the eligibility reads below match exactly
  // what `vote()` checks.
  const [burnAmount, epoch, sbfBmx, stakedBmxTracker, bnBmx] =
    await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "governanceBurnAmount",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "currentEpoch",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "SBF_BMX",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "STAKED_BMX_TRACKER",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "BN_BMX",
        },
      ],
    });

  // Per-wallet eligibility in a second multicall (its inputs — epoch and the
  // tracker addresses — depend on the first). The BMX allowance rides along so
  // the approve step needs no extra round-trip.
  const [userVote, votingWeight, stakedBmx, stakedMp, allowance] =
    await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "getUserVote",
          args: [epoch, account],
        },
        {
          abi: erc20Abi,
          address: sbfBmx,
          functionName: "balanceOf",
          args: [account],
        },
        {
          abi: rewardTrackerAbi,
          address: stakedBmxTracker,
          functionName: "depositBalances",
          args: [account, bmxToken],
        },
        {
          abi: rewardTrackerAbi,
          address: sbfBmx,
          functionName: "depositBalances",
          args: [account, bnBmx],
        },
        {
          abi: erc20Abi,
          address: bmxToken,
          functionName: "allowance",
          args: [account, governanceVoter],
        },
      ],
    });

  // Same order as the contract's reverts: AlreadyVoted →
  // InsufficientVotingWeight → InsufficientParticipationPoints.
  if (userVote.option !== 0) {
    throw new Error(
      `Wallet has already voted in the current epoch (epoch ${epoch}, option ${userVote.option})`,
    );
  }
  if (votingWeight === BigInt(0)) {
    throw new Error(
      "Wallet has no voting power for the current epoch — stake BMX before voting",
    );
  }
  if (
    stakedBmx > BigInt(0) &&
    stakedMp * BPS_DENOMINATOR < stakedBmx * PARTICIPATION_POINTS_GATE_BPS
  ) {
    throw new Error(
      `Wallet's staked multiplier points are below the participation gate ` +
        `(${Number(PARTICIPATION_POINTS_GATE_BPS) / 100}% of staked BMX) — compound multiplier points before voting`,
    );
  }

  const steps: TxStep[] = [];
  if (burnAmount > BigInt(0)) {
    const approve = await buildConditionalApproveStep(
      client,
      {
        id: "approve-bmx",
        label: "Approve BMX",
        token: bmxToken,
        owner: account,
        spender: governanceVoter,
        amount: burnAmount,
      },
      allowance,
    );
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
