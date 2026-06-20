import type { Address } from "viem";
import { mainnet, base, fraxtal, katana, ink, arbitrum } from "viem/chains";

/** Singleton contract addresses — one deployment per chain */
export interface ChainContracts {
  launchFactory: Address;
  boardwalkLPManager: Address;
  boostBurn: Address;
  governanceVoter: Address;
  participationDistributor: Address;
  /** Per-chain IntegratorFeeCollector singleton — aggregates the integrator
   *  share of every launch's tax. Integrators claim here via `claim(token,…)`,
   *  NOT the per-launch FeeDistributor. */
  integratorFeeCollector: Address;
  /** Multisig destination for the 30% treasury baseline and any 70% allocation
   *  that fails to meet quorum. Mirrors `GovernanceVoter.treasury()`. */
  treasury: Address;
  /** Sink for the permanently-locked BMX/ETH LP option. Mirrors
   *  `GovernanceVoter.lpLocker()`. */
  lpLocker: Address;
  bmxToken: Address;
  raiseToken: Address;
  rewardRouter: Address;
  stakedBmxTracker: Address;
  bonusBmxTracker: Address;
  rewardReader: Address;
  /** Boardwalk's deployed Uniswap V2 Router02. Used for direct
   *  Boardwalk-token ↔ raise-token swaps. Live trading routes through
   *  this router on every chain where it's deployed until 0x integrates
   *  the Boardwalk DEX (see `IS_ZEROX_TRADING_ENABLED` in `lib/0x`). */
  uniswapV2Router: Address;
  /** Boardwalk's deployed Uniswap V2 Factory — used to look up the
   *  pair address for a token pair without depending on the SDK's
   *  canonical INIT_CODE_HASH. Pairs with both placeholder router and
   *  placeholder factory disable the V2 swap path. */
  uniswapV2Factory: Address;
}

// TODO: Replace placeholder addresses with deployed contract addresses
const PLACEHOLDER = "0x0000000000000000000000000000000000000000" as Address;

