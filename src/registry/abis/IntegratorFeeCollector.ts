// Minimal IntegratorFeeCollector fragment — the per-chain singleton where
// integrators claim their accrued share of a launch token's tax (swapped to
// the raise token; slot keyed on msg.sender). `quote` returns the claimable
// amountIn and a slippage-adjusted minOut to pass into `claim`.
export const integratorFeeCollectorAbi = [
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "token", type: "address" },
      { name: "minOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "quote",
    inputs: [
      { name: "integrator", type: "address" },
      { name: "token", type: "address" },
      { name: "slippageBps", type: "uint256" },
    ],
    outputs: [
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;
