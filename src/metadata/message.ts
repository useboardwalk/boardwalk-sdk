// EIP-712 launch metadata — ported from token-launcher/lib/api/mutations.ts.
// The SDK only BUILDS the typed data; the agent's wallet signs it.
import type { Address } from "viem";

export const METADATA_DOMAIN_NAME = "BoardwalkLaunchMetadata";
export const METADATA_DOMAIN_VERSION = "1";

export function getMetadataDomain(chainId: number): {
  name: string;
  version: string;
  chainId: number;
} {
  return {
    name: METADATA_DOMAIN_NAME,
    version: METADATA_DOMAIN_VERSION,
    chainId,
  };
}

export const METADATA_TYPES = {
  LaunchMetadata: [
    { name: "token", type: "address" },
    { name: "logo_url", type: "string" },
    { name: "twitter_url", type: "string" },
    { name: "homepage_url", type: "string" },
    { name: "discord_url", type: "string" },
    { name: "telegram_url", type: "string" },
    { name: "description", type: "string" },
    { name: "video_url", type: "string" },
    { name: "tos_uri", type: "string" },
    { name: "tos_version", type: "string" },
    { name: "raise_goal", type: "uint256" },
    { name: "nonce", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

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
  types: typeof METADATA_TYPES;
  primaryType: "LaunchMetadata";
  message: LaunchMetadataMessage;
  wireMessage: MetadataWireMessage;
  nonce: string;
  deadline: string;
}

/**
 * Build the full EIP-712 payload an agent signs to publish launch metadata.
 * Sign `{domain, types, primaryType, message}` with the issuer wallet, then
 * pass `wireMessage` + the signature to `postSignedMetadata`.
 */
export function buildLaunchMetadataTypedData(
  chainId: number,
  input: MetadataInput,
): LaunchMetadataTypedData {
  const deadlineMinutes = input.deadlineMinutes ?? 30;
  const deadlineSec = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;
  const deadline = BigInt(deadlineSec);
  const nonce = input.nonce ?? crypto.randomUUID();
  const raiseGoalWei = input.raiseGoalWei ?? "0";

  const message: LaunchMetadataMessage = {
    token: input.token,
    logo_url: input.logoUrl ?? "",
    twitter_url: input.twitterUrl ?? "",
    homepage_url: input.homepageUrl ?? "",
    discord_url: input.discordUrl ?? "",
    telegram_url: input.telegramUrl ?? "",
    description: input.description ?? "",
    video_url: input.videoUrl ?? "",
    tos_uri: input.tosUri,
    tos_version: input.tosVersion,
    raise_goal: BigInt(raiseGoalWei),
    nonce,
    deadline,
  };

  const wireMessage: MetadataWireMessage = {
    ...message,
    raise_goal: raiseGoalWei,
    deadline: deadline.toString(),
  };

  return {
    domain: getMetadataDomain(chainId),
    types: METADATA_TYPES,
    primaryType: "LaunchMetadata",
    message,
    wireMessage,
    nonce,
    deadline: deadline.toString(),
  };
}
