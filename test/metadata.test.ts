import { describe, it, expect, vi, afterEach } from "vitest";
import type { Address, Hex } from "viem";
import { buildLaunchMetadataTypedData } from "../src/metadata/message";
import { postSignedMetadata } from "../src/metadata/post";

const TOKEN = "0x1111111111111111111111111111111111111111" as Address;

// ~300-byte ERC-1271 smart-account signature (Base Account `sign` returns
// variable-length wrapped signatures, not 65-byte EOA sigs).
const SMART_ACCOUNT_SIG = ("0x" + "ab".repeat(300)) as Hex;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postSignedMetadata", () => {
  it("forwards a >65-byte smart-account signature byte-identical", async () => {
    const bodies: string[] = [];
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL | string, init?: RequestInit) => {
        urls.push(String(url));
        bodies.push(String(init?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      }),
    );

    const typed = buildLaunchMetadataTypedData(8453, {
      token: TOKEN,
      tosUri: "https://www.useboardwalk.com/tos",
      tosVersion: "1",
      description: "test",
    });

    const res = await postSignedMetadata(
      TOKEN,
      typed.wireMessage,
      SMART_ACCOUNT_SIG,
      { chainId: 8453 },
    );

    expect(res).toEqual({ success: true });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(`/boardwalk-launches/${TOKEN}/metadata`);
    expect(urls[0]).toContain("chainId=8453");

    const sent = JSON.parse(bodies[0]!);
    expect(sent.signature).toBe(SMART_ACCOUNT_SIG);
    expect(sent.signature.length).toBe(2 + 600);
    expect(sent.message.token).toBe(TOKEN);
    expect(sent.message.nonce).toBe(typed.nonce);
    expect(sent.message.deadline).toBe(typed.deadline);
  });
});
