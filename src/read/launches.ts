// Minimal read client over GET /boardwalk-launches/:token — surfaces only the
// facts the builders/CLI need (presale address, status, path). Also resolves the
// per-launch contract addresses on-chain (the API does not return them all).
import { isAddress, type Address, type PublicClient } from "viem";
import { APP_BASE_URL } from "../constants";
import { getContracts } from "../registry/contracts";
import { launchFactoryAbi } from "../registry/abis";
import { apiGet } from "./client";
import type { LaunchAddresses, LaunchStatus, LaunchSummary } from "../types";

interface LaunchDetailResponse {
  token: string;
  chain_id: string;
  status: LaunchStatus;
  path: "EXPRESS" | "ADVANCED";
  presale_manager: string | null;
  seeded: boolean;
}

/** Fetch the minimal launch facts (presale address, status) for a token. */
export async function getLaunch(
  token: string,
  chainId: number,
  baseUrl?: string,
): Promise<LaunchSummary> {
  if (!isAddress(token))
    throw new Error(`getLaunch: invalid token address "${token}"`);
  const data = await apiGet<LaunchDetailResponse>(
    `/boardwalk-launches/${token}`,
    { chainId },
    baseUrl,
  );
  return {
    token: data.token as Address,
    chainId: Number(data.chain_id),
    status: data.status,
    path: data.path,
    presaleManager: (data.presale_manager as Address | null) ?? null,
    raiseToken: getContracts(chainId).raiseToken,
    seeded: data.seeded,
  };
}

/**
 * Resolve a launch's per-contract addresses on-chain from
 * `LaunchFactory.launches(token)`. Use this to get the `feeDistributor`,
 * `vestingStream`, and `lpStaking` addresses the fee/vesting/LP-staking builders
 * need — the public API only returns `presaleManager`.
 */
export async function getLaunchAddresses(
  client: PublicClient,
  token: Address,
  chainId: number,
): Promise<LaunchAddresses> {
  const { launchFactory } = getContracts(chainId);
  const [
    tokenAddr,
    feeDistributor,
    presaleManager,
    vestingStream,
    lpStaking,
    issuer,
  ] = await client.readContract({
    abi: launchFactoryAbi,
    address: launchFactory,
    functionName: "launches",
    args: [token],
  });
  return {
    token: tokenAddr,
    feeDistributor,
    presaleManager,
    vestingStream,
    lpStaking,
    issuer,
  };
}

/** Canonical Boardwalk auction/profile URL for a launched token. */
export function getAuctionUrl(token: string, chainId: number): string {
  return `${APP_BASE_URL}/discover/token/auction/${token}?chain=${chainId}`;
}
