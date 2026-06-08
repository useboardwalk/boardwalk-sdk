// Ported from token-launcher/lib/api/mutations.ts `postSignedMetadata`, keeping
// the retry-on-404 to ride out indexer lag on a freshly-created launch.
import type { Address, Hex } from "viem";
import { DEFAULT_API_BASE_URL } from "../read/client";
import type { MetadataWireMessage } from "./message";

export interface PostMetadataOptions {
  chainId?: number;
  baseUrl?: string;
  /** Total time to keep retrying on 404 (indexer lag). Default 30_000ms. */
  retryOn404Ms?: number;
}

export interface SubmitMetadataResponse {
  success: boolean;
  message?: string;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * POST a signed metadata payload. The backend verifies `signer == issuer`
 * (EOA via `verifyTypedData` or EIP-1271). Retries on 404 with backoff because
 * a just-created launch may not be indexed yet.
 */
export async function postSignedMetadata(
  token: Address,
  wireMessage: MetadataWireMessage,
  signature: Hex,
  options: PostMetadataOptions = {},
): Promise<SubmitMetadataResponse> {
  const baseUrl = options.baseUrl ?? DEFAULT_API_BASE_URL;
  const giveUpAt = Date.now() + (options.retryOn404Ms ?? 30_000);

  let attempt = 0;
  for (;;) {
    const url = new URL(`/boardwalk-launches/${token}/metadata`, baseUrl);
    if (options.chainId != null)
      url.searchParams.set("chainId", String(options.chainId));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, message: wireMessage }),
    });

    if (res.ok) return res.json() as Promise<SubmitMetadataResponse>;

    if (res.status === 404 && Date.now() < giveUpAt) {
      attempt += 1;
      await sleep(Math.min(2_000, 250 * 2 ** attempt));
      continue;
    }

    const body = await res.text().catch(() => "");
    throw new Error(
      `Metadata POST failed: ${res.status} ${res.statusText} ${body}`,
    );
  }
}
