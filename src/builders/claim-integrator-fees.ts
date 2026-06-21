import { integratorFeeCollectorAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import type { ClaimIntegratorFeesParams, TxStep } from "../types";

/** `claim(token, minOut, deadline)` on the per-chain IntegratorFeeCollector
 *  singleton — the integrator (msg.sender) claims a launch token's accrued tax
 *  swapped to the raise token. Derive `minOut` from the collector's `quote`. */
export function buildClaimIntegratorFeesSteps(
  params: ClaimIntegratorFeesParams,
): TxStep[] {
  const { chainId, token, minOut, deadline } = params;
  const collector = assertDeployed(chainId, "integratorFeeCollector");
  return [
    {
      id: "claim-integrator-fees",
      label: "Claim integrator fees",
      request: {
        abi: integratorFeeCollectorAbi,
        address: collector,
        functionName: "claim",
        args: [token, minOut, deadline],
      },
    },
  ];
}
