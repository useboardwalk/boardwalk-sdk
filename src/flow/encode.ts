import { concatHex, encodeFunctionData, type Address, type Hex } from "viem";
import {
  isWriteRequest,
  type EncodedCall,
  type TxRequest,
  type TxStep,
} from "./types";
import { builderCodeSuffix } from "./attribution";

export interface EncodeOptions {
  /** ERC-8021 builder code. Omit to use `BOARDWALK_BUILDER_CODE`; pass `""` to disable. */
  builderCode?: string;
}

interface RawCall {
  to: Address;
  data: Hex;
  value: bigint;
}

/** Encode a single request to `{to,data,value}`, appending the builder-code suffix. */
export function encodeRequest(
  req: TxRequest,
  options: EncodeOptions = {},
): RawCall {
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

  const suffix = builderCodeSuffix(options.builderCode);
  if (suffix && suffix !== "0x") {
    data = concatHex([data, suffix]);
  }

  return { to, data, value };
}

/** Encode a step to a ready-to-submit `EncodedCall` (value as a decimal wei string). */
export function encodeStep(
  step: TxStep,
  chainId: number,
  options: EncodeOptions = {},
): EncodedCall {
  const { to, data, value } = encodeRequest(step.request, options);
  return {
    id: step.id,
    label: step.label,
    to,
    data,
    value: value.toString(),
    chainId,
  };
}

/** Encode an ordered list of steps (e.g. approve → action) for `send_calls`. */
export function encodeSteps(
  steps: TxStep[],
  chainId: number,
  options: EncodeOptions = {},
): EncodedCall[] {
  return steps.map((step) => encodeStep(step, chainId, options));
}
