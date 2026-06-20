import { describe, it, expect } from "vitest";
import {
  concatHex,
  encodeFunctionData,
  zeroAddress,
  type Address,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import { buildContributeSteps } from "../src/builders/contribute";
import { buildClaimSteps } from "../src/builders/claim";
import { buildLaunchSteps } from "../src/builders/launch";
import { buildStakeBmxSteps } from "../src/builders/stake-bmx";
import { buildVoteSteps } from "../src/builders/vote";
import { buildRefundSteps } from "../src/builders/refund";
import { buildSeedLiquiditySteps } from "../src/builders/seed-liquidity";
import { buildUnstakeBmxSteps } from "../src/builders/unstake-bmx";
import { buildHandleRewardsSteps } from "../src/builders/handle-rewards";
import { buildClaimIssuerFeesSteps } from "../src/builders/claim-issuer-fees";
import { buildClaimReferrerFeesSteps } from "../src/builders/claim-referrer-fees";
import { buildClaimIntegratorFeesSteps } from "../src/builders/claim-integrator-fees";
import { buildClaimVestedTokensSteps } from "../src/builders/claim-vested-tokens";
import { buildClaimParticipationRewardsSteps } from "../src/builders/claim-participation-rewards";
import { buildCastVisibilitySteps } from "../src/builders/cast-visibility";
import { buildAddLiquiditySteps } from "../src/builders/add-liquidity";
import { buildRemoveLiquiditySteps } from "../src/builders/remove-liquidity";
import { buildStakeLpSteps } from "../src/builders/stake-lp";
import { buildWithdrawLpSteps } from "../src/builders/withdraw-lp";
import {
  buildClaimLpRewardsSteps,
  buildClaimAllLpRewardsSteps,
} from "../src/builders/claim-lp-rewards";
import { buildSwapSteps } from "../src/builders/swap";
import {
  boardwalkLPManagerAbi,
  boostBurnAbi,
  feeDistributorAbi,
  governanceVoterAbi,
  integratorFeeCollectorAbi,
  lpStakingAbi,
  participationDistributorAbi,
  presaleManagerAbi,
  rewardRouterAbi,
  uniswapV2RouterAbi,
  vestingStreamAbi,
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

  it("checkEligibility:false skips the eligibility reads + guards", async () => {
    // Only the lean reads are provided; the eligibility reads (getUserVote,
    // balanceOf, depositBalances) are intentionally absent so the mock throws
    // ("unexpected read") if the builder touches them.
    const client = mockClient({
      governanceBurnAmount: BigInt(0),
      allowance: BigInt(0),
    });
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      option: 2,
      checkEligibility: false,
    });
    expect(steps.map((s) => s.id)).toEqual(["vote"]);
    expect(encodeStep(steps[0]!, base.id).data).toBe(
      expectedData(governanceVoterAbi, "vote", [2]),
    );
  });

  it("checkEligibility:false still approves when burn > 0", async () => {
    const client = mockClient({
      governanceBurnAmount: BigInt(100),
      allowance: BigInt(0),
    });
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      option: 1,
      checkEligibility: false,
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bmx", "vote"]);
  });
});

// ---------------------------------------------------------------------------
// Additional builders (presale lifecycle, staking, claims, visibility, LP, swap)
// ---------------------------------------------------------------------------

const TOKEN = "0x6666666666666666666666666666666666666666" as Address;
const FEE_DISTRIBUTOR =
  "0x7777777777777777777777777777777777777777" as Address;
const VESTING_STREAM = "0x8888888888888888888888888888888888888888" as Address;
const LP_STAKING = "0x9999999999999999999999999999999999999999" as Address;
const LP_TOKEN = "0x1010101010101010101010101010101010101010" as Address;
const RAISE = "0x1212121212121212121212121212121212121212" as Address;
const DEADLINE = BigInt(9_999_999_999);

