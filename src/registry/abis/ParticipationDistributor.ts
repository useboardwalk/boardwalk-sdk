// Minimal ParticipationDistributor fragment — `claimAll` claims participation
// BMX rewards across the given epochs (Base-only contract).
export const participationDistributorAbi = [
  {
    type: "function",
    name: "claimAll",
    inputs: [{ name: "epochs", type: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
