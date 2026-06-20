// Single home for the SDK's public interfaces and type aliases. Internal
// helper types (e.g. approve params) stay co-located with their code.
import type { Abi, Address, Hex, PublicClient } from "viem";

// ---------------------------------------------------------------------------
// Transaction model (framework-agnostic; ported from token-launcher's
// components/transaction-flow/types.ts). The SDK resolves reads at build time,
// so steps carry static requests — no React, no dynamic builders, no executor.
// ---------------------------------------------------------------------------

/** A contract-write intent — encoded to calldata via the ABI. */
export interface TxWriteRequest {
  abi: Abi;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

/** A raw send — calldata already known (or empty). */
export interface TxSendRequest {
  to: Address;
  data?: Hex;
  value?: bigint;
}

/** Either a contract write (has `abi`) or a raw send (has `to`). */
export type TxRequest = TxWriteRequest | TxSendRequest;

/** One step of a multi-step flow (e.g. `approve` → action). */
export interface TxStep {
  id: string;
  label: string;
  request: TxRequest;
}

/** An encoded, ready-to-submit call. `value` is a decimal wei string. */
export interface EncodedCall {
  id: string;
  label: string;
  to: Address;
  data: Hex;
  value: string;
  chainId: number;
}

// ---------------------------------------------------------------------------
// Launch config (the `createLaunch` tuple) + clean builder input
// ---------------------------------------------------------------------------

/**
 * Data contract for a launch. Field order is byte-aligned to the `createLaunch`
 * ABI tuple in `registry/abis/LaunchFactory.ts` — do not reorder.
 */
export interface LaunchConfig {
  name: string;
  ticker: string;
  category: string;
  description: string;
  path: number; // 0 = EXPRESS, 1 = ADVANCED
  presalePercent: bigint;
  vestingRecipients: Address[];
  vestingPercents: bigint[];
  vestingLabels: string[];
  referrer: Address;
  issuerFeeRecipients: Address[];
  issuerFeeSplits: bigint[];
  issuerFeeLabels: string[];
}

export interface FeeRecipientInput {
  address: Address;
  /** Relative weight; recipients are normalized to bps summing to 10000. */
  percent: number;
  label?: string;
}

export interface LaunchInput {
  name: string;
  ticker: string;
  category: string;
  description?: string;
  path: "express" | "advanced";
  /** Numeric chain id — used only to validate chain-reserved tickers. */
  chainId?: number;

  // Express
  /** Single issuer-fee recipient (receives 100% of the issuer fee). */
  issuerFeeRecipient?: Address;

  // Advanced
  /** Presale supply percent (default 50). */
  presaleSupplyPercent?: number;
  issuerFee?: FeeRecipientInput[];
  vesting?: FeeRecipientInput[];
  referrer?: Address;
}

/** Socials for a prefilled launch link (x/telegram/discord = handles, youtube = URL). */
export interface LaunchLinkSocials {
  x?: string;
  /** Channel URL — shown on the launch summary but not persisted to token metadata
   *  (use `video` for a clip you want in the metadata). */
  youtube?: string;
  telegram?: string;
  discord?: string;
}

/**
 * Superset of a launch config used to generate a prefilled `/launch?…` link.
 * Unlike `LaunchInput` (consumed by the on-chain builder), this also carries the
 * UI-only fields the launch FORM collects: chain (slug or id), raise goal, socials,
 * and video. Logo is intentionally excluded — the UI uploads it via a popup. There
 * is no homepage field because the launch form has none.
 */
export interface LaunchLinkInput {
  name: string;
  ticker: string;
  category: string;
  description?: string;
  path: "express" | "advanced";
  /** Chain slug ("base"…) or numeric id; normalized to a slug in the link. */
  chain: string | number;

  // Express
  issuerFeeRecipient?: Address;

  // Advanced
  presaleSupplyPercent?: number;
  issuerFee?: FeeRecipientInput[];
  vesting?: FeeRecipientInput[];
  referrer?: Address;
  /** Advanced raise goal in raise-token units (decimal string), e.g. "12.5". */
  raiseGoalEth?: string;

  // UI-only metadata (no logo — the UI popup handles that)
  socials?: LaunchLinkSocials;
  video?: string;
}

/** The base64url-encoded `prefill` payload the launch form decodes (v1). */
export interface LaunchLinkPrefill {
  v: 1;
  name: string;
  ticker: string;
  category: string;
  chain: string;
  description?: string;
  video?: string;
  socials?: LaunchLinkSocials;
  /** Express single fee recipient. */
  feeRecipient?: Address;
  /** Advanced presale supply percent (raw percent, not bps). */
  presalePercent?: number;
  /** Advanced raise goal (decimal string). */
  raiseGoalEth?: string;
  fees?: Array<{ label: string; address: Address; percent: number }>;
  vesting?: Array<{ label: string; address: Address; percent: number }>;
  referrer?: Address;
}

export interface BuildLaunchLinkResult {
  /** The full prefilled `/launch?…` URL to open. */
  url: string;
  path: "express" | "advanced";
  /** The decoded prefill payload (useful for inspection/tests). */
  prefill: LaunchLinkPrefill;
}

// ---------------------------------------------------------------------------
// Builder params
// ---------------------------------------------------------------------------

export interface LaunchParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  input: LaunchInput;
}

