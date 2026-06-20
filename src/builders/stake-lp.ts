// Ported from token-launcher/hooks/contracts/useStakeLP.ts.
import { lpStakingAbi } from "../registry/abis";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { StakeLpParams, TxStep } from "../types";

/** Conditional approve LP token → LPStaking, then `stake(amount)`. The
 *  `lpStaking` address is per-launch (resolve via `getLaunchAddresses`). */
export async function buildStakeLpSteps(
  params: StakeLpParams,
): Promise<TxStep[]> {
  const { client, account, lpStaking, lpToken, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Stake amount must be greater than 0");

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(client, {
    id: "approve-lp",
    label: "Approve LP token",
    token: lpToken,
    owner: account,
    spender: lpStaking,
    amount,
  });
  if (approve) steps.push(approve);

  steps.push({
    id: "stake-lp",
    label: "Stake LP",
    request: {
      abi: lpStakingAbi,
      address: lpStaking,
      functionName: "stake",
      args: [amount],
    },
  });

  return steps;
}
