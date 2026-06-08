import { describe, it, expect } from "vitest";
import { concatHex, encodeFunctionData, erc20Abi, type Address } from "viem";
import { encodeRequest, encodeStep } from "../src/flow/encode";
import { BUILDER_CODE_SUFFIX } from "../src/flow/encode";

const TOKEN = "0x4200000000000000000000000000000000000006" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;

describe("encodeRequest", () => {
  it("encodes a write request to calldata + the enforced builder-code suffix", () => {
    const base = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    const { to, data, value } = encodeRequest({
      abi: erc20Abi,
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    expect(to).toBe(TOKEN);
    expect(value).toBe(BigInt(0));
    expect(data).toBe(concatHex([base, BUILDER_CODE_SUFFIX]));
  });

  it("always appends the builder-code suffix (it is enforced, not overridable)", () => {
    const base = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    const { data } = encodeRequest({
      abi: erc20Abi,
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    expect(data.endsWith(BUILDER_CODE_SUFFIX.slice(2))).toBe(true);
    expect(data.length).toBeGreaterThan(base.length);
  });

  it("appends the suffix to a raw send too", () => {
    const { to, data, value } = encodeRequest({
      to: SPENDER,
      value: BigInt(7),
    });
    expect(to).toBe(SPENDER);
    expect(data).toBe(concatHex(["0x", BUILDER_CODE_SUFFIX]));
    expect(value).toBe(BigInt(7));
  });
});

describe("encodeStep", () => {
  it("returns value as a decimal string and carries id/label/chainId", () => {
    const call = encodeStep(
      { id: "x", label: "X", request: { to: SPENDER, value: BigInt(7) } },
      8453,
    );
    expect(call).toMatchObject({
      id: "x",
      label: "X",
      to: SPENDER,
      value: "7",
      chainId: 8453,
    });
  });
});
