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
import { buildLaunchSteps } from "../src/builders/launch";
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

/** A viem-shaped PublicClient whose `readContract`/`multicall` reads are keyed
 *  by functionName. A function value is called with the contract entry — use it
 *  when one functionName appears twice in a multicall (e.g. `depositBalances`)
 *  and the result depends on the target address. */
function mockClient(reads: Record<string, unknown>): PublicClient {
  const resolve = (call: { functionName: string }) => {
    if (!(call.functionName in reads)) {
      throw new Error(`unexpected read: ${call.functionName}`);
    }
    const value = reads[call.functionName];
    return typeof value === "function" ? value(call) : value;
  };
  return {
    readContract: async (call: { functionName: string }) => resolve(call),
    multicall: async ({
      contracts,
    }: {
      contracts: readonly { functionName: string }[];
    }) => contracts.map(resolve),
  } as unknown as PublicClient;
}

describe("buildLaunchSteps", () => {
  it("rejects an express launch without an issuer-fee recipient (contract: ExpressRequiresOneFeeRecipient)", async () => {
    // Throws before any reads, so the client is never touched.
    await expect(
      buildLaunchSteps({
        client: {} as PublicClient,
        account: ACCOUNT,
        chainId: base.id,
        input: {
          name: "Test Token",
          ticker: "TEST",
          category: "meme-culture",
          path: "express",
        },
      }),
    ).rejects.toThrow(/issuer-fee recipient/i);
  });
});

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
  const SBF_BMX = "0x3333333333333333333333333333333333333333" as Address;
  const STAKED_BMX_TRACKER =
    "0x4444444444444444444444444444444444444444" as Address;
  const BN_BMX = "0x5555555555555555555555555555555555555555" as Address;

  /** Reads for a wallet that passes every `vote()` eligibility guard:
   *  no vote cast this epoch, non-zero sbfBMX weight, and staked multiplier
   *  points above the participation gate. */
  function eligibleVoterReads(overrides: Record<string, unknown> = {}) {
    return {
      governanceBurnAmount: BigInt(0),
      currentEpoch: BigInt(7),
      SBF_BMX,
      STAKED_BMX_TRACKER,
      BN_BMX,
      getUserVote: { weight: BigInt(0), option: 0 },
      balanceOf: BigInt(1_000), // sbfBMX voting weight
      // stakedBmxTracker → staked BMX; sbfBMX tracker → staked multiplier points
      depositBalances: ({ address }: { address: Address }) =>
        address === STAKED_BMX_TRACKER ? BigInt(1_000) : BigInt(100),
      allowance: BigInt(0),
      ...overrides,
    };
  }

  it("reads the burn amount and approves when burn > 0", async () => {
    const client = mockClient(
      eligibleVoterReads({ governanceBurnAmount: BigInt(100) }),
    );
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
    const client = mockClient(eligibleVoterReads());
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

  it("refuses when the wallet already voted this epoch (contract: AlreadyVoted)", async () => {
    const client = mockClient(
      eligibleVoterReads({ getUserVote: { weight: BigInt(500), option: 3 } }),
    );
    await expect(
      buildVoteSteps({ client, account: ACCOUNT, chainId: base.id, option: 1 }),
    ).rejects.toThrow(/already voted/i);
  });

  it("refuses when the wallet has no voting power (contract: InsufficientVotingWeight)", async () => {
    const client = mockClient(eligibleVoterReads({ balanceOf: BigInt(0) }));
    await expect(
      buildVoteSteps({ client, account: ACCOUNT, chainId: base.id, option: 1 }),
    ).rejects.toThrow(/no voting power/i);
  });

  it("refuses when multiplier points are below the gate (contract: InsufficientParticipationPoints)", async () => {
    // staked 10_000 BMX needs ≥ 150 staked multiplier points (1.5%); 100 is short.
    const client = mockClient(
      eligibleVoterReads({
        depositBalances: ({ address }: { address: Address }) =>
          address === STAKED_BMX_TRACKER ? BigInt(10_000) : BigInt(100),
      }),
    );
    await expect(
      buildVoteSteps({ client, account: ACCOUNT, chainId: base.id, option: 1 }),
    ).rejects.toThrow(/participation gate/i);
  });

  it("skips the participation gate when no BMX is staked but weight is non-zero", async () => {
    const client = mockClient(
      eligibleVoterReads({ depositBalances: () => BigInt(0) }),
    );
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      option: 4,
    });
    expect(steps.map((s) => s.id)).toEqual(["vote"]);
  });
});
