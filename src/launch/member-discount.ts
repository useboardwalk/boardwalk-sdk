/**
 * Mirror of `MembershipDiscount._effectiveCost` from contracts/core/MembershipDiscount.sol.
 *
 * `bps` is the member discount in basis points (0–10_000). When the caller is
 * a member, the effective cost is `base * (10_000 - bps) / 10_000`. Non-members
 * pay the full `base`.
 */
import { BPS_DENOMINATOR } from "../registry/constants";

export function effectiveCost(
  base: bigint,
  discountBps: bigint,
  isMember: boolean,
): bigint {
  if (!isMember || discountBps === BigInt(0)) return base;
  if (discountBps >= BPS_DENOMINATOR) return BigInt(0);
  return (base * (BPS_DENOMINATOR - discountBps)) / BPS_DENOMINATOR;
}
