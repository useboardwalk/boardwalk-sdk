// Minimal LPStaking fragment — per-launch LP staking contract: stake/withdraw
// the LP token and claim accrued rewards. `lpToken` lets callers resolve the
// pair to approve. Trimmed from token-launcher/config/abis/LPStaking.ts.
export const lpStakingAbi = [
  {
    type: "function",
    name: "stake",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claim",
    inputs: [],
    outputs: [{ name: "pendingAmount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "lpToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;
