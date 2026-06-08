/**
 * Normalization and validation for token name & ticker.
 *
 * Rules:
 *   Ticker — A-Z 0-9 only, length 2–10, recommended 3–5, warn after 6.
 *   Name   — ASCII printable (0x20–0x7E) only, length 3–32, recommended ≤20,
 *            trimmed, no invisible/control/bidi characters.
 *
 * Additionally, popular chain-specific tickers are reserved (see
 * `CHAIN_RESERVED_TICKERS`) so users can't impersonate ecosystem tokens like
 * KAT on Katana or FRAX on Fraxtal.
 */

import { mainnet, base, fraxtal, katana, ink } from "viem/chains";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TICKER_MIN = 2;
export const TICKER_MAX = 10;
export const TICKER_RECOMMENDED_MAX = 5;
export const TICKER_WARN_AFTER = 6;

export const NAME_MIN = 3;
export const NAME_MAX = 32;
export const NAME_RECOMMENDED_MAX = 20;

const TICKER_RE = /[^A-Z0-9]/g;
const ASCII_PRINTABLE_RE = /[^\x20-\x7E]/g;

// ---------------------------------------------------------------------------
// Impersonation blacklist (names + tickers that resemble Boardwalk / BMX).
//
// Matching is fuzzy: input is NFKD-normalized, lowercased, stripped to
// alphanumerics, has Cyrillic/Greek look-alikes folded to Latin, and has
// leetspeak digits folded to letters before comparison. Name match is a
// substring test (so "Boardwalk Rewards Airdrop" matches "boardwalk");
// ticker match is exact equality after normalization.
// ---------------------------------------------------------------------------

const IMPERSONATION_BLACKLIST: ReadonlyArray<{ name: string; ticker: string }> =
  [
    { name: "Boardwalk", ticker: "BOARDWALK" },
    { name: "Boardwalk Token", ticker: "BOARD" },
    { name: "Boardwalk Protocol", ticker: "BWP" },
    { name: "Boardwalk Official", ticker: "BWO" },
    { name: "Official Boardwalk", ticker: "OBW" },
    { name: "Boardwalk Finance", ticker: "BWF" },
    { name: "Boardwalk Launchpad", ticker: "BWLP" },
    { name: "Boardwalk Claim", ticker: "BWCLAIM" },
    { name: "Boardwalk Airdrop", ticker: "BWAIRDROP" },
    { name: "Boardwalk Rewards", ticker: "BWREWARD" },
    { name: "Boardwalk Staking", ticker: "BWSTAKE" },
    { name: "Boardwalk Governance", ticker: "BWG" },
    { name: "Boardwalk Support", ticker: "BWSUPPORT" },
    { name: "Boardwalk Security", ticker: "BWSEC" },
    { name: "Boardwalk Verified", ticker: "BWVERIFY" },
    { name: "BMX", ticker: "BMX" },
    { name: "BMX Token", ticker: "BMXT" },
    { name: "BMX Official", ticker: "BMXO" },
    { name: "BMX Claim", ticker: "BMXCLAIM" },
    { name: "Wrapped BMX", ticker: "WBMX" },
  ];

// ---------------------------------------------------------------------------
// Chain-scoped reserved tickers.
//
// Popular ecosystem tickers that users on a given chain would expect to
// resolve to the canonical token — blocked on that chain only. Subject to
// the same fuzzy match (normalize + homoglyph + leetspeak fold) as the
// impersonation blacklist.
// ---------------------------------------------------------------------------

const CHAIN_RESERVED_TICKERS: Record<number, ReadonlyArray<string>> = {
  [katana.id]: [
    "KAT",
    "veKAT",
    "vKAT",
    "vbUSDC",
    "vbUSDT",
    "vbWBTC",
    "vbETH",
    "vbKAT",
  ],
  [fraxtal.id]: ["frxUSD", "FRAX", "FXS"],
  [mainnet.id]: [],
  [base.id]: [],
  [ink.id]: [],
};

// Cyrillic / Greek look-alikes → Latin. Extend if a new impersonation surfaces.
const HOMOGLYPH_MAP: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  А: "a",
  В: "b",
  Е: "e",
  К: "k",
  М: "m",
  Н: "h",
  О: "o",
  Р: "p",
  С: "c",
  Т: "t",
  Х: "x",
  Α: "a",
  Β: "b",
  Ε: "e",
  Η: "h",
  Ι: "i",
  Κ: "k",
  Μ: "m",
  Ν: "n",
  Ο: "o",
  Ρ: "p",
  Τ: "t",
  Υ: "y",
  Χ: "x",
  Ζ: "z",
  μ: "m",
  ν: "n",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "y",
  χ: "x",
};

