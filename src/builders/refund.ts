import { presaleManagerAbi } from "../registry/abis";
import type { RefundParams, TxStep } from "../types";

/** `refund()` — reclaim a contribution after a launch FAILS to graduate. */
export function buildRefundSteps(params: RefundParams): TxStep[] {
  return [
    {
      id: "refund",
      label: "Refund contribution",
      request: {
        abi: presaleManagerAbi,
        address: params.presale,
        functionName: "refund",
      },
    },
  ];
}
