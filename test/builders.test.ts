import { describe, it, expect } from "vitest";
import {
  concatHex,
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
  type Address,
  type PublicClient,
} from "viem";
import { base, mainnet } from "viem/chains";
import { buildContributeSteps } from "../src/builders/contribute";
import { buildClaimSteps } from "../src/builders/claim";
import { buildLaunchSteps } from "../src/builders/launch";
import { buildStakeBwlkSteps } from "../src/builders/stake-bwlk";
import { buildVoteSteps } from "../src/builders/vote";
import { buildRefundSteps } from "../src/builders/refund";
import { buildSeedLiquiditySteps } from "../src/builders/seed-liquidity";
import { buildUnstakeBwlkSteps } from "../src/builders/unstake-bwlk";
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
import { chainContracts, getContracts } from "../src/registry/contracts";
import { encodeStep, BUILDER_CODE_SUFFIX } from "../src/flow/encode";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const PRESALE = "0x2222222222222222222222222222222222222222" as Address;

// ---------------------------------------------------------------------------
// The registry ships placeholder (zero) addresses until the redeployment lands,
// and `assertDeployed` correctly refuses them — so tests inject dummy singleton
// addresses. Base doubles as the "any chain" fixture; Ethereum (mainnet) hosts
// the Ethereum-only staking/governance stack. Base keeps its governance/staking
// placeholders so the Ethereum-only gating paths stay testable.
// ---------------------------------------------------------------------------
const LAUNCH_FACTORY = "0xaaaa00000000000000000000000000000000aaa1" as Address;
const BOOST_BURN = "0xaaaa00000000000000000000000000000000aaa2" as Address;
const INTEGRATOR_COLLECTOR =
  "0xaaaa00000000000000000000000000000000aaa3" as Address;
const LP_MANAGER = "0xaaaa00000000000000000000000000000000aaa4" as Address;
const BWLK = "0xaaaa00000000000000000000000000000000aaa5" as Address;
const REWARD_ROUTER = "0xaaaa00000000000000000000000000000000aaa6" as Address;
const STAKED_BWLK_TRACKER =
  "0xaaaa00000000000000000000000000000000aaa7" as Address;
const GOVERNANCE_VOTER =
  "0xaaaa00000000000000000000000000000000aaa8" as Address;
const PARTICIPATION_DISTRIBUTOR =
  "0xaaaa00000000000000000000000000000000aaa9" as Address;

Object.assign(chainContracts[base.id]!, {
  launchFactory: LAUNCH_FACTORY,
  boostBurn: BOOST_BURN,
  integratorFeeCollector: INTEGRATOR_COLLECTOR,
  boardwalkLPManager: LP_MANAGER,
  bwlkToken: BWLK,
});
Object.assign(chainContracts[mainnet.id]!, {
  rewardRouter: REWARD_ROUTER,
  stakedBwlkTracker: STAKED_BWLK_TRACKER,
  governanceVoter: GOVERNANCE_VOTER,
  participationDistributor: PARTICIPATION_DISTRIBUTOR,
  bwlkToken: BWLK,
});

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

describe("buildStakeBwlkSteps", () => {
  it("approves the staked-BWLK tracker then stakes (Ethereum)", async () => {
    const client = mockClient({ allowance: BigInt(0) });
    const steps = await buildStakeBwlkSteps({
      client,
      account: ACCOUNT,
      chainId: mainnet.id,
      amount: BigInt(5),
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bwlk", "stake-bwlk"]);
    // The approve spends BWLK for the staked tracker (it pulls the tokens),
    // not the router.
    const approve = encodeStep(steps[0]!, mainnet.id);
    expect(approve.to).toBe(BWLK);
    expect(approve.data).toBe(
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [STAKED_BWLK_TRACKER, BigInt(5)],
      }),
    );
    const stake = encodeStep(steps[1]!, mainnet.id);
    expect(stake.to).toBe(REWARD_ROUTER);
    expect(stake.data).toBe(
      encodeFunctionData({
        abi: rewardRouterAbi,
        functionName: "stakeBwlk",
        args: [BigInt(5)],
      }),
    );
  });

  it("throws on a chain where the reward router is a placeholder (Base)", async () => {
    const client = mockClient({});
    await expect(
      buildStakeBwlkSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        amount: BigInt(5),
      }),
    ).rejects.toThrow();
  });
});

