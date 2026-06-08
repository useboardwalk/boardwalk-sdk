// Framework-agnostic transaction model.
// Ported from token-launcher/components/transaction-flow/types.ts — the SDK
// resolves all reads at build time, so steps carry static requests (no React,
// no dynamic builders, no executor).
import type { Abi, Address, Hex } from "viem";

/** A contract-write intent — encoded to calldata via the ABI. */
export interface TxWriteRequest {
  abi: Abi;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

/** A raw send — calldata already known (or empty). */
export interface TxSendRequest {
  to: Address;
  data?: Hex;
  value?: bigint;
}

/** Either a contract write (has `abi`) or a raw send (has `to`). */
export type TxRequest = TxWriteRequest | TxSendRequest;

/** One step of a multi-step flow (e.g. `approve` → action). */
export interface TxStep {
  id: string;
  label: string;
  request: TxRequest;
}

/** An encoded, ready-to-submit call. `value` is a decimal wei string. */
export interface EncodedCall {
  id: string;
  label: string;
  to: Address;
  data: Hex;
  value: string;
  chainId: number;
}

export function isWriteRequest(req: TxRequest): req is TxWriteRequest {
  return "abi" in req;
}
