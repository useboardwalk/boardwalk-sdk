// Minimal VestingStream fragment — per-launch vesting contract; `claim` releases
// a recipient's vested launch tokens for one allocation. Trimmed from
// token-launcher/config/abis/VestingStream.ts.
export const vestingStreamAbi = [
  {
    type: "function",
    name: "claim",
    inputs: [{ name: "allocationId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
