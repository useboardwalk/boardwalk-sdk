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
