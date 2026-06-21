import { feeDistributorAbi } from "../registry/abis";
import type { ClaimIssuerFeesParams, TxStep } from "../types";

/** `claimAsRaiseToken(recipientIdx, minRaiseTokenOut, deadline)` — an issuer-fee
 *  recipient claims their accrued fees swapped to the raise token. The
 *  FeeDistributor address is per-launch (resolve via `getLaunchAddresses`). */
export function buildClaimIssuerFeesSteps(
  params: ClaimIssuerFeesParams,
): TxStep[] {
  const { feeDistributor, recipientIdx, minRaiseTokenOut, deadline } = params;
  return [
    {
      id: "claim-issuer-fees",
      label: "Claim issuer fees",
      request: {
        abi: feeDistributorAbi,
        address: feeDistributor,
        functionName: "claimAsRaiseToken",
        args: [recipientIdx, minRaiseTokenOut, deadline],
      },
    },
  ];
}
