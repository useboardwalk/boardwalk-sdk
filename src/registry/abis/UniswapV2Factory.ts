// Minimal Uniswap V2 Factory fragment — `getPair` resolves the pool address for
// a token pair (used to confirm a Boardwalk pool exists and to read its LP
// token).
export const uniswapV2FactoryAbi = [
  {
    type: "function",
    name: "getPair",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
  },
] as const;