export const chainContracts: Record<number, ChainContracts> = {
  [mainnet.id]: {
    launchFactory: "0x2bd467577f1fC5923C10b78984Be763757ec4f6F",
    integratorFeeCollector: "0xcdDb224CafF26Fc24787655111f0d877697D9c6B",
    boardwalkLPManager: "0xa2242d0A8b0b5c1A487AbFC03Cd9FEf6262BAdCA",
    boostBurn: "0x1d556F411370E5F1850A51EB66960798e6F5eDeC",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: PLACEHOLDER,
    bmxToken: "0xd55159fe5633e24510d5317d224324413407c5b8",
    raiseToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBmxTracker: PLACEHOLDER,
    bonusBmxTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0xe0f606e6730bE531EeAf42348dE43C2feeD43505",
    uniswapV2Factory: "0x8b59270dc8cF89EBF00F0e8558409e5B6321F13a",
  },
  [base.id]: {
    launchFactory: "0x0a818F0B6fB245AFB0eAE7b09CB2ef0a9D50Bce7",
    integratorFeeCollector: "0xFCb11f80CE8cD62b47903a40Aa28970b694bD3a6",
    boardwalkLPManager: "0xe38425CC437ce5F1cB61bC5f534f6e9785e8Bb1B",
    boostBurn: "0x4bA159Be071dDb0d36da9EB05A7756321A156438",
    governanceVoter: "0x487451487ed87aB447ec12B5627A4ff7c4c4974C",
    participationDistributor: "0x5F2E1CC623214EBAfA6346a2838f991d36eb7249",
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: "0xa4048Ebbe5B42b78957b527d6848b4e59af7ec9C",
    bmxToken: "0x548f93779fBC992010C07467cBaf329DD5F059B7",
    raiseToken: "0x4200000000000000000000000000000000000006", // WETH
    rewardRouter: "0x6456039168d3fE3Bc5FCD9e46f3B716C1AbD4ff4",
    stakedBmxTracker: "0x3085F25Cbb5F34531229077BAAC20B9ef2AE85CB",
    bonusBmxTracker: "0x9A8f034Df900E58C55764fAAC867c5BA11A8F70f",
    rewardReader: "0xe0A2683F6B2C7278C27506c22CE2dB74aC661362",
    uniswapV2Router: "0x8dBD8aa2306FC211F04585f7AC69e55f9731ec22",
    uniswapV2Factory: "0x5ab5575262c823CcB6F43aEd44e071eDb6Ef9e3c",
  },
  [fraxtal.id]: {
    launchFactory: "0x620253Be916A915fEE00Fab30840A04A2389C886",
    integratorFeeCollector: "0xec31c83C5689C66cb77DdB5378852F3707022039",
    boardwalkLPManager: "0xAa40201575140862E9aE4F00515245670582e6e0",
    boostBurn: "0x952AdBB385296Dcf86a668f7eaa02DF7eb684439",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0x44d39A3f9eF5D1FE3bFE9b94067F23fdD232A153",
    lpLocker: PLACEHOLDER,
    bmxToken: "0xea34ebbc94df7bfec5d9cdcd373a4221b7c87810",
    raiseToken: "0xFc00000000000000000000000000000000000001", // frxUSD
    rewardRouter: PLACEHOLDER,
    stakedBmxTracker: PLACEHOLDER,
    bonusBmxTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0xA2CE634eeB79790b16CA05354C1dBd5C74DaE3eA",
    uniswapV2Factory: "0x31e5Ff91e8471346dDEb41cb3E974950F1c256d4",
  },
  [katana.id]: {
    launchFactory: "0x2ace8F6Cc1ce4813Bd2D3AcE550ac95810855C40",
    integratorFeeCollector: "0x9C959a40f1d1f3bc5C7d02EC474d13eD25441A5e",
    boardwalkLPManager: "0x6f417aC8Ab3Ed8304632b5aD18F275D74142e656",
    boostBurn: "0x145E8F5E576DA0c3c490fb54a0B363e7B1A9D587",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: PLACEHOLDER,
    bmxToken: "0xbdcaaa7439a0fc6e01326d36ab8d72cceecd1f5a",
    raiseToken: "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d", // KAT
    rewardRouter: PLACEHOLDER,
    stakedBmxTracker: PLACEHOLDER,
    bonusBmxTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x31e5Ff91e8471346dDEb41cb3E974950F1c256d4",
    uniswapV2Factory: "0x177dbEDd02cEe010b80a0A3F284c9FD9F67D8a9e",
  },
  [ink.id]: {
    launchFactory: "0xF9116B9f1D092313d15C29Ac862BcF949453083B",
    integratorFeeCollector: "0x956A1610AC15D50C40c43D570A911EdEe92722a0",
    boardwalkLPManager: "0x786AcC981FB93a12D5d195903C5C0d6D9c633cd8",
    boostBurn: "0x8B04dFebdaABB20e2ac1579B6c1C5CAa7daC36eD",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: PLACEHOLDER,
    bmxToken: "0x5e8a26a9ed06b56bc1d90ceee2c6ae892b4b835c",
    raiseToken: "0x4200000000000000000000000000000000000006", // wETH
    rewardRouter: PLACEHOLDER,
    stakedBmxTracker: PLACEHOLDER,
    bonusBmxTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x7f04C08f1c870B58c5fAEBF87A6C53675210453A", // Ink DEX Router
    uniswapV2Factory: "0x8e28edBFb74F5ef7De12E5091CACDcE45EE0BEaC", // Ink DEX Factory
  },
  [arbitrum.id]: {
    launchFactory: "0x53a4fbc6E36a1CF7bfaf27D5f4682f7DD8C3ab9F",
    integratorFeeCollector: "0x512F8D4E28EB53A6d036aEDA9C5a4D1De6DBD543",
    boardwalkLPManager: "0x8BC6D6d2cdD68E51a8046F2C570824027842eD8D",
    boostBurn: "0xe0f606e6730bE531EeAf42348dE43C2feeD43505",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: PLACEHOLDER,
    bmxToken: "0xc2694a5c9f3a886d0467fce5e07f6211dfc86c48",
    raiseToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBmxTracker: PLACEHOLDER,
    bonusBmxTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x3c293f03700f873C8cfee7Faae36E3437B673A50",
    uniswapV2Factory: "0xdD9EB26239a8A7B71631Dc70E872be831a65D198",
  },
};

/** Get contract addresses for the current chain. Throws if chain is unsupported. */
export function getContracts(chainId: number): ChainContracts {
  const contracts = chainContracts[chainId];
  if (!contracts) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  if (process.env.NODE_ENV !== "production") {
    const placeholders = (Object.entries(contracts) as [string, Address][])
      .filter(([, addr]) => addr === PLACEHOLDER)
      .map(([key]) => key);
    if (placeholders.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[contracts] chain ${chainId} has placeholder addresses for: ${placeholders.join(", ")}. ` +
          `Calls to these contracts will hit the zero address.`,
      );
    }
  }
  return contracts;
}

/** Resolves a singleton contract address, throwing if it is the placeholder
 *  (undeployed) on the given chain. Call before building a tx so an agent gets a
 *  clear error instead of silently encoding a call to the zero address. */
export function assertDeployed(
  chainId: number,
  key: keyof ChainContracts,
): Address {
  const addr = getContracts(chainId)[key];
  if (addr === PLACEHOLDER) {
    throw new Error(
      `Boardwalk "${String(key)}" is not deployed on chain ${chainId}. ` +
        `This action is unavailable here (BMX staking & governance are Base-only today).`,
    );
  }
  return addr;
}
