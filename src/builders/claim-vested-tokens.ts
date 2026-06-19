// Ported from token-launcher/hooks/contracts/useClaimVestedTokens.ts.
import { vestingStreamAbi } from "../registry/abis";
import type { ClaimVestedTokensParams, TxStep } from "../types";

/** `claim(allocationId)` — claim vested launch tokens for one allocation. The
 *  VestingStream address is per-launch (resolve via `getLaunchAddresses`). */
export function buildClaimVestedTokensSteps(
  params: ClaimVestedTokensParams,
): TxStep[] {
  return [
    {
      id: "claim-vested",
      label: "Claim vested tokens",
      request: {
        abi: vestingStreamAbi,
        address: params.vestingStream,
        functionName: "claim",
        args: [params.allocationId],
      },
    },
  ];
}