describe("buildVoteSteps", () => {
  const SBF_BWLK = "0x3333333333333333333333333333333333333333" as Address;
  const STAKED_TRACKER =
    "0x4444444444444444444444444444444444444444" as Address;
  const BN_BWLK = "0x5555555555555555555555555555555555555555" as Address;

  /** Reads for a wallet that passes every `vote()` eligibility guard:
   *  no vote cast this epoch, non-zero sbfBWLK weight, staked multiplier
   *  points above the participation gate, and an eligible option. */
  function eligibleVoterReads(overrides: Record<string, unknown> = {}) {
    return {
      governanceBurnAmount: BigInt(0),
      currentEpoch: BigInt(7),
      SBF_BWLK,
      STAKED_BWLK_TRACKER: STAKED_TRACKER,
      BN_BWLK,
      BWLK,
      isOptionEligible: true,
      getUserVote: { weight: BigInt(0), option: 0 },
      balanceOf: BigInt(1_000), // sbfBWLK voting weight
      // stakedBwlkTracker → staked BWLK; sbfBWLK tracker → staked multiplier points
      depositBalances: ({ address }: { address: Address }) =>
        address === STAKED_TRACKER ? BigInt(1_000) : BigInt(100),
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
      chainId: mainnet.id,
      option: 2,
    });
    expect(steps.map((s) => s.id)).toEqual(["approve-bwlk", "vote"]);
    // The burn approve spends BWLK for the voter, sized to the burn amount.
    const approve = encodeStep(steps[0]!, mainnet.id);
    expect(approve.to).toBe(BWLK);
    expect(approve.data).toBe(
      encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [GOVERNANCE_VOTER, BigInt(100)],
      }),
    );
    expect(encodeStep(steps[1]!, mainnet.id).data).toBe(
      encodeFunctionData({
        abi: governanceVoterAbi,
        functionName: "vote",
        args: [2],
      }),
    );
  });

  it("skips approve when the burn amount is zero", async () => {
    const client = mockClient(eligibleVoterReads());
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: mainnet.id,
      option: 1,
    });
    expect(steps.map((s) => s.id)).toEqual(["vote"]);
  });

  it("rejects non-Ethereum chains", async () => {
    const client = mockClient({});
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        option: 1,
      }),
    ).rejects.toThrow(/Ethereum/);
  });

  it("refuses when the wallet already voted this epoch (contract: AlreadyVoted)", async () => {
    const client = mockClient(
      eligibleVoterReads({ getUserVote: { weight: BigInt(500), option: 3 } }),
    );
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        option: 1,
      }),
    ).rejects.toThrow(/already voted/i);
  });

  it("refuses when the wallet has no voting power (contract: InsufficientVotingWeight)", async () => {
    const client = mockClient(eligibleVoterReads({ balanceOf: BigInt(0) }));
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        option: 1,
      }),
    ).rejects.toThrow(/no voting power/i);
  });

  it("refuses when multiplier points are below the gate (contract: InsufficientParticipationPoints)", async () => {
    // staked 10_000 BWLK needs ≥ 150 staked multiplier points (1.5%); 100 is short.
    const client = mockClient(
      eligibleVoterReads({
        depositBalances: ({ address }: { address: Address }) =>
          address === STAKED_TRACKER ? BigInt(10_000) : BigInt(100),
      }),
    );
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        option: 1,
      }),
    ).rejects.toThrow(/participation gate/i);
  });

  it("refuses an ineligible option (contract: OptionIneligible, 3 consecutive wins)", async () => {
    const client = mockClient(eligibleVoterReads({ isOptionEligible: false }));
    await expect(
      buildVoteSteps({
        client,
        account: ACCOUNT,
        chainId: mainnet.id,
        option: 2,
      }),
    ).rejects.toThrow(/ineligible/i);
  });

  it("skips the participation gate when no BWLK is staked but weight is non-zero", async () => {
    const client = mockClient(
      eligibleVoterReads({ depositBalances: () => BigInt(0) }),
    );
    const steps = await buildVoteSteps({
      client,
      account: ACCOUNT,
      chainId: mainnet.id,
      option: 4,
    });
    expect(steps.map((s) => s.id)).toEqual(["vote"]);
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
const RAISE = getContracts(base.id).raiseToken; // canonical Base WETH
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

describe("buildUnstakeBwlkSteps", () => {
  it("builds unstakeBwlk on Ethereum", () => {
    const steps = buildUnstakeBwlkSteps({
      chainId: mainnet.id,
      amount: BigInt(5),
    });
    expect(steps.map((s) => s.id)).toEqual(["unstake-bwlk"]);
    const call = encodeStep(steps[0]!, mainnet.id);
    expect(call.to).toBe(REWARD_ROUTER);
    expect(call.data).toBe(
      encodeFunctionData({
        abi: rewardRouterAbi,
        functionName: "unstakeBwlk",
        args: [BigInt(5)],
      }),
    );
  });

  it("throws on a placeholder (non-Ethereum) chain", () => {
    expect(() =>
      buildUnstakeBwlkSteps({ chainId: base.id, amount: BigInt(5) }),
    ).toThrow();
  });

  it("throws on a zero amount", () => {
    expect(() =>
      buildUnstakeBwlkSteps({ chainId: mainnet.id, amount: BigInt(0) }),
    ).toThrow();
  });
});

describe("buildHandleRewardsSteps", () => {
  it("builds handleRewards with the four flags in order", () => {
    const steps = buildHandleRewardsSteps({
      chainId: mainnet.id,
      shouldClaimBwlk: true,
      shouldStakeMultiplierPoints: false,
      shouldClaimWeth: true,
      shouldConvertWethToEth: false,
    });
    expect(steps.map((s) => s.id)).toEqual(["handle-rewards"]);
    const call = encodeStep(steps[0]!, mainnet.id);
    expect(call.to).toBe(REWARD_ROUTER);
    expect(call.data).toBe(
      encodeFunctionData({
        abi: rewardRouterAbi,
        functionName: "handleRewards",
        args: [true, false, true, false],
      }),
    );
  });

  it("throws on a placeholder (non-Ethereum) chain", () => {
    expect(() =>
      buildHandleRewardsSteps({
        chainId: base.id,
        shouldClaimBwlk: true,
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
    expect(call.to).toBe(INTEGRATOR_COLLECTOR);
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
  it("builds claimAll(epochs) on Ethereum", () => {
    const epochs = [BigInt(0), BigInt(1)];
    const steps = buildClaimParticipationRewardsSteps({
      chainId: mainnet.id,
      epochs,
    });
    expect(steps.map((s) => s.id)).toEqual(["claim-participation"]);
    const call = encodeStep(steps[0]!, mainnet.id);
    expect(call.to).toBe(PARTICIPATION_DISTRIBUTOR);
    expect(call.data).toBe(
      encodeFunctionData({
        abi: participationDistributorAbi,
        functionName: "claimAll",
        args: [epochs],
      }),
    );
  });

  it("throws on a placeholder (non-Ethereum) chain", () => {
    expect(() =>
      buildClaimParticipationRewardsSteps({
        chainId: base.id,
        epochs: [BigInt(0)],
      }),
    ).toThrow();
  });

  it("throws on empty epochs", () => {
    expect(() =>
      buildClaimParticipationRewardsSteps({ chainId: mainnet.id, epochs: [] }),
    ).toThrow();
  });
});

describe("buildCastVisibilitySteps", () => {
  it("approves BWLK then boosts", async () => {
    const client = mockClient({
      bwlkCost: BigInt(100),
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
    expect(steps.map((s) => s.id)).toEqual(["approve-bwlk", "boost"]);
    // The approve spends BWLK for BoostBurn, sized to the effective cost.
    const approve = encodeStep(steps[0]!, base.id);
    expect(approve.to).toBe(BWLK);
    expect(approve.data).toBe(
      expectedData(erc20Abi, "approve", [BOOST_BURN, BigInt(100)]),
    );
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(BOOST_BURN);
    expect(call.data).toBe(expectedData(boostBurnAbi, "boost", [TOKEN]));
  });

  it("skips approve when allowance covers the cost and can deboost", async () => {
    const client = mockClient({
      bwlkCost: BigInt(100),
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
    expect(call.to).toBe(LP_MANAGER);
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
    expect(call.to).toBe(LP_MANAGER);
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
  const BPS = BigInt(10_000);
  /** Launch-token tax reads: steady state (seed long past at chain time),
   *  0.95% base tax. Chain time comes from Multicall3, not the host clock. */
  const TAX_READS = {
    baseTaxBps: BigInt(95),
    antiWhaleTaxBps: BigInt(4_000),
    antiWhaleDuration: BigInt(5_400),
    liquiditySeedTime: BigInt(1_000),
    getCurrentBlockTimestamp: BigInt(1_000_000),
  };

  it("buys via SupportingFeeOnTransferTokens with a tax-adjusted min-out", async () => {
    const out = BigInt(1_000);
    const client = mockClient({
      getPair: LP_TOKEN,
      getAmountsOut: [BigInt(500), out],
      allowance: BigInt(0),
      ...TAX_READS,
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
    // Buy: the pair→wallet transfer is taxed, then the slippage floor applies.
    const outAfterTax = (out * (BPS - BigInt(95))) / BPS;
    const amountOutMin = (outAfterTax * (BPS - BigInt(50))) / BPS;
    const call = encodeStep(steps[1]!, base.id);
    expect(call.to).toBe(getContracts(base.id).uniswapV2Router);
    expect(call.data).toBe(
      expectedData(
        uniswapV2RouterAbi,
        "swapExactTokensForTokensSupportingFeeOnTransferTokens",
        [BigInt(500), amountOutMin, [RAISE, TOKEN], ACCOUNT, DEADLINE],
      ),
    );
  });

  it("sells with the quote taken on the post-tax effective input", async () => {
    const sellAmount = BigInt(500);
    const effectiveIn = (sellAmount * (BigInt(10_000) - BigInt(95))) / BigInt(10_000);
    const out = BigInt(1_000);
    const client = mockClient({
      getPair: LP_TOKEN,
      // The quote must be requested for the post-tax amount the pair receives.
      getAmountsOut: ({ args }: { args: readonly [bigint, unknown] }) => {
        expect(args[0]).toBe(effectiveIn);
        return [args[0], out];
      },
      allowance: BigInt(0),
      ...TAX_READS,
    });
    const steps = await buildSwapSteps({
      client,
      account: ACCOUNT,
      chainId: base.id,
      sellToken: TOKEN,
      buyToken: RAISE,
      sellAmount,
      slippageBps: 50,
      deadline: DEADLINE,
    });
    // Sell: WETH out is untaxed — only the slippage floor applies; the full
    // sellAmount still goes into the router call.
    const amountOutMin = (out * (BPS - BigInt(50))) / BPS;
    const call = encodeStep(steps[1]!, base.id);
    expect(call.data).toBe(
      expectedData(
        uniswapV2RouterAbi,
        "swapExactTokensForTokensSupportingFeeOnTransferTokens",
        [sellAmount, amountOutMin, [TOKEN, RAISE], ACCOUNT, DEADLINE],
      ),
    );
  });

  it("rejects a swap where neither side is the raise token", async () => {
    const client = mockClient({});
    await expect(
      buildSwapSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        sellToken: TOKEN,
        buyToken: LP_TOKEN,
        sellAmount: BigInt(500),
      }),
    ).rejects.toThrow(/raise token/i);
  });

  it("throws when no pool exists", async () => {
    const client = mockClient({ getPair: zeroAddress, ...TAX_READS });
    await expect(
      buildSwapSteps({
        client,
        account: ACCOUNT,
        chainId: base.id,
        sellToken: RAISE,
        buyToken: TOKEN,
        sellAmount: BigInt(500),
      }),
    ).rejects.toThrow(/no Uniswap V2 pool/i);
  });

  it("throws on a zero-output quote", async () => {
    const client = mockClient({
      getPair: LP_TOKEN,
      getAmountsOut: [BigInt(500), BigInt(0)],
      allowance: BigInt(0),
      ...TAX_READS,
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
