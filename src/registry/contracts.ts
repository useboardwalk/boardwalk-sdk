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

/** Not deployed on a given chain. `assertDeployed` rejects it. */
const PLACEHOLDER = "0x0000000000000000000000000000000000000000" as Address;

export const chainContracts: Record<number, ChainContracts> = {
  [mainnet.id]: {
    launchFactory: "0xfAEdbA0E97D5DCD7A29fB6778D7e17b1be35c0b8",
    integratorFeeCollector: "0x4B3491B723a14454D8235452871810e79455F69D",
    boardwalkLPManager: "0x20De7f8283D377fA84575A26c9D484Ee40f55877",
    boostBurn: "0xe66cF07e393354bc6765d1a5f083E006826ecc52",
    governanceVoter: "0x2c2E06f6a960921861a8CDf760C59636808E7D50",
    participationDistributor: "0x44645311daF8C6F45A00227f85a3193c84c2fd57",
    treasury: "0x366624d894920e3abE1F231f67a02a1861Ff1CA3",
    lpLocker: "0xd69e65facfF6c6389a794893293179bBE007E63e",
    bwlkToken: "0xF9a352b7C7B62a852e5C8A64A455246Dd9596461",
    raiseToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    // BWLK staking: RewardRouterV5 over the sBWLK → sbBWLK → sbfBWLK trackers.
    rewardRouter: "0x1a7e76077A4A3e80Ea5835bcF33688d92746962e",
    stakedBwlkTracker: "0x3961F92c26724C9d61CED679540F35794d90c576",
    bonusBwlkTracker: "0x92803Dc3B10cC4C7CE7DCA35485cc220fCCE65ca",
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    uniswapV2Factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },
  [base.id]: {
    launchFactory: "0x4F7af6f968C30be6FC196Cd5eed68032022AB067",
    integratorFeeCollector: "0xE738D571613208171ed412b497E78189FF1A319c",
    boardwalkLPManager: "0x872Cc821bE2EB77073De3bE2c958F905b2F1d4eE",
    boostBurn: "0xFCD730eBbc40c31A0AAF6fD2007A26c4547E1E59",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0xcAF1C78d3215e231E069859CF61b83f5C3246c73", // RevenueBridger
    lpLocker: PLACEHOLDER,
    bwlkToken: "0x13d674cb9A092d486Dd81CCa683f82202A9FAfA5",
    raiseToken: "0x4200000000000000000000000000000000000006", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
    uniswapV2Factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
  },
  [arbitrum.id]: {
    launchFactory: "0xe64A71A60D552B56579D8edeB13E86bD6222F882",
    integratorFeeCollector: "0xEC996A535AD207473fEdaE1c9eb39FaA64995A43",
    boardwalkLPManager: "0xd69e65facfF6c6389a794893293179bBE007E63e",
    boostBurn: "0xb5B5Bf9ba27aF0C45F2D76D39a7ED6d263821040",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0xd5eA0573847f50E85228b0E6c097aA53699B4c62", // RevenueBridger
    lpLocker: PLACEHOLDER,
    bwlkToken: "0xD432c4F8EA36d53ef17e6500B611F95Ef3fA68c4",
    raiseToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    rewardRouter: PLACEHOLDER,
    stakedBwlkTracker: PLACEHOLDER,
    bonusBwlkTracker: PLACEHOLDER,
    rewardReader: PLACEHOLDER,
    uniswapV2Router: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
    uniswapV2Factory: "0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9",
  },
  [robinhood.id]: {
    launchFactory: "0x177dbEDd02cEe010b80a0A3F284c9FD9F67D8a9e",
    integratorFeeCollector: "0x9fAc7b75f367d5B35a6D6D0a09572eFcC3D406C5",
    boardwalkLPManager: "0x8B04dFebdaABB20e2ac1579B6c1C5CAa7daC36eD",
    boostBurn: "0xA2CE634eeB79790b16CA05354C1dBd5C74DaE3eA",
    governanceVoter: PLACEHOLDER,
    participationDistributor: PLACEHOLDER,
    treasury: "0xcEF6a45f2A3f82ecb7908cc5705D86243cE54f18", // RevenueBridger
    lpLocker: PLACEHOLDER,
    bwlkToken: "0x8b7dAF8ca650Ab30dF4c686e1E3689E9248732C6",
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
      : "No Boardwalk deployment is registered for this contract on this chain.";
    throw new Error(
      `Boardwalk "${String(key)}" is not deployed on chain ${chainId}. ${hint}`,
    );
  }
  return addr;
}
