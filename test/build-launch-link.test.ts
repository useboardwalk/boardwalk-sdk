import { describe, it, expect } from "vitest";
import type { Address } from "viem";
import { buildLaunchLink } from "../src/launch/build-launch-link";
import { LAUNCH_BASE_URL } from "../src/constants";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;

/** Decode the base64url `prefill` param back to its DTO (proves the -_ mapping). */
function decodePrefill(url: string): {
  path: string | null;
  dto: Record<string, unknown>;
} {
  const u = new URL(url);
  const prefill = u.searchParams.get("prefill")!;
  const b64 = prefill.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(b64, "base64").toString("utf-8");
  return { path: u.searchParams.get("path"), dto: JSON.parse(json) };
}

describe("buildLaunchLink", () => {
  it("round-trips a minimal express link", () => {
    const result = buildLaunchLink({
      name: "Test Token",
      ticker: "TEST",
      category: "meme-culture",
      path: "express",
      chain: "base",
      issuerFeeRecipient: A,
    });
    expect(
      result.url.startsWith(`${LAUNCH_BASE_URL}?path=express&prefill=`),
    ).toBe(true);
    const { path, dto } = decodePrefill(result.url);
    expect(path).toBe("express");
    // Deep-equal also asserts no advanced keys leaked into an express link.
    expect(dto).toEqual({
      v: 1,
      name: "Test Token",
      ticker: "TEST",
      category: "meme-culture",
      chain: "base",
      feeRecipient: A,
    });
    expect(result.prefill).toEqual(dto);
  });

  it("normalizes the ticker and omits empty optional fields", () => {
    const { dto } = decodePrefill(
      buildLaunchLink({
        name: "Lower Case",
        ticker: "low",
        category: "other",
        path: "express",
        chain: "base",
      }).url,
    );
    expect(dto.ticker).toBe("LOW");
    expect("description" in dto).toBe(false);
    expect("socials" in dto).toBe(false);
    expect("feeRecipient" in dto).toBe(false);
  });

  it("carries raw percents (not bps) and advanced fields", () => {
    const { dto } = decodePrefill(
      buildLaunchLink({
        name: "Adv Token",
        ticker: "ADV",
        category: "ai-agents",
        path: "advanced",
        chain: "base",
        presaleSupplyPercent: 40,
        raiseGoalEth: "12",
        referrer: B,
        issuerFee: [
          { label: "individual", address: A, percent: 60 },
          { label: "entity", address: B, percent: 40 },
        ],
        vesting: [{ label: "individual", address: A, percent: 100 }],
        socials: { x: "@boardwalk" },
      }).url,
    );
    expect(dto.presalePercent).toBe(40); // raw percent, not 4000 bps
    expect(dto.raiseGoalEth).toBe("12");
    expect(dto.referrer).toBe(B);
    expect(dto.fees).toEqual([
      { label: "individual", address: A, percent: 60 },
      { label: "entity", address: B, percent: 40 },
    ]);
    expect(dto.vesting).toEqual([
      { label: "individual", address: A, percent: 100 },
    ]);
    expect(dto.socials).toEqual({ x: "boardwalk" }); // leading @ stripped
  });

  it("normalizes a numeric or string chain id to a slug", () => {
    expect(
      decodePrefill(
        buildLaunchLink({
          name: "Test Token",
          ticker: "TEST",
          category: "other",
          path: "express",
          chain: 8453,
        }).url,
      ).dto.chain,
    ).toBe("base");
    expect(
      decodePrefill(
        buildLaunchLink({
          name: "Test Token",
          ticker: "TEST",
          category: "other",
          path: "express",
          chain: "8453",
        }).url,
      ).dto.chain,
    ).toBe("base");
  });

  it("rejects an unsupported chain", () => {
    expect(() =>
      buildLaunchLink({
        name: "Test Token",
        ticker: "TEST",
        category: "other",
        path: "express",
        chain: "solana",
      }),
    ).toThrow(/unsupported chain/i);
  });

  it("rejects an unknown category", () => {
    expect(() =>
      buildLaunchLink({
        name: "Test Token",
        ticker: "TEST",
        category: "not-a-category",
        path: "express",
        chain: "base",
      }),
    ).toThrow(/category/i);
  });

  it("rejects an invalid express fee recipient", () => {
    expect(() =>
      buildLaunchLink({
        name: "Test Token",
        ticker: "TEST",
        category: "other",
        path: "express",
        chain: "base",
        issuerFeeRecipient: "0xnope" as Address,
      }),
    ).toThrow(/address/i);
  });

  it("rejects a raise goal at or below the graduation threshold", () => {
    expect(() =>
      buildLaunchLink({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        chain: "base",
        presaleSupplyPercent: 50,
        issuerFee: [{ label: "individual", address: A, percent: 100 }],
        raiseGoalEth: "10", // Base threshold is 10 wETH; must be strictly greater
      }),
    ).toThrow(/graduation threshold/i);
  });

  it("bubbles up launch-config validation (presale, vesting, name)", () => {
    expect(() =>
      buildLaunchLink({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        chain: "base",
        presaleSupplyPercent: 33,
        vesting: [{ label: "individual", address: A, percent: 100 }],
        issuerFee: [{ label: "individual", address: A, percent: 100 }],
      }),
    ).toThrow(/presaleSupplyPercent/i);

    expect(() =>
      buildLaunchLink({
        name: "Adv Token",
        ticker: "ADV",
        category: "other",
        path: "advanced",
        chain: "base",
        presaleSupplyPercent: 40,
        issuerFee: [{ label: "individual", address: A, percent: 100 }],
      }),
    ).toThrow(/vesting/i);

    expect(() =>
      buildLaunchLink({
        name: "Boardwalk Official",
        ticker: "ABCD",
        category: "other",
        path: "express",
        chain: "base",
      }),
    ).toThrow(/name/i);
  });

  it("validates soft metadata the form would otherwise drop", () => {
    const base = {
      name: "Test Token",
      ticker: "TEST",
      category: "other",
      path: "express" as const,
      chain: "base" as const,
    };
    // description must be 120-800 chars, video must be YouTube/TikTok
    expect(() => buildLaunchLink({ ...base, description: "too short" })).toThrow(
      /120 characters/i,
    );
    expect(() =>
      buildLaunchLink({ ...base, video: "https://vimeo.com/12345" }),
    ).toThrow(/youtube or tiktok/i);
    // a valid description + YouTube video round-trip verbatim
    const desc = "A community token for builders. ".repeat(5).trim();
    const { dto } = decodePrefill(
      buildLaunchLink({
        ...base,
        description: desc,
        video: "https://youtu.be/dQw4w9WgXcQ",
      }).url,
    );
    expect(dto.description).toBe(desc);
    expect(dto.video).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("normalizes socials handles (strips @, extracts the discord invite code)", () => {
    const { dto } = decodePrefill(
      buildLaunchLink({
        name: "Test Token",
        ticker: "TEST",
        category: "other",
        path: "express",
        chain: "base",
        socials: {
          x: "@alice",
          telegram: "@bob",
          discord: "https://discord.gg/My-Server",
          youtube: "https://youtube.com/@chan",
        },
      }).url,
    );
    expect(dto.socials).toEqual({
      x: "alice",
      telegram: "bob",
      discord: "My-Server",
      youtube: "https://youtube.com/@chan",
    });
  });

  it("base64url-encodes payloads whose standard base64 contains + or /", () => {
    // Multi-byte chars make the UTF-8 base64 contain + and /; the URL-safe
    // output must carry none of +, /, or =, and must still round-trip.
    const desc = "ÿ".repeat(130);
    const result = buildLaunchLink({
      name: "Test Token",
      ticker: "TEST",
      category: "other",
      path: "express",
      chain: "base",
      description: desc,
    });
    const prefillParam = new URL(result.url).searchParams.get("prefill")!;
    expect(prefillParam).not.toMatch(/[+/=]/);
    expect(decodePrefill(result.url).dto.description).toBe(desc);
  });
});
