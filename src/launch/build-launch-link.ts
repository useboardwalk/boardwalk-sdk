// Generates a prefilled token-launcher /launch?path=…&prefill=… URL. The launch
// form (token-launcher app/launch route) parses `path` + the base64url `prefill`
// JSON, re-validates every field, and navigates to its summary step — the user
// adds a logo and signs in the UI (a URL can't carry an image, and nothing here
// signs or sends). Validation is delegated to buildLaunchConfig (the same checks
// the on-chain createLaunch path runs) plus link-only checks for chain, category,
// raise goal, and the express fee recipient. Pure + client-free.
import { isAddress, parseUnits, formatUnits, type Address } from "viem";
import type {
  BuildLaunchLinkResult,
  FeeRecipientInput,
  LaunchLinkInput,
  LaunchLinkPrefill,
  LaunchLinkSocials,
} from "../types";
import { LAUNCH_BASE_URL, LAUNCH_CATEGORY_SLUGS } from "../constants";
import {
  SUPPORTED_CHAINS,
  toChainSlug,
  toNumericChainId,
} from "../registry/chains";
import { getLaunchConfig } from "../registry/launch-config";
import { buildLaunchConfig } from "./build-launch-config";
import { validateDescription } from "./description";

/** Standard base64 → base64url (no padding); isomorphic Node + browser. */
function base64UrlEncode(json: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(json, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// YouTube/TikTok detection mirrored from token-launcher/utils/videoUrlUtils.ts, so a
// video URL the launch form would drop fails here at generation instead of silently.
const YOUTUBE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?\S*v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const TIKTOK_RE = /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i;
function isSupportedVideoUrl(url: string): boolean {
  const v = url.trim();
  return YOUTUBE_RE.test(v) || TIKTOK_RE.test(v);
}

/** Normalize a discord social to the bare invite code the form expects. */
function normalizeDiscord(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, "");
  const match = trimmed.match(/(?:discord\.gg|discord\.com\/invite)\/([^/?\s]+)/i);
  return match?.[1] ?? trimmed;
}

function resolveChain(chain: string | number): {
  chainId: number;
  slug: string;
} {
  const numeric =
    typeof chain === "number"
      ? chain
      : /^\d+$/.test(chain)
        ? Number(chain)
        : toNumericChainId(chain);
  const entry = SUPPORTED_CHAINS.find((c) => c.numericId === numeric);
  if (!entry) {
    throw new Error(
      `unsupported chain "${chain}". Supported: ${SUPPORTED_CHAINS.map((c) => c.slug).join(", ")}`,
    );
  }
  return { chainId: entry.numericId, slug: toChainSlug(entry.numericId)! };
}

/** Trim, drop empties, and strip a leading @ from handle-style socials. */
function compactSocials(
  socials: LaunchLinkSocials | undefined,
): LaunchLinkSocials | undefined {
  if (!socials) return undefined;
  const out: LaunchLinkSocials = {};
  const x = socials.x?.trim().replace(/^@/, "");
  if (x) out.x = x;
  const telegram = socials.telegram?.trim().replace(/^@/, "");
  if (telegram) out.telegram = telegram;
  const discord = socials.discord ? normalizeDiscord(socials.discord) : "";
  if (discord) out.discord = discord;
  const youtube = socials.youtube?.trim();
  if (youtube) out.youtube = youtube;
  return Object.keys(out).length > 0 ? out : undefined;
}

function toDtoRecipients(
  entries: FeeRecipientInput[],
): Array<{ label: string; address: Address; percent: number }> {
  return entries.map((e) => ({
    label: e.label ?? "individual",
    address: e.address,
    percent: e.percent,
  }));
}

/**
 * Build a prefilled `/launch?…` link from a `LaunchLinkInput`. Throws (with the
 * same messages as the on-chain launch path) on any invalid field.
 */
export function buildLaunchLink(input: LaunchLinkInput): BuildLaunchLinkResult {
  const { chainId, slug } = resolveChain(input.chain);
  const isExpress = input.path === "express";

  // Run the same name/ticker/presale/fee+vesting validation the launch builder
  // uses, and reuse its normalized name/ticker so the form's (identical) validators
  // accept them too.
  const config = buildLaunchConfig({
    name: input.name,
    ticker: input.ticker,
    category: input.category,
    description: input.description,
    path: input.path,
    chainId,
    issuerFeeRecipient: input.issuerFeeRecipient,
    issuerFee: input.issuerFee,
    vesting: input.vesting,
    presaleSupplyPercent: input.presaleSupplyPercent,
    referrer: input.referrer,
  });

  // Link-only: the form is a fixed category picker, so reject categories it can't
  // select (the on-chain `launch` path is intentionally more permissive).
  if (!(LAUNCH_CATEGORY_SLUGS as readonly string[]).includes(input.category)) {
    throw new Error(
      `category "${input.category}" is not a launch category. One of: ${LAUNCH_CATEGORY_SLUGS.join(", ")}`,
    );
  }

  // buildLaunchConfig silently drops an invalid express recipient — fail loudly here.
  if (
    isExpress &&
    input.issuerFeeRecipient &&
    !isAddress(input.issuerFeeRecipient)
  ) {
    throw new Error("issuerFeeRecipient must be a valid address");
  }

  // Validate the soft-metadata fields the launch form re-checks, so a link is never
  // emitted carrying a value the form would silently drop.
  if (input.description) {
    const check = validateDescription(input.description);
    if (!check.ok) throw new Error(check.reason ?? "invalid description");
  }
  if (input.video && !isSupportedVideoUrl(input.video)) {
    throw new Error(
      "video must be a YouTube or TikTok URL (youtube.com, youtu.be, or tiktok.com)",
    );
  }

  const prefill: LaunchLinkPrefill = {
    v: 1,
    name: config.name,
    ticker: config.ticker,
    category: input.category,
    chain: slug,
  };
  if (input.description) prefill.description = input.description;
  if (input.video) prefill.video = input.video;
  const socials = compactSocials(input.socials);
  if (socials) prefill.socials = socials;

  if (isExpress) {
    if (input.issuerFeeRecipient) prefill.feeRecipient = input.issuerFeeRecipient;
  } else {
    prefill.presalePercent = Number(input.presaleSupplyPercent ?? 50);

    if (input.raiseGoalEth != null && input.raiseGoalEth !== "") {
      let wei: bigint;
      try {
        wei = parseUnits(input.raiseGoalEth, 18);
      } catch {
        throw new Error("raiseGoalEth must be a decimal number");
      }
      const grad = getLaunchConfig(chainId);
      if (wei <= grad.graduationThresholdWei) {
        throw new Error(
          `raiseGoalEth (${input.raiseGoalEth} ${grad.raiseTokenSymbol}) must be greater than the graduation threshold (${formatUnits(grad.graduationThresholdWei, 18)} ${grad.raiseTokenSymbol}) on this chain`,
        );
      }
      prefill.raiseGoalEth = input.raiseGoalEth;
    }

    if (input.issuerFee?.length) prefill.fees = toDtoRecipients(input.issuerFee);
    if (input.vesting?.length) prefill.vesting = toDtoRecipients(input.vesting);
    if (input.referrer && isAddress(input.referrer))
      prefill.referrer = input.referrer;
  }

  // base64url is URL-safe (no +/=) so the blob needs no extra encoding.
  const encoded = base64UrlEncode(JSON.stringify(prefill));
  const url = `${LAUNCH_BASE_URL}?path=${input.path}&prefill=${encoded}`;
  return { url, path: input.path, prefill };
}
