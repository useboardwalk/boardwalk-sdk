// Single-hop direct swap through the chain's canonical Uniswap V2 router (the
// only live trading path). Launch tokens carry a transfer tax at the pair
// boundary (0.95% steady state, up to 40% decaying during the anti-whale
// window), so the swap MUST use `swapExactTokensForTokensSupportingFeeOnTransferTokens`
// — the plain variant reverts the K-check on sells and skips the tax on the
// min-out check on buys. `getAmountsOut` quotes off pair reserves only (tax-blind),
// so the quote is tax-adjusted here before the slippage floor is applied.
import { erc20Abi, zeroAddress, type Address } from "viem";
import {
  boardwalkTokenAbi,
  uniswapV2FactoryAbi,
  uniswapV2RouterAbi,
} from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { BPS_DENOMINATOR, MULTICALL3_ADDRESS } from "../constants";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { SwapParams, TxStep } from "../types";

/** 0x's native-token placeholder — rejected here (ERC-20 ↔ ERC-20 only). */
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%
const DEFAULT_DEADLINE_SECONDS = 1200; // 20 min

const isNative = (addr: Address) =>
  addr.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();

/** Mirror of `BoardwalkToken._calculateTax`'s phase logic for a non-exempt
 *  wallet: 0 pre-seed; linear `antiWhaleTaxBps → baseTaxBps` decay during the
 *  anti-whale window; `baseTaxBps` flat after. Client clock runs slightly
 *  behind execution, so during the decay this over-estimates the tax — the
 *  min-out floor errs safe. */
function currentTaxBps(
  baseTaxBps: bigint,
  antiWhaleTaxBps: bigint,
  antiWhaleDuration: bigint,
  liquiditySeedTime: bigint,
): bigint {
  if (liquiditySeedTime === BigInt(0)) return BigInt(0);
  const elapsed = BigInt(Math.floor(Date.now() / 1000)) - liquiditySeedTime;
  if (elapsed < BigInt(0)) return antiWhaleTaxBps;
  if (elapsed >= antiWhaleDuration) return baseTaxBps;
  return (
    antiWhaleTaxBps - ((antiWhaleTaxBps - baseTaxBps) * elapsed) / antiWhaleDuration
  );
}

/**
 * Build a swap: conditional approve `sellToken` → router, then
 * `swapExactTokensForTokensSupportingFeeOnTransferTokens`. Direction is just
 * the path order — pass `[raiseToken, token]` to buy or `[token, raiseToken]`
 * to sell. One side must be the chain's raise token (WETH); the other is the
 * taxed launch token. Reads the pair (must exist), the launch token's live tax,
 * the quote, and the allowance, then applies the tax + a slippage floor.
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
      "Swaps are ERC-20 ↔ ERC-20 only; acquire the raise token (WETH) first",
    );
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps >= 10_000)
    throw new Error("slippageBps must be an integer between 0 and 9999");

  const router = assertDeployed(chainId, "uniswapV2Router");
  const factory = assertDeployed(chainId, "uniswapV2Factory");
  const { raiseToken } = getContracts(chainId);
  const sellingLaunchToken =
    buyToken.toLowerCase() === raiseToken.toLowerCase();
  const buyingLaunchToken =
    sellToken.toLowerCase() === raiseToken.toLowerCase();
  if (!sellingLaunchToken && !buyingLaunchToken)
    throw new Error(
      "One side of the swap must be the chain's raise token (WETH)",
    );
  const launchToken = sellingLaunchToken ? sellToken : buyToken;
  const deadline =
    params.deadline ??
    BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

  // Pair existence + the launch token's tax phase in one multicall. getAmountsOut
  // reverts on an unknown path, so the getPair read gives a clean "no pool" error.
  const [pair, baseTaxBps, antiWhaleTaxBps, antiWhaleDuration, seedTime] =
    await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        {
          abi: uniswapV2FactoryAbi,
          address: factory,
          functionName: "getPair",
          args: [sellToken, buyToken],
        },
        {
          abi: boardwalkTokenAbi,
          address: launchToken,
          functionName: "baseTaxBps",
        },
        {
          abi: boardwalkTokenAbi,
          address: launchToken,
          functionName: "antiWhaleTaxBps",
        },
        {
          abi: boardwalkTokenAbi,
          address: launchToken,
          functionName: "antiWhaleDuration",
        },
        {
          abi: boardwalkTokenAbi,
          address: launchToken,
          functionName: "liquiditySeedTime",
        },
      ],
    });
  if (pair === zeroAddress)
    throw new Error("No Uniswap V2 pool for this token pair");

  const taxBps = currentTaxBps(
    baseTaxBps,
    antiWhaleTaxBps,
    antiWhaleDuration,
    seedTime,
  );

  // Selling: the wallet→pair transfer is taxed, so the pair only receives
  // `sellAmount − tax` — quote on that effective input.
  const effectiveIn = sellingLaunchToken
    ? (sellAmount * (BPS_DENOMINATOR - taxBps)) / BPS_DENOMINATOR
    : sellAmount;

  const path: readonly [Address, Address] = [sellToken, buyToken];
  const [amounts, allowance] = await client.multicall({
    allowFailure: false,
    multicallAddress: MULTICALL3_ADDRESS,
    contracts: [
      {
        abi: uniswapV2RouterAbi,
        address: router,
        functionName: "getAmountsOut",
        args: [effectiveIn, path],
      },
      {
        abi: erc20Abi,
        address: sellToken,
        functionName: "allowance",
        args: [account, router],
      },
    ],
  });

  let out = amounts[amounts.length - 1] ?? BigInt(0);
  // Buying: the pair→wallet transfer is taxed, and the router's min-out check
  // measures the wallet's post-tax balance delta — adjust before the floor.
  if (buyingLaunchToken)
    out = (out * (BPS_DENOMINATOR - taxBps)) / BPS_DENOMINATOR;
  if (out === BigInt(0))
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
      functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
      args: [sellAmount, amountOutMin, [sellToken, buyToken], account, deadline],
    },
  });

  return steps;
}
