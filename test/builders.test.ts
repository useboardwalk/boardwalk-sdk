import { describe, it, expect } from "vitest";
import {
  concatHex,
  encodeFunctionData,
  type Address,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import { buildContributeSteps } from "../src/builders/contribute";
import { buildClaimSteps } from "../src/builders/claim";
import { buildStakeBmxSteps } from "../src/builders/stake-bmx";
import { buildVoteSteps } from "../src/builders/vote";
import {
  governanceVoterAbi,
  presaleManagerAbi,
  rewardRouterAbi,
} from "../src/registry/abis";
import { getContracts } from "../src/registry/contracts";
import { encodeStep, BUILDER_CODE_SUFFIX } from "../src/flow/encode";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const PRESALE = "0x2222222222222222222222222222222222222222" as Address;

/** Expected encoded `data` for a write = calldata + the enforced builder-code suffix. */
function expectedData(
  abi: Parameters<typeof encodeFunctionData>[0]["abi"],
  functionName: string,
  args?: readonly unknown[],
): string {
  const base = encodeFunctionData({ abi, functionName, args } as never);
  return concatHex([base, BUILDER_CODE_SUFFIX]);
}

/** A viem-shaped PublicClient whose `readContract` is keyed by functionName. */
function mockClient(reads: Record<string, unknown>): PublicClient {
  return {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName in reads) return reads[functionName];
      throw new Error(`unexpected read: ${functionName}`);
    },
  } as unknown as PublicClient;
}

describe("buildContributeSteps", () => {
  it("includes a conditional approve when allowance is insufficient", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildContributeSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      presale: PRESALE,
      amount: BigInt(1000),
    });
    expect(steps.map((s) => s.id)).toEqual([
      "approve-raise-token",
      "contribute",
    ]);
    const contribute = encodeStep(steps[steps.length - 1]!, base.id);
    expect(contribute.to).toBe(PRESALE);
    expect(contribute.data).toBe(
      expectedData(presaleManagerAbi, "contribute", [BigInt(1000)]),
    );
  });

  it("skips approve when allowance already covers the amount", async () => {
    const client = mockClient({ allowance: BigInt(10_000) });
    const steps = await buildContributeSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      presale: PRESALE,
      amount: BigInt(1000),
    });
    expect(steps.map((s) => s.id)).toEqual(["contribute"]);
  });
});

describe("buildClaimSteps", () => {
  it("is a single claimTokens call to the presale", () => {
    const steps = buildClaimSteps({ presale: PRESALE });
    expect(steps).toHaveLength(1);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(PRESALE);
    expect(call.data).toBe(expectedData(presaleManagerAbi, "claimTokens"));
  });
});

describe("buildStakeBmxSteps", () => {
  it("approves the staked-BMX tracker then stakes", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildStakeBmxSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      amount: BigInt(5),
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bmx", "stake-bmx"]);
    const stake = encodeStep(steps[1]!, base.id);
    expect(stake.to).toBe(getContracts(base.id).rewardRouter);
    expect(stake.data).toBe(
      expectedData(rewardRouterAbi, "stakeBmx", [BigInt(5)]),
    );
  });

  it("throws on a chain where rewardRouter is a placeholder", async () => {
    const client = mockClient({});
    await expect(
      buildStakeBmxSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        amount: BigInt(5),
      }),
    ).rejects.toThrow();
  });
});

describe("buildVoteSteps", () => {
  it("reads the burn amount and approves when burn > 0", async () => {
    const client = mockClient({
      governanceBurnAmount: BigInt(100),
      allowance: BigInt(0),
    });
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      option: 2,
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bmx", "vote"]);
    expect(encodeStep(steps[1]!, base.id).data).toBe(
      expectedData(governanceVoterAbi, "vote", [2]),
    );
  });

  it("skips approve when the burn amount is zero", async () => {
    const client = mockClient({ governanceBurnAmount: BigInt(0) });
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      option: 1,
    });
    expect(steps.map((s) => s.id)).toEqual(["vote"]);
  });

  it("rejects non-Base chains", async () => {
    const client = mockClient({});
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        option: 1,
      }),
    ).rejects.toThrow(/Base/);
  });
});
