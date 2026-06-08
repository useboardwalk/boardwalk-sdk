// Minimal read client over GET /boardwalk-launches/:token — surfaces only the
// facts the builders/CLI need (presale address, status, path).
import type { Address } from "viem";
import { getContracts } from "../registry/contracts";
import { apiGet } from "./client";

export type LaunchStatus =
  | "presale"
  | "seeded"
  | "failed"
  | "pending_seed"
  | "unknown";

export interface LaunchSummary {
  token: Address;
  chainId: number;
  status: LaunchStatus;
  path: "EXPRESS" | "ADVANCED";
  /** PresaleManager address; null until the launch is indexed. */
  presaleManager: Address | null;
  /** Per-chain canonical raise token (approve target for contribute). */
  raiseToken: Address;
  seeded: boolean;
}

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
