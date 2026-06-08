// Ported from token-launcher/hooks/contracts/useClaimPresaleTokens.ts.
import type { Address } from "viem";
import { presaleManagerAbi } from "../registry/abis";
import type { TxStep } from "../flow/types";

export interface ClaimParams {
  /** PresaleManager address for the launch (see `getLaunch().presaleManager`). */
  presale: Address;
}

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
