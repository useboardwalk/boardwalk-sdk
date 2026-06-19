// Ported from token-launcher/hooks/contracts/useClaimParticipationRewards.ts.
import { participationDistributorAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import type { ClaimParticipationRewardsParams, TxStep } from "../types";

/** `claimAll(epochs)` — claim participation BMX rewards across the given epochs.
 *  Base-only — throws where the participation distributor is undeployed. */
export function buildClaimParticipationRewardsSteps(
  params: ClaimParticipationRewardsParams,
): TxStep[] {
  const { chainId, epochs } = params;
  if (epochs.length === 0)
    throw new Error("Provide at least one epoch to claim");
  const participationDistributor = assertDeployed(
    chainId,
    "participationDistributor",
  );
  return [
    {
      id: "claim-participation",
      label: "Claim participation rewards",
      request: {
        abi: participationDistributorAbi,
        address: participationDistributor,
        functionName: "claimAll",
        args: [epochs],
      },
    },
  ];
}
