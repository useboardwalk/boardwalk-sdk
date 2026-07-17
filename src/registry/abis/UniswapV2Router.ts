// Minimal Uniswap V2 Router02 fragment — the chain's canonical router for direct
// ERC20-to-ERC20 swaps between a launch token and WETH. `getAmountsOut` quotes
// off pair reserves only (it is blind to the launch token's transfer tax — the
// swap builder tax-adjusts). Launch tokens are fee-on-transfer at the pair
// boundary, so swaps MUST use the SupportingFeeOnTransferTokens variant: the
// plain one reverts the K-check on sells and skips the tax on the min-out
// check on buys. Note it returns nothing.
export const uniswapV2RouterAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
