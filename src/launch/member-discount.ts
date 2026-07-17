/**
 * Mirror of `MembershipDiscount._effectiveCost` from contracts/base/MembershipDiscount.sol.
 *
 * `bps` is the member discount in basis points (0–10_000). When the caller is
 * a member, the effective cost is `base - (base * bps / 10_000)` — the contract
 * rounds the *discount* down (cost up), so this must not be rewritten as
 * `base * (10_000 - bps) / 10_000`, which rounds the cost down and can
 * under-approve by 1 wei. Non-members pay the full `base`.
 */
import { BPS_DENOMINATOR } from "../constants";

export function effectiveCost(
  base: bigint,
  discountBps: bigint,
  isMember: boolean,
): bigint {
  if (!isMember || discountBps === BigInt(0)) return base;
  // The contract's setters cap the discount at 10_000, but clamp defensively —
  // a negative bigint here would poison approve amounts downstream.
  if (discountBps >= BPS_DENOMINATOR) return BigInt(0);
  return base - (base * discountBps) / BPS_DENOMINATOR;
}
