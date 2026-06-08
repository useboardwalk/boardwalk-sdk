// @boardwalk/sdk — framework-agnostic builders for unsigned Boardwalk txs.

// Registry
export {
  getContracts,
  assertDeployed,
  isChainContractsPlaceholder,
  hasUniswapV2Deployed,
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

// Flow primitives
export type {
  TxRequest,
  TxWriteRequest,
  TxSendRequest,
  TxStep,
  EncodedCall,
} from "./flow/types";
export { isWriteRequest } from "./flow/types";
export { encodeStep, encodeSteps, encodeRequest } from "./flow/encode";
export type { EncodeOptions } from "./flow/encode";
export { builderCodeSuffix, DEFAULT_BUILDER_CODE } from "./flow/attribution";
export {
  buildConditionalApproveStep,
  buildApproveStep,
  checkAllowance,
} from "./flow/erc20";

// Builders (the 5 v1 actions)
export { buildLaunchSteps } from "./builders/launch";
export type { LaunchParams, BuildLaunchResult } from "./builders/launch";
export { buildContributeSteps } from "./builders/contribute";
export type { ContributeParams } from "./builders/contribute";
export { buildClaimSteps } from "./builders/claim";
export type { ClaimParams } from "./builders/claim";
export { buildStakeBmxSteps } from "./builders/stake-bmx";
export type { StakeBmxParams } from "./builders/stake-bmx";
export { buildVoteSteps } from "./builders/vote";
export type { VoteParams, VoteOption } from "./builders/vote";

// Launch config
export { buildLaunchConfig } from "./launch/build-launch-config";
export type {
  LaunchInput,
  FeeRecipientInput,
} from "./launch/build-launch-config";
export type { LaunchConfig } from "./launch/launch-config";
export { effectiveCost } from "./launch/member-discount";

// Metadata kit
export {
  buildLaunchMetadataTypedData,
  getMetadataDomain,
  METADATA_TYPES,
} from "./metadata/message";
export type {
  MetadataInput,
  MetadataWireMessage,
  LaunchMetadataMessage,
  LaunchMetadataTypedData,
} from "./metadata/message";
export {
  uploadLogo,
  LOGO_ALLOWED_TYPES,
  LOGO_MAX_SIZE,
} from "./metadata/upload";
export type { UploadLogoResult, UploadLogoOptions } from "./metadata/upload";
export { postSignedMetadata } from "./metadata/post";
export type {
  PostMetadataOptions,
  SubmitMetadataResponse,
} from "./metadata/post";

// Read
export { getLaunch } from "./read/launches";
export type { LaunchSummary, LaunchStatus } from "./read/launches";
export { apiGet, ApiError, DEFAULT_API_BASE_URL } from "./read/client";
