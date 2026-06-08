// Ported from token-launcher/hooks/contracts/useContribute.ts.
import { presaleManagerAbi } from "../registry/abis";
import { getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import type { ContributeParams, TxStep } from "../types";

/** Conditional approve raiseToken → presale, then `contribute(amount)`. */
export async function buildContributeSteps(
  params: ContributeParams,
): Promise<TxStep[]> {
  const { client, account, chainId, presale, amount } = params;
  if (amount <= BigInt(0))
    throw new Error("Contribution amount must be greater than 0");
  const raiseToken = params.raiseToken ?? getContracts(chainId).raiseToken;

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(
    client,
    {
      id: "approve-raise-token",
      label: "Approve token",
      token: raiseToken,
      owner: account,
      spender: presale,
      amount,
    },
    params.currentAllowance,
  );
  if (approve) steps.push(approve);

  steps.push({
    id: "contribute",
    label: "Contribute",
    request: {
      abi: presaleManagerAbi,
      address: presale,
      functionName: "contribute",
      args: [amount],
    },
  });

  return steps;
}
