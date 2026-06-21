import { erc20Abi, zeroAddress, type Address } from "viem";
import { boostBurnAbi, erc721Abi } from "../registry/abis";
import { assertDeployed, getContracts } from "../registry/contracts";
import { MULTICALL3_ADDRESS } from "../constants";
import { buildConditionalApproveStep } from "../flow/erc20";
import { effectiveCost } from "../launch/member-discount";
import type { CastVisibilityParams, TxStep } from "../types";

/**
 * Build the visibility flow: conditional approve BMX → `boost(token)` /
 * `deboost(token)`. Reads the live BMX cost, member discount, NFT collection,
 * and BMX allowance in one multicall (plus one `balanceOf` only when an NFT
 * collection is configured) — same pattern as `readLaunchCost`.
 */
export async function buildCastVisibilitySteps(
  params: CastVisibilityParams,
): Promise<TxStep[]> {
  const { client, account, chainId, token, mode } = params;
  const boostBurn = assertDeployed(chainId, "boostBurn");
  const { bmxToken } = getContracts(chainId);

  const [bmxCost, discountBps, nftCollection, allowance] =
    await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        { abi: boostBurnAbi, address: boostBurn, functionName: "bmxCost" },
        {
          abi: boostBurnAbi,
          address: boostBurn,
          functionName: "memberBoostDiscountBps",
        },
        {
          abi: boostBurnAbi,
          address: boostBurn,
          functionName: "nftCollection",
        },
        {
          abi: erc20Abi,
          address: bmxToken,
          functionName: "allowance",
          args: [account, boostBurn],
        },
      ],
    });

  let isMember = false;
  if (nftCollection !== zeroAddress) {
    const balance = await client.readContract({
      abi: erc721Abi,
      address: nftCollection as Address,
      functionName: "balanceOf",
      args: [account],
    });
    isMember = balance > BigInt(0);
  }

  const cost = effectiveCost(bmxCost, discountBps, isMember);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(
    client,
    {
      id: "approve-bmx",
      label: "Approve BMX",
      token: bmxToken,
      owner: account,
      spender: boostBurn,
      amount: cost,
    },
    allowance,
  );
  if (approve) steps.push(approve);

  steps.push({
    id: mode,
    label: mode === "boost" ? "Upvote token" : "Downvote token",
    request: {
      abi: boostBurnAbi,
      address: boostBurn,
      functionName: mode,
      args: [token],
    },
  });

  return steps;
}
