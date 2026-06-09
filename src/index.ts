// @boardwalk/sdk — framework-agnostic builders for unsigned Boardwalk txs.

// Public types (single source of truth: src/types.ts)
export type {
  TxRequest,
  TxWriteRequest,
  TxSendRequest,
  TxStep,
  EncodedCall,
  LaunchConfig,
  LaunchInput,
  LaunchLinkInput,
  LaunchLinkSocials,
  LaunchLinkPrefill,
  BuildLaunchLinkResult,
  FeeRecipientInput,
  LaunchParams,
  BuildLaunchResult,
  LaunchCostBreakdown,
  ContributeParams,
  ClaimParams,
  StakeBmxParams,
  VoteParams,
  VoteOption,
  MetadataInput,
  LaunchMetadataMessage,
  MetadataWireMessage,
  LaunchMetadataTypedData,
  UploadLogoResult,
  UploadLogoOptions,
  PostMetadataOptions,
  SubmitMetadataResponse,
  LaunchSummary,
  LaunchStatus,
} from "./types";

// Constants (single source of truth: src/constants.ts)
export {
  BUILDER_CODE,
  API_BASE_URL,
  APP_BASE_URL,
  LAUNCH_BASE_URL,
  LAUNCH_CATEGORY_SLUGS,
  MULTICALL3_ADDRESS,
  BPS_DENOMINATOR,
  TOS_URI,
  TOS_VERSION,
  LOGO_MAX_SIZE,
  LOGO_ALLOWED_TYPES,
} from "./constants";

// Registry
export {
  getContracts,
  assertDeployed,
  chainContracts,
} from "./registry/contracts";
export type { ChainContracts } from "./registry/contracts";
export {
  SUPPORTED_CHAINS,
  toNumericChainId,
  toChainSlug,
  getChainLabel,
  getBlockExplorerTxUrl,
  getBlockExplorerAddressUrl,
} from "./registry/chains";
export type { ChainSlug } from "./registry/chains";
export { getLaunchConfig, chainLaunchConfig } from "./registry/launch-config";
export type { ChainLaunchConfig } from "./registry/launch-config";

// Flow
export {
  encodeStep,
  encodeSteps,
  encodeRequest,
  BUILDER_CODE_SUFFIX,
} from "./flow/encode";
export {
  buildConditionalApproveStep,
  buildApproveStep,
  checkAllowance,
  readAllowance,
} from "./flow/erc20";

// Builders (the 5 v1 actions)
export {
  buildLaunchSteps,
  readLaunchCost,
  resolveLaunchedToken,
} from "./builders/launch";
export { buildContributeSteps } from "./builders/contribute";
export { buildClaimSteps } from "./builders/claim";
export { buildStakeBmxSteps } from "./builders/stake-bmx";
export { buildVoteSteps } from "./builders/vote";

// Launch config
export { buildLaunchConfig } from "./launch/build-launch-config";
export { buildLaunchLink } from "./launch/build-launch-link";
export { effectiveCost } from "./launch/member-discount";

// Metadata kit
export {
  buildLaunchMetadataTypedData,
  getMetadataDomain,
  METADATA_TYPES,
} from "./metadata/message";
export { uploadLogo } from "./metadata/upload";
export { postSignedMetadata } from "./metadata/post";

// Read
export { getLaunch, getAuctionUrl } from "./read/launches";
export { apiGet, ApiError } from "./read/client";
