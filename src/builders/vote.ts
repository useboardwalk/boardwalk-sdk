// The eligibility pre-checks mirror the guards in `GovernanceVoter.vote()`
// (boardwalk-contracts src/governance/GovernanceVoter.sol) so we refuse to
// emit a tx the contract is guaranteed to revert.
import { erc20Abi } from "viem";
import { mainnet } from "viem/chains";
import { governanceVoterAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
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

/** Conditional approve BWLK → governanceVoter (only if burn > 0), then `vote(option)`.
 *  Weekly revenue vote on Ethereum: epoch N's vote directs epoch N+1's budget. */
export async function buildVoteSteps(params: VoteParams): Promise<TxStep[]> {
  const { client, account, chainId, option } = params;
  if (chainId !== mainnet.id) {
    throw new Error("Governance voting is only available on Ethereum");
  }
  if (!Number.isInteger(option) || option < 1 || option > 4) {
    throw new Error("Vote option must be an integer 1–4");
  }

  const governanceVoter = assertDeployed(chainId, "governanceVoter");

  // Voter config in one multicall. The token/tracker addresses come from the
  // voter itself (not the registry) so the eligibility reads below match
  // exactly what `vote()` checks.
  const [burnAmount, epoch, sbfBwlk, stakedBwlkTracker, bnBwlk, bwlkToken, optionEligible] =
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
          functionName: "SBF_BWLK",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "STAKED_BWLK_TRACKER",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "BN_BWLK",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "BWLK",
        },
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "isOptionEligible",
          args: [option],
        },
      ],
    });

  // Per-wallet eligibility in a second multicall (its inputs — epoch and the
  // tracker addresses — depend on the first). The BWLK allowance rides along so
  // the approve step needs no extra round-trip.
  const [userVote, votingWeight, stakedBwlk, stakedMp, allowance] =
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
          address: sbfBwlk,
          functionName: "balanceOf",
          args: [account],
        },
        {
          abi: rewardTrackerAbi,
          address: stakedBwlkTracker,
          functionName: "depositBalances",
          args: [account, bwlkToken],
        },
        {
          abi: rewardTrackerAbi,
          address: sbfBwlk,
          functionName: "depositBalances",
          args: [account, bnBwlk],
        },
        {
          abi: erc20Abi,
          address: bwlkToken,
          functionName: "allowance",
          args: [account, governanceVoter],
        },
      ],
    });

  // Same order as the contract's reverts: AlreadyVoted →
  // InsufficientVotingWeight → InsufficientParticipationPoints →
  // OptionIneligible.
  if (userVote.option !== 0) {
    throw new Error(
      `Wallet has already voted in the current epoch (epoch ${epoch}, option ${userVote.option})`,
    );
  }
  if (votingWeight === BigInt(0)) {
    throw new Error(
      "Wallet has no voting power for the current epoch — stake BWLK before voting",
    );
  }
  if (
    stakedBwlk > BigInt(0) &&
    stakedMp * BPS_DENOMINATOR < stakedBwlk * PARTICIPATION_POINTS_GATE_BPS
  ) {
    throw new Error(
      `Wallet's staked multiplier points are below the participation gate ` +
        `(${Number(PARTICIPATION_POINTS_GATE_BPS) / 100}% of staked BWLK) — compound multiplier points before voting`,
    );
  }
  if (!optionEligible) {
    throw new Error(
      `Vote option ${option} is ineligible this epoch (it won 3 consecutive epochs) — pick another option`,
    );
  }

  const steps: TxStep[] = [];
  if (burnAmount > BigInt(0)) {
    const approve = await buildConditionalApproveStep(
      client,
      {
        id: "approve-bwlk",
        label: "Approve BWLK",
        token: bwlkToken,
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
