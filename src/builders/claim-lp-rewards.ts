// Ported from token-launcher/hooks/contracts/useClaimStakingRewards.ts (single)
// and useClaimAllStakingRewards.ts (multi).
import type { Address } from "viem";
import { lpStakingAbi } from "../registry/abis";
import type {
  ClaimAllLpRewardsParams,
  ClaimLpRewardsParams,
  TxStep,
} from "../types";

/** `claim()` — claim accrued LP staking rewards from one per-launch LPStaking. */
export function buildClaimLpRewardsSteps(
  params: ClaimLpRewardsParams,
): TxStep[] {
  return [claimStep(params.lpStaking)];
}

/** One `claim()` per LPStaking — claim rewards across several launches at once. */
export function buildClaimAllLpRewardsSteps(
  params: ClaimAllLpRewardsParams,
): TxStep[] {
  if (params.lpStakings.length === 0)
    throw new Error("Provide at least one LP staking address");
  return params.lpStakings.map(claimStep);
}

function claimStep(lpStaking: Address): TxStep {
  return {
    id: `claim-lp-rewards-${lpStaking}`,
    label: "Claim LP rewards",
    request: {
      abi: lpStakingAbi,
      address: lpStaking,
      functionName: "claim",
    },
  };
}
