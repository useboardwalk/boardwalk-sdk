import type { Address } from "viem";

/**
 * Data contract for a launch. Field order is byte-aligned to the `createLaunch`
 * ABI tuple in `config/abis/LaunchFactory.ts` — do not reorder.
 *
 * Lives in `lib/` (a leaf layer) so both the builder (`lib/build-launch-config`)
 * and the hook (`hooks/contracts/useCreateLaunch`, which re-exports it) can share
 * it without `lib` reaching up into `hooks`.
 */
export interface LaunchConfig {
  name: string;
  ticker: string;
  category: string;
  description: string;
  path: number; // 0 = EXPRESS, 1 = ADVANCED
  presalePercent: bigint;
  vestingRecipients: Address[];
  vestingPercents: bigint[];
  vestingLabels: string[];
  referrer: Address;
  issuerFeeRecipients: Address[];
  issuerFeeSplits: bigint[];
  issuerFeeLabels: string[];
}
