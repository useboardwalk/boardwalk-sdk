import { lpStakingAbi } from "../registry/abis";
import type { TxStep, WithdrawLpParams } from "../types";

/** `withdraw(amount)` — unstake LP tokens. No approve needed. The `lpStaking`
 *  address is per-launch (resolve via `getLaunchAddresses`). */
export function buildWithdrawLpSteps(params: WithdrawLpParams): TxStep[] {
  const { lpStaking, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Withdraw amount must be greater than 0");
  return [
    {
      id: "withdraw-lp",
      label: "Unstake LP",
      request: {
        abi: lpStakingAbi,
        address: lpStaking,
        functionName: "withdraw",
        args: [amount],
      },
    },
  ];
}