function normalizeForBlacklist(raw: string): string {
  return raw
    .normalize("NFKD")
    .split("")
    .map((c) => HOMOGLYPH_MAP[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t");
}

export function isImpersonatingName(name: string): boolean {
  const n = normalizeForBlacklist(name);
  if (n === "") return false;
  return IMPERSONATION_BLACKLIST.some((entry) => {
    const target = normalizeForBlacklist(entry.name);
    return target !== "" && n.includes(target);
  });
}

export function isImpersonatingTicker(ticker: string): boolean {
  const t = normalizeForBlacklist(ticker);
  if (t === "") return false;
  return IMPERSONATION_BLACKLIST.some(
    (entry) => normalizeForBlacklist(entry.ticker) === t,
  );
}

/**
 * True when the ticker matches a chain-specific reserved name (e.g. KAT on
 * Katana). Returns false when chainId is unknown so the gate fails open if
 * the form is in an unexpected state — the chain-agnostic impersonation
 * check still applies.
 */
export function isReservedChainTicker(
  ticker: string,
  chainId: number | undefined,
): boolean {
  if (chainId == null) return false;
  const reserved = CHAIN_RESERVED_TICKERS[chainId];
  if (!reserved || reserved.length === 0) return false;
  const t = normalizeForBlacklist(ticker);
  if (t === "") return false;
  return reserved.some((entry) => normalizeForBlacklist(entry) === t);
}

// ---------------------------------------------------------------------------
// Normalization (designed for on-change / on-blur transforms)
// ---------------------------------------------------------------------------

/** Uppercase, strip anything outside A-Z 0-9, cap at TICKER_MAX. */
export function normalizeTokenTicker(raw: string): string {
  return raw.toUpperCase().replace(TICKER_RE, "").slice(0, TICKER_MAX);
}

/** Trim edges, strip non-ASCII-printable chars, cap at NAME_MAX. */
export function normalizeTokenName(raw: string): string {
  return raw.replace(ASCII_PRINTABLE_RE, "").slice(0, NAME_MAX);
}

/** Trim leading/trailing whitespace only (for on-blur). */
export function trimTokenName(raw: string): string {
  return raw.trim();
}

// ---------------------------------------------------------------------------
// Validation (designed for step-gating / config-build checks)
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface TickerValidation extends ValidationResult {
  length: number;
  warnLong: boolean;
}

export interface NameValidation extends ValidationResult {
  length: number;
  warnLong: boolean;
}

export function validateTokenTicker(
  ticker: string,
  chainId?: number,
): TickerValidation {
  const length = ticker.length;
  const warnLong = length > TICKER_WARN_AFTER;

  if (length < TICKER_MIN) {
    return {
      ok: false,
      reason: `Min ${TICKER_MIN} characters`,
      length,
      warnLong,
    };
  }
  if (length > TICKER_MAX) {
    return {
      ok: false,
      reason: `Max ${TICKER_MAX} characters`,
      length,
      warnLong,
    };
  }
  if (TICKER_RE.test(ticker)) {
    TICKER_RE.lastIndex = 0;
    return {
      ok: false,
      reason: "Only letters (A–Z) and digits (0–9)",
      length,
      warnLong,
    };
  }
  if (isImpersonatingTicker(ticker)) {
    return {
      ok: false,
      reason: "Ticker resembles a protected protocol ticker",
      length,
      warnLong,
    };
  }
  if (isReservedChainTicker(ticker, chainId)) {
    return {
      ok: false,
      reason: "Ticker is reserved on this chain",
      length,
      warnLong,
    };
  }
  return { ok: true, length, warnLong };
}

export function validateTokenName(name: string): NameValidation {
  const trimmed = name.trim();
  const length = trimmed.length;
  const warnLong = length > NAME_RECOMMENDED_MAX;

  if (length < NAME_MIN) {
    return {
      ok: false,
      reason: `Min ${NAME_MIN} characters`,
      length,
      warnLong,
    };
  }
  if (length > NAME_MAX) {
    return {
      ok: false,
      reason: `Max ${NAME_MAX} characters`,
      length,
      warnLong,
    };
  }
  if (ASCII_PRINTABLE_RE.test(trimmed)) {
    ASCII_PRINTABLE_RE.lastIndex = 0;
    return {
      ok: false,
      reason: "Only ASCII characters allowed",
      length,
      warnLong,
    };
  }
  if (isImpersonatingName(trimmed)) {
    return {
      ok: false,
      reason: "Name resembles a protected protocol name",
      length,
      warnLong,
    };
  }
  return { ok: true, length, warnLong };
}
