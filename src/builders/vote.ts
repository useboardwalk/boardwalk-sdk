// Ported from token-launcher/hooks/contracts/useGovernanceVote.ts. The
// eligibility pre-checks mirror the guards in `GovernanceVoter.vote()`
// (boardwalk-contracts src/governance/GovernanceVoter.sol) so we refuse to
// emit a tx the contract is guaranteed to revert. A caller that already gates
// eligibility itself (the token-launcher governance UI does) can opt out via
// `checkEligibility: false`, which skips those reads + guards and lets an
// ineligible vote revert on-chain — matching the UI hook's behavior.
import { erc20Abi, type Address, type PublicClient } from "viem";
import { base } from "viem/chains";
import { governanceVoterAbi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import {
  BPS_DENOMINATOR,
  MULTICALL3_ADDRESS,
  PARTICIPATION_POINTS_GATE_BPS,
} from "../constants";
import type { TxStep, VoteOption, VoteParams } from "../types";

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

/** Conditional approve BMX → governanceVoter (only when burn > 0) + `vote(option)`.
 *  Shared by the checked and unchecked paths once burn amount + allowance are known. */
async function assembleVoteSteps(
  client: PublicClient,
  args: {
    governanceVoter: Address;
    bmxToken: Address;
    account: Address;
    option: VoteOption;
    burnAmount: bigint;
    allowance: bigint;
  },
): Promise<TxStep[]> {
  const steps: TxStep[] = [];
  if (args.burnAmount > BigInt(0)) {
    const approve = await buildConditionalApproveStep(
      client,
      {
        id: "approve-bmx",
        label: "Approve BMX",
        token: args.bmxToken,
        owner: args.account,
        spender: args.governanceVoter,
        amount: args.burnAmount,
      },
      args.allowance,
    );
    if (approve) steps.push(approve);
  }

  steps.push({
    id: "vote",
    label: "Cast vote",
    request: {
      abi: governanceVoterAbi,
      address: args.governanceVoter,
      functionName: "vote",
      args: [args.option],
    },
  });

  return steps;
}

/** Conditional approve BMX → governanceVoter (only if burn > 0), then `vote(option)`. Base-only.
 *  Runs the on-chain eligibility pre-checks by default; pass `checkEligibility: false`
 *  to skip them (and the extra reads) when the caller gates eligibility itself. */
export async function buildVoteSteps(params: VoteParams): Promise<TxStep[]> {
  const { client, account, chainId, option } = params;
  const checkEligibility = params.checkEligibility ?? true;
  if (chainId !== base.id) {
    throw new Error("Governance voting is only available on Base");
  }
  if (!Number.isInteger(option) || option < 1 || option > 4) {
    throw new Error("Vote option must be an integer 1–4");
  }

  const governanceVoter = assertDeployed(chainId, "governanceVoter");
  const { bmxToken } = getContracts(chainId);

  if (!checkEligibility) {
    // Lean path: read only what the steps need — the burn amount (to decide the
    // approve) and the BMX allowance — in one multicall. Skips the eligibility
    // reads + guards; matches token-launcher's useGovernanceVote.ts, which gates
    // eligibility in the UI and lets an ineligible vote revert on-chain.
    const [burnAmount, allowance] = await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        {
          abi: governanceVoterAbi,
          address: governanceVoter,
          functionName: "governanceBurnAmount",
        },
        {
          abi: erc20Abi,
          address: bmxToken,
          functionName: "allowance",
          args: [account, governanceVoter],
        },
      ],
    });
    return assembleVoteSteps(client, {
      governanceVoter,
      bmxToken,
      account,
      option,
      burnAmount,
      allowance,
    });
  }

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

  return assembleVoteSteps(client, {
    governanceVoter,
    bmxToken,
    account,
    option,
    burnAmount,
    allowance,
  });
}
