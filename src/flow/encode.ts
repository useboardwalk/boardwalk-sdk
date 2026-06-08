import { Attribution } from "ox/erc8021";
import { concatHex, encodeFunctionData, type Address, type Hex } from "viem";
import { BUILDER_CODE } from "../constants";
import type { EncodedCall, TxRequest, TxStep, TxWriteRequest } from "../types";

/**
 * ERC-8021 builder-code suffix — ENFORCED on every SDK-built transaction.
 *
 * The frontend appends this at the wagmi send chokepoint; agents submit through
 * their own wallet (e.g. `send_calls`), so the SDK appends it directly to `data`
 * — the only way attribution survives an arbitrary submit path. The code is
 * fixed in `constants.ts` (`BUILDER_CODE`); there is intentionally no per-call,
 * CLI, or env override.
 */
export const BUILDER_CODE_SUFFIX: Hex = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
});

function isWriteRequest(req: TxRequest): req is TxWriteRequest {
  return "abi" in req;
}

interface RawCall {
  to: Address;
  data: Hex;
  value: bigint;
}

/** Encode a single request to `{to,data,value}`, appending the enforced builder-code suffix. */
export function encodeRequest(req: TxRequest): RawCall {
  let to: Address;
  let data: Hex;
  let value: bigint;

  if (isWriteRequest(req)) {
    to = req.address;
    data = encodeFunctionData({
      abi: req.abi,
      functionName: req.functionName,
      args: (req.args ?? []) as readonly unknown[],
    });
    value = req.value ?? BigInt(0);
  } else {
    to = req.to;
    data = req.data ?? "0x";
    value = req.value ?? BigInt(0);
  }

  if (BUILDER_CODE_SUFFIX && BUILDER_CODE_SUFFIX !== "0x") {
    data = concatHex([data, BUILDER_CODE_SUFFIX]);
  }

  return { to, data, value };
}

/** Encode a step to a ready-to-submit `EncodedCall` (value as a decimal wei string). */
export function encodeStep(step: TxStep, chainId: number): EncodedCall {
  const { to, data, value } = encodeRequest(step.request);
  return {
    id: step.id,
    label: step.label,
    to,
    data,
    value: value.toString(),
    chainId,
  };
}

/** Encode an ordered list of steps (e.g. approve → action) for batched submission. */
export function encodeSteps(steps: TxStep[], chainId: number): EncodedCall[] {
  return steps.map((step) => encodeStep(step, chainId));
}
