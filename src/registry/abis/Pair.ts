// Minimal Uniswap V2 Pair fragment — reserves, total LP supply, and token0
// ordering, enough to compute remove-liquidity min-out from an LP burn. The
// pair is itself an ERC-20 (LP token); balances use viem's erc20Abi.
export const pairAbi = [
  {
    type: "function",
    name: "getReserves",
    inputs: [],
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "token0",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;
