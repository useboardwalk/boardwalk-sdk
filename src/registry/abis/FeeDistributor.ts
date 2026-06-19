// Minimal FeeDistributor fragment — only the per-launch fee-claim entrypoints
// the SDK builds. Trimmed from token-launcher/config/abis/FeeDistributor.ts;
// keep signatures in sync with that source.
export const feeDistributorAbi = [
  {
    type: "function",
    name: "claimAsRaiseToken",
    inputs: [
      { name: "recipientIdx", type: "uint256" },
      { name: "minRaiseTokenOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimReferrerFees",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
