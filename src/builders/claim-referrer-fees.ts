import { feeDistributorAbi } from "../registry/abis";
import type { ClaimReferrerFeesParams, TxStep } from "../types";

/** `claimReferrerFees()` — a referrer claims their accrued fee share. The
 *  FeeDistributor address is per-launch (resolve via `getLaunchAddresses`). */
export function buildClaimReferrerFeesSteps(
  params: ClaimReferrerFeesParams,
): TxStep[] {
  return [
    {
      id: "claim-referrer-fees",
      label: "Claim referrer fees",
      request: {
        abi: feeDistributorAbi,
        address: params.feeDistributor,
        functionName: "claimReferrerFees",
      },
    },
  ];
}
