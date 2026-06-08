// Ported from token-launcher/hooks/contracts/useCreateLaunch.ts.
import { zeroAddress, type Address, type PublicClient } from "viem";
import { erc721Abi, launchFactoryAbi } from "../registry/abis";
import { getContracts } from "../registry/contracts";
import { buildConditionalApproveStep } from "../flow/erc20";
import { effectiveCost } from "../launch/member-discount";
import {
  buildLaunchConfig,
  type LaunchInput,
} from "../launch/build-launch-config";
import type { LaunchConfig } from "../launch/launch-config";
import type { TxStep } from "../flow/types";

export interface LaunchParams {
  client: PublicClient;
  account: Address;
  chainId: number;
  input: LaunchInput;
}

export interface BuildLaunchResult {
  /** Onchain steps: conditional approve BMX → `createLaunch`. */
  steps: TxStep[];
  /** The encoded `createLaunch` tuple (also useful for the metadata leg). */
  config: LaunchConfig;
  /** Effective BMX burn cost in wei after any member discount. */
  bmxBurnCost: bigint;
}

/**
 * Build the launch flow. Reads the live BMX burn amount, member discount, and
 * NFT collection from the factory at build time (all timelocked but mutable),
 * then emits a conditional BMX approval + `createLaunch(config)`.
 *
 * The off-chain metadata leg (logo upload + EIP-712 signature + POST) is a
 * separate step — see `src/metadata`.
 */
export async function buildLaunchSteps(
  params: LaunchParams,
): Promise<BuildLaunchResult> {
  const { client, account, chainId, input } = params;
  const config = buildLaunchConfig({ ...input, chainId });
  const { launchFactory, bmxToken } = getContracts(chainId);

  const [bmxBurnAmount, discountBps, nftCollection] = await Promise.all([
    client.readContract({
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName: "bmxBurnAmount",
    }),
    client.readContract({
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName: "memberLaunchDiscountBps",
    }),
    client.readContract({
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName: "nftCollection",
    }),
  ]);

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

  const bmxBurnCost = effectiveCost(bmxBurnAmount, discountBps, isMember);

  const steps: TxStep[] = [];
  const approve = await buildConditionalApproveStep(client, {
    id: "approve-bmx",
    label: "Approve BMX",
    token: bmxToken,
    owner: account,
    spender: launchFactory,
    amount: bmxBurnCost,
  });
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

  return { steps, config, bmxBurnCost };
}
