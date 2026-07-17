// Minimal BoardwalkToken fragment — the per-launch token's tax-phase views.
// The swap builder reads these to compute the live transfer tax (0 pre-seed;
// linear antiWhaleTaxBps → baseTaxBps decay during the anti-whale window;
// baseTaxBps flat after) so it can tax-adjust `getAmountsOut` quotes.
export const boardwalkTokenAbi = [
  {
    type: "function",
    name: "baseTaxBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "antiWhaleTaxBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "antiWhaleDuration",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "liquiditySeedTime",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
