// POST the signed metadata, with retry-on-404 to ride out indexer lag on a
// freshly-created launch.
import { isAddress, type Address, type Hex } from "viem";
import { API_BASE_URL, RETRY_DELAYS_MS } from "../constants";
import type {
  MetadataWireMessage,
  PostMetadataOptions,
  SubmitMetadataResponse,
} from "../types";

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
  if (!isAddress(token)) {
    throw new Error(`postSignedMetadata: invalid token address "${token}"`);
  }
  const baseUrl = options.baseUrl ?? API_BASE_URL;
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
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
      attempt += 1;
      await sleep(delay);
      continue;
    }

    const body = await res.text().catch(() => "");
    throw new Error(
      `Metadata POST failed: ${res.status} ${res.statusText} ${body}`,
    );
  }
}