export interface BuildLaunchResult {
  /** Onchain steps: conditional approve BMX → `createLaunch`. */
  steps: TxStep[];
  /** The encoded `createLaunch` tuple (also useful for the metadata leg). */
  config: LaunchConfig;
  /** Effective BMX burn cost in wei after any member discount. */
  bmxBurnCost: bigint;
}

/** Live BMX launch-cost breakdown read from the factory. */
export interface LaunchCostBreakdown {
  baseBurn: bigint;
  discountBps: bigint;
  nftCollection: Address;
  isMember: boolean;
  bmxBurnCost: bigint;
  /** Current BMX allowance (account→launchFactory), read in the same multicall. */
  allowance: bigint;
}

export interface ContributeParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  /** PresaleManager address for the launch (see `getLaunch().presaleManager`). */
  presale: Address;
  /** Raise amount in wei. */
  amount: bigint;
  /** Raise token. Defaults to the chain's canonical raise token. */
  raiseToken?: Address;
  /** Pre-fetched allowance (owner→presale) to skip the allowance RPC read (e.g. when batched upstream). */
  currentAllowance?: bigint;
}

export interface ClaimParams {
  /** PresaleManager address for the launch (see `getLaunch().presaleManager`). */
  presale: Address;
}

export interface StakeBmxParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  /** BMX amount in wei. */
  amount: bigint;
}

/** 1 = Treasury, 2 = Buy & Burn BMX, 3 = Buy & Burn LP, 4 = Participation. */
export type VoteOption = 1 | 2 | 3 | 4;

export interface VoteParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  option: VoteOption;
  /**
   * Run the on-chain eligibility pre-checks (already-voted / voting-weight /
   * participation-gate) and refuse a guaranteed revert. Default `true` — keep
   * it on for agents/CLI, which have no other gate. A caller that already gates
   * eligibility in its own UI (e.g. token-launcher's governance screen) can set
   * `false` to skip the extra reads + build-time throws and instead let an
   * ineligible vote revert on-chain, matching that UI's existing behavior.
   */
  checkEligibility?: boolean;
}

// ---------------------------------------------------------------------------
// Presale lifecycle + staking + claims + visibility builders
// ---------------------------------------------------------------------------

/** Refund a contribution on a FAILED launch (`PresaleManager.refund()`). */
export interface RefundParams {
  /** PresaleManager address for the launch (see `getLaunch().presaleManager`). */
  presale: Address;
}

/** Activate trading after a successful presale (`PresaleManager.seedLiquidity()`). */
export interface SeedLiquidityParams {
  presale: Address;
}

export interface UnstakeBmxParams {
  chainId: number;
  /** BMX amount in wei. */
  amount: bigint;
}

/** Claim staking rewards via `RewardRouter.handleRewards(...)`. Each flag maps
 *  1:1 to the contract args. Base-only. */
export interface HandleRewardsParams {
  chainId: number;
  shouldClaimOpBmx: boolean;
  shouldStakeMultiplierPoints: boolean;
  shouldClaimWeth: boolean;
  shouldConvertWethToEth: boolean;
}

/** Issuer claims their fee share as the raise token (`FeeDistributor.claimAsRaiseToken`). */
export interface ClaimIssuerFeesParams {
  /** Per-launch FeeDistributor (resolve via `getLaunchAddresses().feeDistributor`). */
  feeDistributor: Address;
  /** Index of the issuer-fee recipient slot to claim. */
  recipientIdx: bigint;
  /** Slippage floor for the fee→raise-token swap, in raise-token wei. */
  minRaiseTokenOut: bigint;
  /** Unix-seconds deadline for the swap. */
  deadline: bigint;
}

/** Referrer claims their fee share (`FeeDistributor.claimReferrerFees`). */
export interface ClaimReferrerFeesParams {
  feeDistributor: Address;
}

/** Integrator claims a launch token's accrued tax from the per-chain collector. */
export interface ClaimIntegratorFeesParams {
  chainId: number;
  /** Launch token whose integrator slot is being claimed. */
  token: Address;
  /** Slippage floor in raise-token wei (derive from the collector's `quote`). */
  minOut: bigint;
  deadline: bigint;
}

/** Claim vested launch tokens for one allocation (`VestingStream.claim`). */
export interface ClaimVestedTokensParams {
  /** Per-launch VestingStream (resolve via `getLaunchAddresses().vestingStream`). */
  vestingStream: Address;
  allocationId: bigint;
}

/** Claim participation BMX rewards across epochs (`ParticipationDistributor.claimAll`). Base-only. */
export interface ClaimParticipationRewardsParams {
  chainId: number;
  epochs: bigint[];
}

