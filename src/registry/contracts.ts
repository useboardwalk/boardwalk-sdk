import type { Address } from "viem";
import { mainnet, base, arbitrum, robinhood } from "viem/chains";

/** Singleton contract addresses — one deployment per chain */
export interface ChainContracts {
  launchFactory: Address;
  boardwalkLPManager: Address;
  boostBurn: Address;
  /** Ethereum-only: weekly revenue voter (placeholder elsewhere). */
  governanceVoter: Address;
  /** Ethereum-only: per-epoch BWLK participation streams (placeholder elsewhere). */
  participationDistributor: Address;
  /** Per-chain IntegratorFeeCollector singleton — aggregates the integrator
   *  share of every launch's tax. Integrators claim here via `claim(token,…)`,
   *  NOT the per-launch FeeDistributor. */
  integratorFeeCollector: Address;
  /** The chain's FeeCollector treasury. On Ethereum: the multisig taking the
   *  10% share and any budget that fails quorum (mirrors
   *  `GovernanceVoter.treasury()`). On Base/Arbitrum/Robinhood: the chain's
   *  RevenueBridger, which forwards revenue to Ethereum. */
  treasury: Address;
  /** Ethereum-only sink for the permanently-locked BWLK/ETH v4 LP option.
   *  Mirrors `GovernanceVoter.lpLocker()`. */
  lpLocker: Address;
  /** BWLK: home ERC20 on Ethereum, Chainlink CCT BurnMint representation on
   *  the other chains (used for launch burns and boost/deboost). */
  bwlkToken: Address;
  /** Canonical WETH — the raise token on every chain. */
  raiseToken: Address;
  /** Ethereum-only BWLK staking stack (Morphex RewardRouterV5 + trackers). */
  rewardRouter: Address;
  stakedBwlkTracker: Address;
  bonusBwlkTracker: Address;
  rewardReader: Address;
  /** Canonical Uniswap V2 Router02 (developers.uniswap.org V2 deployments;
   *  Boardwalk deploys nothing DEX-side). Used for launch-token ↔ WETH swaps. */
  uniswapV2Router: Address;
  /** Canonical Uniswap V2 Factory — used to look up the pair address for a
   *  token pair. */
  uniswapV2Factory: Address;
}

// TODO: Replace placeholder addresses with deployed contract addresses
const PLACEHOLDER = "0x0000000000000000000000000000000000000000" as Address;

export const chainContracts: Record<number, ChainContracts> = {
  [mainnet.id]: {
    launchFactory: PLACEHOLDER,
    integratorFeeCollector: PLACEHOLDER,
    boardwalkLPManager: PLACEHOLDER,
    boostBurn: PLACEHOLDER,
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: PLACEHOLDER,
    lpLocker: PLACEHOLDER,
    bwlkToken: PLACEHOLDER,
    raiseToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    uniswapV2Factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },
  [base.id]: {
    launchFactory: PLACEHOLDER,
    integratorFeeCollector: PLACEHOLDER,
    boardwalkLPManager: PLACEHOLDER,
    boostBurn: PLACEHOLDER,
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: PLACEHOLDER,
    lpLocker: PLACEHOLDER,
    bwlkToken: PLACEHOLDER,
    raiseToken: "0x4200000000000000000000000000000000000006", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
    uniswapV2Factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
  },
  [arbitrum.id]: {
    launchFactory: PLACEHOLDER,
    integratorFeeCollector: PLACEHOLDER,
    boardwalkLPManager: PLACEHOLDER,
    boostBurn: PLACEHOLDER,
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: PLACEHOLDER,
    lpLocker: PLACEHOLDER,
    bwlkToken: PLACEHOLDER,
    raiseToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
    uniswapV2Factory: "0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9",
  },
  [robinhood.id]: {
    launchFactory: PLACEHOLDER,
    integratorFeeCollector: PLACEHOLDER,
    boardwalkLPManager: PLACEHOLDER,
    boostBurn: PLACEHOLDER,
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: PLACEHOLDER,
    lpLocker: PLACEHOLDER,
    bwlkToken: PLACEHOLDER,
    raiseToken: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba",
    uniswapV2Factory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
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

/** Keys that only ever have a deployment on Ethereum (chain 1). */
const ETHEREUM_ONLY_KEYS: ReadonlySet<keyof ChainContracts> = new Set([
  "governanceVoter",
  "participationDistributor",
  "lpLocker",
  "rewardRouter",
  "stakedBwlkTracker",
  "bonusBwlkTracker",
  "rewardReader",
]);

/** Resolves a singleton contract address, throwing if it is the placeholder
 *  (undeployed) on the given chain. Call before building a tx so an agent gets a
 *  clear error instead of silently encoding a call to the zero address. */
export function assertDeployed(
  chainId: number,
  key: keyof ChainContracts,
): Address {
  const addr = getContracts(chainId)[key];
  if (addr === PLACEHOLDER) {
    const hint = ETHEREUM_ONLY_KEYS.has(key)
      ? "This action is unavailable here (BWLK staking, governance, and participation rewards are Ethereum-only)."
      : "The redeployed Boardwalk contracts are not registered for this chain yet.";
    throw new Error(
      `Boardwalk "${String(key)}" is not deployed on chain ${chainId}. ${hint}`,
    );
  }
  return addr;
}
