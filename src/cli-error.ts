// CLI error formatting. viem errors put the useful line in `shortMessage`;
// their full `message` embeds the encoded calldata, the raw request body, and
// — when a public RPC rate-limits — an entire HTML error page. Print the short
// line (plus an actionable hint when the RPC is rate-limiting) and keep the
// full error behind BOARDWALK_DEBUG=1.

/** True when any error in the cause chain looks rate-limited: an HTTP 429
 *  (e.g. a Cloudflare page from eth.merkle.io) or a "rate limit" detail
 *  (e.g. mainnet.base.org's JSON-RPC "over rate limit"). */
function isRateLimited(e: unknown): boolean {
  let cur: unknown = e;
  while (cur instanceof Error) {
    const { status, details } = cur as { status?: unknown; details?: unknown };
    if (status === 429) return true;
    if (
      typeof details === "string" &&
      /rate.?limit|too many requests/i.test(details)
    ) {
      return true;
    }
    cur = cur.cause;
  }
  return false;
}

export function formatCliError(e: unknown): string {
  const full = e instanceof Error ? e.message : String(e);
  if (process.env.BOARDWALK_DEBUG) return full;
  // Non-viem errors (option validation, fs, our own throws) are already short.
  const short = (e as { shortMessage?: unknown } | null)?.shortMessage;
  if (typeof short !== "string") return full;
  const hint = isRateLimited(e)
    ? " RPC rate-limited — pass --rpc <url> to use a different endpoint."
    : "";
  return `${short}${hint} (set BOARDWALK_DEBUG=1 for the full error)`;
}
