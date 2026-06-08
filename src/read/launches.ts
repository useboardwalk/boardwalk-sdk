// Minimal read client over GET /boardwalk-launches/:token — surfaces only the
// facts the builders/CLI need (presale address, status, path).
import { isAddress, type Address } from "viem";
import { APP_BASE_URL } from "../constants";
import { getContracts } from "../registry/contracts";
import { apiGet } from "./client";
import type { LaunchStatus, LaunchSummary } from "../types";

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

/** Canonical Boardwalk auction/profile URL for a launched token. */
export function getAuctionUrl(token: string, chainId: number): string {
  return `${APP_BASE_URL}/discover/token/auction/${token}?chain=${chainId}`;
}