describe("buildRefundSteps", () => {
  it("is a single refund call to the presale", () => {
    const steps = buildRefundSteps({ presale: PRESALE });
    expect(steps.map((s) => s.id)).toEqual(["refund"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(PRESALE);
    expect(call.data).toBe(expectedData(presaleManagerAbi, "refund"));
  });
});

describe("buildSeedLiquiditySteps", () => {
  it("is a single seedLiquidity call to the presale", () => {
    const steps = buildSeedLiquiditySteps({ presale: PRESALE });
    expect(steps.map((s) => s.id)).toEqual(["seed-liquidity"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(PRESALE);
    expect(call.data).toBe(expectedData(presaleManagerAbi, "seedLiquidity"));
  });
});

describe("buildUnstakeBmxSteps", () => {
  it("builds unstakeBmx on Base", () => {
    const steps = buildUnstakeBmxSteps({ chainId: base.id, amount: BigInt(5) });
    expect(steps.map((s) => s.id)).toEqual(["unstake-bmx"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(getContracts(base.id).rewardRouter);
    expect(call.data).toBe(
      expectedData(rewardRouterAbi, "unstakeBmx", [BigInt(5)]),
    );
  });

  it("throws on a placeholder (non-Base) chain", () => {
    expect(() =>
      buildUnstakeBmxSteps({ chainId: mainnet.id, amount: BigInt(5) }),
    ).toThrow();
  });

  it("throws on a zero amount", () => {
    expect(() =>
      buildUnstakeBmxSteps({ chainId: base.id, amount: BigInt(0) }),
    ).toThrow();
  });
});

describe("buildHandleRewardsSteps", () => {
  it("builds handleRewards with the four flags in order", () => {
    const steps = buildHandleRewardsSteps({
      chainId: base.id,
      shouldClaimOpBmx: true,
      shouldStakeMultiplierPoints: false,
      shouldClaimWeth: true,
      shouldConvertWethToEth: false,
    });
    expect(steps.map((s) => s.id)).toEqual(["handle-rewards"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(getContracts(base.id).rewardRouter);
    expect(call.data).toBe(
      expectedData(rewardRouterAbi, "handleRewards", [true, false, true, false]),
    );
  });

  it("throws on a placeholder (non-Base) chain", () => {
    expect(() =>
      buildHandleRewardsSteps({
        chainId: mainnet.id,
        shouldClaimOpBmx: true,
        shouldStakeMultiplierPoints: true,
        shouldClaimWeth: true,
        shouldConvertWethToEth: true,
      }),
    ).toThrow();
  });
});

describe("buildClaimIssuerFeesSteps", () => {
  it("builds claimAsRaiseToken on the fee distributor", () => {
    const steps = buildClaimIssuerFeesSteps({
      feeDistributor: FEE_DISTRIBUTOR,
      recipientIdx: BigInt(0),
      minRaiseTokenOut: BigInt(0),
      deadline: DEADLINE,
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-issuer-fees"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(FEE_DISTRIBUTOR);
    expect(call.data).toBe(
      expectedData(feeDistributorAbi, "claimAsRaiseToken", [
        BigInt(0),
        BigInt(0),
        DEADLINE,
      ]),
    );
  });
});

describe("buildClaimReferrerFeesSteps", () => {
  it("builds claimReferrerFees on the fee distributor", () => {
    const steps = buildClaimReferrerFeesSteps({
      feeDistributor: FEE_DISTRIBUTOR,
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-referrer-fees"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(FEE_DISTRIBUTOR);
    expect(call.data).toBe(expectedData(feeDistributorAbi, "claimReferrerFees"));
  });
});

describe("buildClaimIntegratorFeesSteps", () => {
  it("builds claim on the per-chain collector", () => {
    const steps = buildClaimIntegratorFeesSteps({
      chainId: base.id,
      token: TOKEN,
      minOut: BigInt(123),
      deadline: DEADLINE,
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-integrator-fees"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(getContracts(base.id).integratorFeeCollector);
    expect(call.data).toBe(
      expectedData(integratorFeeCollectorAbi, "claim", [
        TOKEN,
        BigInt(123),
        DEADLINE,
      ]),
    );
  });
});

describe("buildClaimVestedTokensSteps", () => {
  it("builds claim(allocationId) on the vesting stream", () => {
    const steps = buildClaimVestedTokensSteps({
      vestingStream: VESTING_STREAM,
      allocationId: BigInt(2),
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-vested"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(VESTING_STREAM);
    expect(call.data).toBe(
      expectedData(vestingStreamAbi, "claim", [BigInt(2)]),
    );
  });
});

describe("buildClaimParticipationRewardsSteps", () => {
  it("builds claimAll(epochs) on Base", () => {
    const epochs = [BigInt(0), BigInt(1)];
    const steps = buildClaimParticipationRewardsSteps({
      chainId: base.id,
      epochs,
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-participation"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(getContracts(base.id).participationDistributor);
    expect(call.data).toBe(
      expectedData(participationDistributorAbi, "claimAll", [epochs]),
    );
  });

  it("throws on a placeholder (non-Base) chain", () => {
    expect(() =>
      buildClaimParticipationRewardsSteps({
        chainId: mainnet.id,
        epochs: [BigInt(0)],
      }),
    ).toThrow();
  });

  it("throws on empty epochs", () => {
    expect(() =>
      buildClaimParticipationRewardsSteps({ chainId: base.id, epochs: [] }),
    ).toThrow();
  });
});

describe("buildCastVisibilitySteps", () => {
  it("approves BMX then boosts", async () => {
    const client = mockClient({
      bmxCost: BigInt(100),
      memberBoostDiscountBps: BigInt(0),
      nftCollection: zeroAddress,
      allowance: BigInt(0),
    });
    const steps = await buildCastVisibilitySteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      token: TOKEN,
      mode: "boost",
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bmx", "boost"]);
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(getContracts(base.id).boostBurn);
    expect(call.data).toBe(expectedData(boostBurnAbi, "boost", [TOKEN]));
  });

  it("skips approve when allowance covers the cost and can deboost", async () => {
    const client = mockClient({
      bmxCost: BigInt(100),
      memberBoostDiscountBps: BigInt(0),
      nftCollection: zeroAddress,
      allowance: BigInt(1_000),
    });
    const steps = await buildCastVisibilitySteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      token: TOKEN,
      mode: "deboost",
    });
    expect(steps.map((s) => s.id)).toEqual(["deboost"]);
    expect(encodeStep(steps[0]!, base.id).data).toBe(
      expectedData(boostBurnAbi, "deboost", [TOKEN]),
    );
  });
});

describe("buildAddLiquiditySteps", () => {
  it("approves both tokens then adds liquidity", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildAddLiquiditySteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      tokenA: TOKEN,
      tokenB: RAISE,
      amountADesired: BigInt(100),
      amountBDesired: BigInt(200),
      amountAMin: BigInt(95),
      amountBMin: BigInt(190),
      deadline: DEADLINE,
    });
    expect(steps.map((s) => s.id)).toEqual([
      "approve-token-a",
      "approve-token-b",
      "add-liquidity",
    ]);
    const call = encodeStep(steps[2]!, base.id);
    expect(call.to).toBe(getContracts(base.id).boardwalkLPManager);
    expect(call.data).toBe(
      expectedData(boardwalkLPManagerAbi, "addLiquidity", [
        TOKEN,
        RAISE,
        BigInt(100),
        BigInt(200),
        BigInt(95),
        BigInt(190),
        ACCOUNT,
        DEADLINE,
      ]),
    );
  });
});

describe("buildRemoveLiquiditySteps", () => {
  it("approves the LP token then removes liquidity", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildRemoveLiquiditySteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      tokenA: TOKEN,
      tokenB: RAISE,
      lpToken: LP_TOKEN,
      liquidity: BigInt(50),
      amountAMin: BigInt(10),
      amountBMin: BigInt(20),
      deadline: DEADLINE,
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-lp", "remove-liquidity"]);
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(getContracts(base.id).boardwalkLPManager);
    expect(call.data).toBe(
      expectedData(boardwalkLPManagerAbi, "removeLiquidity", [
        TOKEN,
        RAISE,
        BigInt(50),
        BigInt(10),
        BigInt(20),
        DEADLINE,
      ]),
    );
  });
});

describe("buildStakeLpSteps", () => {
  it("approves the LP token then stakes", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildStakeLpSteps({
      client,
      account: ACCOUNT,
      lpStaking: LP_STAKING,
      lpToken: LP_TOKEN,
      amount: BigInt(7),
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-lp", "stake-lp"]);
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(LP_STAKING);
    expect(call.data).toBe(expectedData(lpStakingAbi, "stake", [BigInt(7)]));
  });
});

describe("buildWithdrawLpSteps", () => {
  it("builds a single withdraw", () => {
    const steps = buildWithdrawLpSteps({ lpStaking: LP_STAKING, amount: BigInt(7) });
    expect(steps.map((s) => s.id)).toEqual(["withdraw-lp"]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(LP_STAKING);
    expect(call.data).toBe(expectedData(lpStakingAbi, "withdraw", [BigInt(7)]));
  });
});

describe("buildClaimLpRewardsSteps", () => {
  it("builds a single claim", () => {
    const steps = buildClaimLpRewardsSteps({ lpStaking: LP_STAKING });
    expect(steps.map((s) => s.id)).toEqual([`claim-lp-rewards-${LP_STAKING}`]);
    const call = encodeStep(steps[0]!, base.id);
    expect(call.to).toBe(LP_STAKING);
    expect(call.data).toBe(expectedData(lpStakingAbi, "claim"));
  });

  it("builds one claim per address for the all-variant", () => {
    const steps = buildClaimAllLpRewardsSteps({
      lpStakings: [LP_STAKING, LP_TOKEN],
    });
    expect(steps).toHaveLength(2);
    expect(steps.map((s) => encodeStep(s, base.id).to)).toEqual([
      LP_STAKING,
      LP_TOKEN,
    ]);
  });
});

describe("buildSwapSteps", () => {
  it("quotes via getAmountsOut and builds approve + swap (buy)", async () => {
    const out = BigInt(1_000);
    const client = mockClient({
      getPair: LP_TOKEN,
      getAmountsOut: [BigInt(500), out],
      allowance: BigInt(0),
    });
    const steps = await buildSwapSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      sellToken: RAISE,
      buyToken: TOKEN,
      sellAmount: BigInt(500),
      slippageBps: 50,
      deadline: DEADLINE,
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-sell-token", "swap"]);
    const amountOutMin = (out * BigInt(10_000 - 50)) / BigInt(10_000);
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(getContracts(base.id).uniswapV2Router);
    expect(call.data).toBe(
      expectedData(uniswapV2RouterAbi, "swapExactTokensForTokens", [
        BigInt(500),
        amountOutMin,
        [RAISE, TOKEN],
        ACCOUNT,
        DEADLINE,
      ]),
    );
  });

  it("throws when no Boardwalk pool exists", async () => {
    const client = mockClient({ getPair: zeroAddress });
    await expect(
      buildSwapSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        sellToken: RAISE,
        buyToken: TOKEN,
        sellAmount: BigInt(500),
      }),
    ).rejects.toThrow(/no Boardwalk pool/i);
  });

  it("throws on a zero-output quote", async () => {
    const client = mockClient({
      getPair: LP_TOKEN,
      getAmountsOut: [BigInt(500), BigInt(0)],
      allowance: BigInt(0),
    });
    await expect(
      buildSwapSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        sellToken: RAISE,
        buyToken: TOKEN,
        sellAmount: BigInt(500),
      }),
    ).rejects.toThrow(/zero output/i);
  });
});
