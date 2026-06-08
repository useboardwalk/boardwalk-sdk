// Conditional ERC-20 approval — ported from
// token-launcher/components/transaction-flow/erc20.ts, swapping the wagmi
// `Config` + `wagmi/actions.readContract` for a viem `PublicClient`.
import { erc20Abi, type Address, type PublicClient } from "viem";
import type { TxStep } from "../types";

export interface ApproveParams {
  id: string;
  label: string;
  token: Address;
  owner: Address;
  spender: Address;
  amount: bigint;
}

/** Read the current ERC-20 allowance (owner → spender). */
export async function readAllowance(
  client: PublicClient,
  params: { token: Address; owner: Address; spender: Address },
): Promise<bigint> {
  return client.readContract({
    abi: erc20Abi,
    address: params.token,
    functionName: "allowance",
    args: [params.owner, params.spender],
  });
}

/** True when `owner`'s allowance for `spender` already covers `amount`. */
export async function checkAllowance(
  client: PublicClient,
  params: { token: Address; owner: Address; spender: Address; amount: bigint },
): Promise<boolean> {
  return (await readAllowance(client, params)) >= params.amount;
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

/**
 * Returns an `approve` step when allowance is insufficient, else `null` (skip).
 * Pass `currentAllowance` to skip the allowance RPC read — used when the caller
 * already fetched it (e.g. batched into an upstream multicall to save a round-trip).
 */
export async function buildConditionalApproveStep(
  client: PublicClient,
  params: ApproveParams,
  currentAllowance?: bigint,
): Promise<TxStep | null> {
  const allowance =
    currentAllowance ??
    (await readAllowance(client, {
      token: params.token,
      owner: params.owner,
      spender: params.spender,
    }));
  if (allowance >= params.amount) return null;
  return buildApproveStep(params);
}
