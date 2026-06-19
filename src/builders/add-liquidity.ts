// Ported from token-launcher/hooks/contracts/useAddLiquidity.ts.
import { erc20Abi } from "viem";
import { boardwalkLPManagerAbi } from "../registry/abis";
import { getContracts } from "../registry/contracts";
import { MULTICALL3_ADDRESS } from "../constants";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { AddLiquidityParams, TxStep } from "../types";

/**
 * Build the add-liquidity flow: conditional approve of BOTH tokens to the
 * Boardwalk LP manager → `addLiquidity(...)`. Both allowances are read in one
 * multicall to save a round-trip. `to` is the caller. Caller supplies the min
 * amounts (slippage floor).
 */
export async function buildAddLiquiditySteps(
  params: AddLiquidityParams,
): Promise<TxStep[]> {
  const {
    client,
    account,
    chainId,
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
  } = params;
  if (amountADesired <= BigInt(0) || amountBDesired <= BigInt(0))
    throw new Error("Both desired amounts must be greater than 0");
  const { boardwalkLPManager } = getContracts(chainId);
  const deadline =
    params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 1800);

  const [allowanceA, allowanceB] = await client.multicall({
    allowFailure: false,
    multicallAddress: MULTICALL3_ADDRESS,
    contracts: [
      {
        abi: erc20Abi,
        address: tokenA,
        functionName: "allowance",
        args: [account, boardwalkLPManager],
      },
      {
        abi: erc20Abi,
        address: tokenB,
        functionName: "allowance",
        args: [account, boardwalkLPManager],
      },
    ],
  });

  const steps: TxStep[] = [];
  const approveA = await buildConditionalApproveStep(
    client,
    {
      id: "approve-token-a",
      label: "Approve token A",
      token: tokenA,
      owner: account,
      spender: boardwalkLPManager,
      amount: amountADesired,
    },
    allowanceA,
  );
  if (approveA) steps.push(approveA);
  const approveB = await buildConditionalApproveStep(
    client,
    {
      id: "approve-token-b",
      label: "Approve token B",
      token: tokenB,
      owner: account,
      spender: boardwalkLPManager,
      amount: amountBDesired,
    },
    allowanceB,
  );
  if (approveB) steps.push(approveB);

  steps.push({
    id: "add-liquidity",
    label: "Add liquidity",
    request: {
      abi: boardwalkLPManagerAbi,
      address: boardwalkLPManager,
      functionName: "addLiquidity",
      args: [
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        account,
        deadline,
      ],
    },
  });

  return steps;
}
