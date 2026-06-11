// Single source of truth for SDK constants. Keep all magic values here.

/** Basis-point denominator (100% = 10_000 bps). */
export const BPS_DENOMINATOR = BigInt(10_000);

/** GovernanceVoter participation gate: a voter with staked BMX must hold staked
 *  multiplier points of at least this share of their staked BMX (150 bps = 1.5%),
 *  else `vote()` reverts InsufficientParticipationPoints. Mirrors the private
 *  constant in boardwalk-contracts GovernanceVoter.sol — keep in sync. */
export const PARTICIPATION_POINTS_GATE_BPS = BigInt(150);

/** Boardwalk backend base URL; override with `BOARDWALK_API_URL` for staging. */
export const API_BASE_URL =
  process.env.BOARDWALK_API_URL ?? "https://api.useboardwalk.com";

/** Boardwalk web app base URL (for token/auction profile links); override with
 *  `BOARDWALK_APP_URL`. The app routes (/discover/...) live on the app subdomain;
 *  the `www` host is marketing/docs only (see TOS_URI). */
export const APP_BASE_URL =
  process.env.BOARDWALK_APP_URL ?? "https://app.useboardwalk.com";

/** Launch-form base URL for prefilled `/launch?path=…&prefill=…` links; override
 *  with `BOARDWALK_LAUNCH_URL`. The token-launcher launch form parses `path` + the
 *  base64url `prefill` blob and navigates to its summary step itself. */
export const LAUNCH_BASE_URL =
  process.env.BOARDWALK_LAUNCH_URL ?? `${APP_BASE_URL}/launch`;

/**
 * Launch-form category slugs (verbatim from token-launcher app/launch/constants.ts
 * CATEGORIES). The launch form is a fixed picker, so `buildLaunchLink` validates
 * against these to avoid emitting a link the form would silently drop. The on-chain
 * `launch` path is intentionally more permissive (any non-empty category).
 */
export const LAUNCH_CATEGORY_SLUGS = [
  "meme-culture",
  "gaming",
  "creator-media",
  "protocol-defi",
  "infra-tools",
  "app-consumer",
  "nft-collectibles",
  "community",
  "ai-agents",
  "public-goods",
  "other",
] as const;

/** Canonical Multicall3 — same address on every supported chain. Passed
 *  explicitly to `client.multicall` so batching works regardless of whether a
 *  given chain is in viem's built-in multicall3 config. */
export const MULTICALL3_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

/**
 * Default RPC per chain id. The CLI falls back to viem's built-in chain RPC
 * when a chain isn't listed here; pass `--rpc` to override on any command.
 */
export const DEFAULT_RPC_BY_CHAIN: Record<number, string> = {
  8453: "https://mainnet.base.org", // Base
};

/**
 * Boardwalk's ERC-8021 builder code. ENFORCED on every transaction the SDK
 * builds — there is intentionally no per-call, CLI, or env override, so all
 * SDK-driven volume is attributed to Boardwalk.
 */
export const BUILDER_CODE = "bc_snzinn6r";

/** Terms of Service signed into launch metadata (`tos_uri` / `tos_version`). */
export const TOS_URI = "https://www.useboardwalk.com/docs/terms";
export const TOS_VERSION = "1";

/** EIP-712 domain for launch metadata. */
export const METADATA_DOMAIN_NAME = "BoardwalkLaunchMetadata";
export const METADATA_DOMAIN_VERSION = "1";

/** Logo upload constraints (backend hard cap is 1 MB). Types mirror the
 *  backend's ALLOWED_EXTENSIONS (morphex-backend boardwalk_upload.js) —
 *  anything else is rejected server-side with a 400. */
export const LOGO_MAX_SIZE = 1 * 1024 * 1024;
export const LOGO_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/** Logo file-extension → MIME, for the CLI's `--logo <file>`. */
export const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};
