// Ported from token-launcher/hooks/contracts/useClaimPresaleTokens.ts.
import { presaleManagerAbi } from "../registry/abis";
import type { ClaimParams, TxStep } from "../types";

/** `claimTokens()` — claim purchased tokens after a successful (seeded) auction. */
export function buildClaimSteps(params: ClaimParams): TxStep[] {
  return [
    {
      id: "claim",
      label: "Claim tokens",
      request: {
        abi: presaleManagerAbi,
        address: params.presale,
        functionName: "claimTokens",
      },
    },
  ];
}
