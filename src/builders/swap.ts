// Single-hop direct
// swap through Boardwalk's deployed Uniswap V2 router (the only live trading
// path). The quote uses the router's `getAmountsOut` (authoritative + fee-exact)
// instead of @uniswap/v2-sdk, so the SDK pulls in no extra dependency.
import { erc20Abi, zeroAddress, type Address } from "viem";
import { uniswapV2FactoryAbi, uniswapV2RouterAbi } from "../registry/abis";
import { assertDeployed } from "../registry/contracts";
import { BPS_DENOMINATOR, MULTICALL3_ADDRESS } from "../constants";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { SwapParams, TxStep } from "../types";

/** 0x's native-token placeholder — rejected here (ERC-20 ↔ ERC-20 only). */
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
const DEFAULT_DEADLINE_SECONDS = 1200; // 20 min

const isNative = (addr: Address) =>
  addr.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

/**
 * Build a swap: conditional approve `sellToken` → router, then
 * `swapExactTokensForTokens`. Direction is just the path order — pass
 * `[raiseToken, token]` to buy or `[token, raiseToken]` to sell. Reads the pair
 * (must exist), the quote, and the allowance, then applies a slippage floor.
 */
export async function buildSwapSteps(params: SwapParams): Promise<TxStep[]> {
  const { client, account, chainId, sellToken, buyToken, sellAmount } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  if (sellAmount <= BigInt(0))
    throw new Error("Swap amount must be greater than 0");
  if (sellToken.toLowerCase() === buyToken.toLowerCase())
    throw new Error("sellToken and buyToken must differ");
  if (isNative(sellToken) || isNative(buyToken))
    throw new Error(
      "Swaps are ERC-20 ↔ ERC-20 only; acquire the raise token first",
    );
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000)
    throw new Error("slippageBps must be an integer between 0 and 9999");

  const router = assertDeployed(chainId, "uniswapV2Router");
  const factory = assertDeployed(chainId, "uniswapV2Factory");
  const deadline =
    params.deadline ??
    BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

  // Confirm a Boardwalk pool exists first — getAmountsOut reverts on an
  // unknown path, so this gives a clean "no pool" error instead.
  const pair = await client.readContract({
    abi: uniswapV2FactoryAbi,
    address: factory,
    functionName: "getPair",
    args: [sellToken, buyToken],
  });
  if (pair === zeroAddress)
    throw new Error("No Boardwalk pool for this token pair");

  const path: readonly [Address, Address] = [sellToken, buyToken];
  const [amounts, allowance] = await client.multicall({
    allowFailure: false,
    multicallAddress: MULTICALL3_ADDRESS,
    contracts: [
      {
        abi: uniswapV2RouterAbi,
        address: router,
        functionName: "getAmountsOut",
        args: [sellAmount, path],
      },
      {
        abi: erc20Abi,
        address: sellToken,
        functionName: "allowance",
        args: [account, router],
      },
    ],
  });

  const out = amounts[amounts.length - 1];
  if (!out || out === BigInt(0))
    throw new Error("Swap quote returned zero output (insufficient liquidity)");
  const amountOutMin =
    (out * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(
    client,
    {
      id: "approve-sell-token",
      label: "Approve token",
      token: sellToken,
      owner: account,
      spender: router,
      amount: sellAmount,
    },
    allowance,
  );
  if (approve) steps.push(approve);

  steps.push({
    id: "swap",
    label: "Swap",
    request: {
      abi: uniswapV2RouterAbi,
      address: router,
      functionName: "swapExactTokensForTokens",
      args: [sellAmount, amountOutMin, [sellToken, buyToken], account, deadline],
    },
  });

  return steps;
}
