// Minimal Uniswap V2 Router02 fragment — Boardwalk's deployed router for direct
// ERC20-to-ERC20 swaps between a launch token and its raise token. `getAmountsOut`
// quotes the output (authoritative, fee-accurate) so the SDK needs no v2-sdk dep.
// Trimmed from token-launcher/config/abis/UniswapV2Router.ts.
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
    name: "swapExactTokensForTokens",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
] as const;
