// Ported from token-launcher/hooks/contracts/useRemoveLiquidity.ts.
import { boardwalkLPManagerAbi } from "../registry/abis";
import { getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { RemoveLiquidityParams, TxStep } from "../types";

/**
 * Build the remove-liquidity flow: conditional approve of the LP (pair) token to
 * the Boardwalk LP manager → `removeLiquidity(...)`. Output goes to the caller
 * (the contract uses msg.sender). Caller supplies the min amounts (slippage floor).
 */
export async function buildRemoveLiquiditySteps(
  params: RemoveLiquidityParams,
): Promise<TxStep[]> {
  const {
    client,
    account,
    chainId,
    tokenA,
    tokenB,
    lpToken,
    liquidity,
    amountAMin,
    amountBMin,
  } = params;
  if (liquidity <= BigInt(0))
    throw new Error("Liquidity to remove must be greater than 0");
  const { boardwalkLPManager } = getContracts(chainId);
  const deadline =
    params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1800);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(client, {
    id: "approve-lp",
    label: "Approve LP token",
    token: lpToken,
    owner: account,
    spender: boardwalkLPManager,
    amount: liquidity,
  });
  if (approve) steps.push(approve);

  steps.push({
    id: "remove-liquidity",
    label: "Remove liquidity",
    request: {
      abi: boardwalkLPManagerAbi,
      address: boardwalkLPManager,
      functionName: "removeLiquidity",
      args: [tokenA, tokenB, liquidity, amountAMin, amountBMin, deadline],
    },
  });

  return steps;
}
