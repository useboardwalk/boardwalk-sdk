import { describe, it, expect } from "vitest";
import { concatHex, encodeFunctionData, erc20Abi, type Address } from "viem";
import { Attribution } from "ox/erc8021";
import { encodeRequest, encodeStep } from "../src/flow/encode";

const TOKEN = "0x4200000000000000000000000000000000000006" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;

describe("encodeRequest", () => {
  it("encodes a write request to calldata matching viem", () => {
    const { to, data, value } = encodeRequest(
      {
        abi: erc20Abi,
        address: TOKEN,
        functionName: "approve",
        args: [SPENDER, BigInt(5)],
      },
      { builderCode: "" }, // disable attribution for a deterministic comparison
    );
    expect(to).toBe(TOKEN);
    expect(value).toBe(BigInt(0));
    expect(data).toBe(
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [SPENDER, BigInt(5)],
      }),
    );
  });

  it("appends an ERC-8021 builder-code suffix to data", () => {
    const base = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    const code = "bc_test1234";
    const { data } = encodeRequest(
      {
        abi: erc20Abi,
        address: TOKEN,
        functionName: "approve",
        args: [SPENDER, BigInt(5)],
      },
      { builderCode: code },
    );
    const suffix = Attribution.toDataSuffix({ codes: [code] });
    expect(data).toBe(concatHex([base, suffix]));
    expect(data.length).toBeGreaterThan(base.length);
  });

  it("omits the suffix when builderCode is empty", () => {
    const base = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [SPENDER, BigInt(5)],
    });
    const { data } = encodeRequest(
      {
        abi: erc20Abi,
        address: TOKEN,
        functionName: "approve",
        args: [SPENDER, BigInt(5)],
      },
      { builderCode: "" },
    );
    expect(data).toBe(base);
  });

  it("passes through a raw send request", () => {
    const { to, data, value } = encodeRequest(
      { to: SPENDER, value: BigInt(7) },
      { builderCode: "" },
    );
    expect(to).toBe(SPENDER);
    expect(data).toBe("0x");
    expect(value).toBe(BigInt(7));
  });
});

describe("encodeStep", () => {
  it("returns value as a decimal string and carries id/label/chainId", () => {
    const call = encodeStep(
      { id: "x", label: "X", request: { to: SPENDER, value: BigInt(7) } },
      8453,
      { builderCode: "" },
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
