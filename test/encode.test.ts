import { describe, it, expect } from "vitest";
import { concatHex, encodeFunctionData, erc20Abi, type Address } from "viem";
import { base, mainnet } from "viem/chains";
import { encodeRequest, encodeStep } from "../src/flow/encode";
import { BUILDER_CODE_SUFFIX } from "../src/flow/encode";

const TOKEN = "0x4200000000000000000000000000000000000006" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;

describe("encodeRequest", () => {
  const approve = {
    abi: erc20Abi,
    address: TOKEN,
    functionName: "approve",
    args: [SPENDER, BigInt(5)],
  } as const;
  const approveCalldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [SPENDER, BigInt(5)],
  });

  it("encodes a write request to calldata + the builder-code suffix on Base", () => {
    const { to, data, value } = encodeRequest(approve, base.id);
    expect(to).toBe(TOKEN);
    expect(value).toBe(BigInt(0));
    expect(data).toBe(concatHex([approveCalldata, BUILDER_CODE_SUFFIX]));
  });

  it("does not append the builder-code suffix off Base", () => {
    const { data } = encodeRequest(approve, mainnet.id);
    expect(data).toBe(approveCalldata);
  });

  it("appends the suffix to a raw send on Base", () => {
    const { to, data, value } = encodeRequest(
      { to: SPENDER, value: BigInt(7) },
      base.id,
    );
    expect(to).toBe(SPENDER);
    expect(data).toBe(concatHex(["0x", BUILDER_CODE_SUFFIX]));
    expect(value).toBe(BigInt(7));
  });

  it("leaves a raw send untouched off Base", () => {
    const { data } = encodeRequest(
      { to: SPENDER, value: BigInt(7) },
      mainnet.id,
    );
    expect(data).toBe("0x");
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
