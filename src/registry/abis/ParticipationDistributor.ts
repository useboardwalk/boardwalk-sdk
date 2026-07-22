// Minimal ParticipationDistributor fragment — `claimAll` claims participation
// BWLK rewards across the given epochs (Ethereum-only contract).
export const participationDistributorAbi = [
  {
    type: "function",
    name: "claimAll",
    inputs: [{ name: "epochs", type: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
