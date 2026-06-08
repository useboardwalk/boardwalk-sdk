/**
 * Token description validation and Boardwalk default copy (SEO + skip path).
 */

export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 800;

/** Applied when the issuer skips description during launch or clears profile text. */
export const BOARDWALK_DEFAULT_DESCRIPTION = `This token launched through Boardwalk, a community-centered fee-protection economy launcher. Every Boardwalk-launched token has permanently locked liquidity and a swap-fee-equivalent built directly into the token. This fee protection helps defend against opportunistic strategies and keeps fees flowing to active supporters of the economy.

Boardwalk economies connect Issuers, Contributors, Participants, Referrers, Public Good recipients, and Growth Team partners — including creators, KOLs, media, community managers, PR, BD, ambassadors, DevRel, security partners, event organizers, educators, venture capital, and others nurturing long-term growth. Café Boardwalk brings them together.

Fee routing, allocation details, and pending changes are visible on the Token Profile Page.`;

export interface DescriptionValidation {
  ok: boolean;
  reason?: string;
}

export function validateDescription(value: string): DescriptionValidation {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Description is required." };
  }
  if (trimmed.length < DESCRIPTION_MIN) {
    return {
      ok: false,
      reason: `Description must be at least ${DESCRIPTION_MIN} characters.`,
    };
  }
  if (trimmed.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      reason: `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
    };
  }
  return { ok: true };
}

export function resolveDescription(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : BOARDWALK_DEFAULT_DESCRIPTION;
}

export function isBoardwalkDefaultDescription(text: string): boolean {
  return text.trim() === BOARDWALK_DEFAULT_DESCRIPTION;
}

export const DESCRIPTION_PREVIEW_MAX = 330;

/** Token profile stacks video + description vertically when text exceeds this length. */
export const DESCRIPTION_COLUMN_LAYOUT_THRESHOLD = 450;

/** Single-line preview for discover list rows; truncates with "..." when over max. */
export function formatDescriptionPreview(
  text: string,
  maxLength = DESCRIPTION_PREVIEW_MAX,
): string {
  if (!text) return "";
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength)}...`;
}
