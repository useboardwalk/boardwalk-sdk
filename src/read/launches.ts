// Minimal read client over GET /boardwalk-launches/:token — surfaces only the
// facts the builders/CLI need (presale address, status, path). Also resolves the
// per-launch contract addresses on-chain (the API does not return them all).
import { isAddress, zeroAddress, type Address, type PublicClient } from "viem";
import { APP_BASE_URL } from "../constants";
import { getContracts } from "../registry/contracts";
import { launchFactoryAbi } from "../registry/abis";
import {
  getAuctionDurationMs,
  getGraduationThresholdWei,
} from "../registry/launch-config";
import { apiGet } from "./client";
import type { LaunchAddresses, LaunchStatus, LaunchSummary } from "../types";

/** Anything past a year is a misconfiguration, not a launch window. */
const MAX_PLAUSIBLE_DURATION_SECONDS = 365 * 24 * 60 * 60;

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
  // An unregistered token returns an all-zero record; fail loudly so callers
  // don't build txs against zero addresses.
  if (tokenAddr === zeroAddress) {
    throw new Error(
      `No Boardwalk launch found for token ${token} on chain ${chainId}`,
    );
  }
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

/**
 * Live graduation threshold for `path` on `chainId`, read from the factory.
 *
 * `graduationExpress` / `graduationAdvanced` are separate timelocked values, so
 * reading them keeps the CLI correct across an admin change without a release.
 * Falls back to the `launch-config` constant if the RPC read fails.
 *
 * This is the threshold a NEW launch would get — an existing launch keeps the
 * value its PresaleManager snapshotted at creation.
 */
export async function fetchGraduationThreshold(
  client: PublicClient,
  chainId: number,
  path: "express" | "advanced",
): Promise<bigint> {
  // Resolve the address first: `getContracts` throws for an unsupported chain,
  // and that must surface rather than be masked as an RPC failure.
  const { launchFactory } = getContracts(chainId);
  try {
    const value = await client.readContract({
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName:
        path === "express" ? "graduationExpress" : "graduationAdvanced",
    });
    if (typeof value === "bigint" && value > BigInt(0)) return value;
  } catch {
    // RPC unreachable or reverted — fall through to the constant.
  }
  return getGraduationThresholdWei(path);
}

/**
 * Live auction window for `path` on `chainId`, in ms, read from the factory.
 *
 * `expressDuration` / `advancedDuration` are separate timelocked values
 * (advanced is admin-tunable between 2 and 14 days), so reading them keeps the
 * CLI correct across an admin change without a release. Falls back to the
 * `launch-config` constant if the RPC read fails.
 *
 * This is the window a NEW launch would get — an existing launch keeps the
 * presale start/end its PresaleManager fixed at creation.
 */
export async function fetchAuctionDuration(
  client: PublicClient,
  chainId: number,
  path: "express" | "advanced",
): Promise<number> {
  const { launchFactory } = getContracts(chainId);
  try {
    const seconds = await client.readContract({
      abi: launchFactoryAbi,
      address: launchFactory,
      functionName: path === "express" ? "expressDuration" : "advancedDuration",
    });
    // `SET_ADVANCED_DURATION` is bounded to 2-14 days but
    // `SET_EXPRESS_DURATION` only requires > 0, so cap before `Number()` —
    // an oversized uint256 would lose precision and poison date math.
    if (
      typeof seconds === "bigint" &&
      seconds > BigInt(0) &&
      seconds <= BigInt(MAX_PLAUSIBLE_DURATION_SECONDS)
    )
      return Number(seconds) * 1000;
  } catch {
    // RPC unreachable or reverted — fall through to the constant.
  }
  return getAuctionDurationMs(path);
}
