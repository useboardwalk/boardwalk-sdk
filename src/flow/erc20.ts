// Conditional ERC-20 approval — ported from
// token-launcher/components/transaction-flow/erc20.ts, swapping the wagmi
// `Config` + `wagmi/actions.readContract` for a viem `PublicClient`.
import { erc20Abi, type Address, type PublicClient } from "viem";
import type { TxStep } from "./types";

export interface ApproveParams {
  id: string;
  label: string;
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
}

/** True when `owner`'s allowance for `spender` already covers `amount`. */
export async function checkAllowance(
  client: PublicClient,
  params: { token: Address; owner: Address; spender: Address; amount: bigint },
): Promise<boolean> {
  const allowance = await client.readContract({
    abi: erc20Abi,
    address: params.token,
    functionName: "allowance",
    args: [params.owner, params.spender],
  });
  return allowance >= params.amount;
}

/** Build an unconditional ERC-20 `approve` step. */
export function buildApproveStep(params: ApproveParams): TxStep {
  return {
    id: params.id,
    label: params.label,
    request: {
      abi: erc20Abi,
      address: params.token,
      functionName: "approve",
      args: [params.spender, params.amount],
    },
  };
}

/** Returns an `approve` step when allowance is insufficient, else `null` (skip). */
export async function buildConditionalApproveStep(
  client: PublicClient,
  params: ApproveParams,
): Promise<TxStep | null> {
  const hasAllowance = await checkAllowance(client, params);
  if (hasAllowance) return null;
  return buildApproveStep(params);
}
