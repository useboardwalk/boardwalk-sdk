// Ported from token-launcher/hooks/contracts/useCreateLaunch.ts and the
// `extractTokenAddress` guard in hooks/useLaunchSubmit.ts.
import {
  decodeEventLog,
  erc20Abi,
  zeroAddress,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { erc721Abi, launchFactoryAbi } from "../registry/abis";
import { getContracts } from "../registry/contracts";
import { MULTICALL3_ADDRESS } from "../constants";
import { buildConditionalApproveStep } from "../flow/erc20";
import { effectiveCost } from "../launch/member-discount";
import { buildLaunchConfig } from "../launch/build-launch-config";
import type {
  BuildLaunchResult,
  LaunchCostBreakdown,
  LaunchParams,
  TxStep,
} from "../types";

/**
 * Read the live BMX burn amount, member discount, NFT collection, AND the BMX
 * allowance in ONE multicall (one round-trip), plus one `balanceOf` only when an
 * NFT collection is configured. Batching the allowance here lets `buildLaunchSteps`
 * skip a separate allowance read — fewer adjacent calls against rate-limited RPCs.
 */
export async function readLaunchCost(
  client: PublicClient,
  account: Address,
  chainId: number,
): Promise<LaunchCostBreakdown> {
  const { launchFactory, bmxToken } = getContracts(chainId);

  const [baseBurn, discountBps, nftCollection, allowance] =
    await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        {
          abi: launchFactoryAbi,
          address: launchFactory,
          functionName: "bmxBurnAmount",
        },
        {
          abi: launchFactoryAbi,
          address: launchFactory,
          functionName: "memberLaunchDiscountBps",
        },
        {
          abi: launchFactoryAbi,
          address: launchFactory,
          functionName: "nftCollection",
        },
        {
          abi: erc20Abi,
          address: bmxToken,
          functionName: "allowance",
          args: [account, launchFactory],
        },
      ],
    });

  let isMember = false;
  if (nftCollection !== zeroAddress) {
    const balance = await client.readContract({
      abi: erc721Abi,
      address: nftCollection,
      functionName: "balanceOf",
      args: [account],
    });
    isMember = balance > BigInt(0);
  }

  return {
    baseBurn,
    discountBps,
    nftCollection,
    isMember,
    bmxBurnCost: effectiveCost(baseBurn, discountBps, isMember),
    allowance,
  };
}

/**
 * Build the launch flow: conditional approve BMX → `createLaunch(config)`.
 * The off-chain metadata leg (logo upload + EIP-712 signature + POST) is a
 * separate step — see `src/metadata` and `resolveLaunchedToken`.
 */
export async function buildLaunchSteps(
  params: LaunchParams,
): Promise<BuildLaunchResult> {
  const { client, account, chainId, input } = params;
  const config = buildLaunchConfig({ ...input, chainId });
  const { launchFactory, bmxToken } = getContracts(chainId);

  const cost = await readLaunchCost(client, account, chainId);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(
    client,
    {
      id: "approve-bmx",
      label: "Approve BMX",
      token: bmxToken,
      owner: account,
      spender: launchFactory,
      amount: cost.bmxBurnCost,
    },
    cost.allowance,
  );
  if (approve) steps.push(approve);

  steps.push({
    id: "create-launch",
    label: "Create launch",
    request: {
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName: "createLaunch",
      args: [config],
    },
  });

  return { steps, config, bmxBurnCost: cost.bmxBurnCost };
}

/**
 * Resolve the launched `token` (and `issuer`) from a confirmed create-launch
 * transaction — so callers never parse event logs by hand. Waits for the
 * receipt, then decodes the factory's `LaunchCreated` event (guarded to the
 * factory address so a topic-compatible event from another contract can't spoof
 * it). Throws if the receipt has no `LaunchCreated` from the factory.
 */
export async function resolveLaunchedToken(
  client: PublicClient,
  txHash: Hash,
  chainId: number,
  options: { timeoutMs?: number } = {},
): Promise<{ token: Address; issuer: Address }> {
  const { launchFactory } = getContracts(chainId);
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    timeout: options.timeoutMs ?? 120_000,
  });

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== launchFactory.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: launchFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "LaunchCreated") {
        const args = decoded.args as unknown as {
          token: Address;
          issuer: Address;
        };
        return { token: args.token, issuer: args.issuer };
      }
    } catch {
      // Not this event — keep scanning.
    }
  }

  throw new Error(
    `No LaunchCreated event found in tx ${txHash} on chain ${chainId}.`,
  );
}