/** Upvote ("boost") or downvote ("deboost") a token's visibility — burns BMX. */
export interface CastVisibilityParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  token: Address;
  mode: "boost" | "deboost";
}

// ---------------------------------------------------------------------------
// Boardwalk LP + swap builders
// ---------------------------------------------------------------------------

export interface AddLiquidityParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  tokenA: Address;
  tokenB: Address;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  /** Unix-seconds deadline (default now + 1800s). */
  deadline?: bigint;
}

export interface RemoveLiquidityParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  tokenA: Address;
  tokenB: Address;
  /** The Uniswap V2 pair (LP) token address — approved to the LP manager. */
  lpToken: Address;
  liquidity: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  deadline?: bigint;
}

export interface StakeLpParams {
  client: PublicClient;
  account: Address;
  /** Per-launch LPStaking contract (resolve via `getLaunchAddresses().lpStaking`). */
  lpStaking: Address;
  /** The LP (pair) token to approve + stake. */
  lpToken: Address;
  amount: bigint;
}

export interface WithdrawLpParams {
  lpStaking: Address;
  amount: bigint;
}

export interface ClaimLpRewardsParams {
  lpStaking: Address;
}

export interface ClaimAllLpRewardsParams {
  /** Per-launch LPStaking contracts to claim from (one `claim()` each). */
  lpStakings: Address[];
}

export interface SwapParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  /** Token paid in. */
  sellToken: Address;
  /** Token received. */
  buyToken: Address;
  /** Input amount in `sellToken` wei. */
  sellAmount: bigint;
  /** Slippage tolerance in bps (default 50 = 0.5%). */
  slippageBps?: number;
  /** Unix-seconds deadline (default now + 1200s). */
  deadline?: bigint;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface MetadataInput {
  token: Address;
  logoUrl?: string;
  twitterUrl?: string;
  homepageUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  description?: string;
  videoUrl?: string;
  /** URI of the Terms of Service the issuer agrees to (signed into metadata). */
  tosUri: string;
  /** ToS revision string the issuer agrees to (signed into metadata). */
  tosVersion: string;
  /** Wei-string raise goal; "0" when omitted. */
  raiseGoalWei?: string;
  /** Deadline in minutes from now (default 30). */
  deadlineMinutes?: number;
  /** Override the nonce (default `crypto.randomUUID()`). */
  nonce?: string;
}

/** EIP-712 message with bigint fields — pass to the wallet's `signTypedData`. */
export interface LaunchMetadataMessage {
  token: Address;
  logo_url: string;
  twitter_url: string;
  homepage_url: string;
  discord_url: string;
  telegram_url: string;
  description: string;
  video_url: string;
  tos_uri: string;
  tos_version: string;
  raise_goal: bigint;
  nonce: string;
  deadline: bigint;
}

/** Wire form (uint256s as strings) — POST this with the signature. */
export interface MetadataWireMessage {
  token: Address;
  logo_url: string;
  twitter_url: string;
  homepage_url: string;
  discord_url: string;
  telegram_url: string;
  description: string;
  video_url: string;
  tos_uri: string;
  tos_version: string;
  raise_goal: string;
  nonce: string;
  deadline: string;
}

export interface LaunchMetadataTypedData {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, ReadonlyArray<{ name: string; type: string }>>;
  primaryType: "LaunchMetadata";
  message: LaunchMetadataMessage;
  wireMessage: MetadataWireMessage;
  nonce: string;
  deadline: string;
}

export interface UploadLogoResult {
  url: string;
  existed: boolean;
}

export interface UploadLogoOptions {
  filename?: string;
  /** MIME type — required for raw `Uint8Array`; inferred otherwise. */
  mime?: string;
  baseUrl?: string;
}

export interface PostMetadataOptions {
  chainId?: number;
  baseUrl?: string;
  /** Total time to keep retrying on 404 (indexer lag). Default 30_000ms. */
  retryOn404Ms?: number;
}

export interface SubmitMetadataResponse {
  success: boolean;
  message?: string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type LaunchStatus =
  | "presale"
  | "seeded"
  | "failed"
  | "pending_seed"
  | "unknown";

export interface LaunchSummary {
  token: Address;
  chainId: number;
  status: LaunchStatus;
  path: "EXPRESS" | "ADVANCED";
  /** PresaleManager address; null until the launch is indexed. */
  presaleManager: Address | null;
  /** Per-chain canonical raise token (approve target for contribute). */
  raiseToken: Address;
  seeded: boolean;
}

/** Per-launch contract addresses from `LaunchFactory.launches(token)`. Zero
 *  address for contracts not yet deployed for the launch (e.g. `lpStaking`
 *  before liquidity is seeded). */
export interface LaunchAddresses {
  token: Address;
  feeDistributor: Address;
  presaleManager: Address;
  vestingStream: Address;
  lpStaking: Address;
  issuer: Address;
}
