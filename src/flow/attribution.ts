import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

/**
 * ERC-8021 builder-code attribution. The frontend appends this suffix at the
 * wagmi send chokepoint (`config/builder-code.ts`); agents submit through their
 * own wallet (`send_calls`), so the SDK appends it directly to `data` instead —
 * that is the only way attribution survives an arbitrary submit path.
 *
 * Default code comes from `BOARDWALK_BUILDER_CODE`; pass a `builderCode` to any
 * encode call to override. Unset/empty → no suffix (calls are unaffected).
 */
export const DEFAULT_BUILDER_CODE = process.env.BOARDWALK_BUILDER_CODE;

/** ERC-8021 data suffix for a builder code, or `undefined` when none is set. */
export function builderCodeSuffix(code: string | undefined): Hex | undefined {
  const resolved = code ?? DEFAULT_BUILDER_CODE;
  if (!resolved) return undefined;
  return Attribution.toDataSuffix({ codes: [resolved] });
}
