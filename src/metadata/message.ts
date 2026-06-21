// EIP-712 launch metadata. The SDK only BUILDS the typed data; the agent's
// wallet signs it.
import { METADATA_DOMAIN_NAME, METADATA_DOMAIN_VERSION } from "../constants";
import type {
  LaunchMetadataMessage,
  LaunchMetadataTypedData,
  MetadataInput,
  MetadataWireMessage,
} from "../types";

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
