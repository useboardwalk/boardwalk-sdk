import { describe, it, expect, vi, afterEach } from "vitest";
import {
  BaseError,
  ContractFunctionExecutionError,
  HttpRequestError,
  erc20Abi,
} from "viem";
import { formatCliError } from "../src/cli-error";

// Stand-in for the Cloudflare 429 page eth.merkle.io returns when rate-limited.
const CLOUDFLARE_HTML = `<!DOCTYPE html><html><head><title>Too Many Requests</title></head><body>${"x".repeat(4000)}</body></html>`;

const http429 = () =>
  new HttpRequestError({
    url: "https://eth.merkle.io",
    status: 429,
    details: CLOUDFLARE_HTML,
    body: { method: "eth_call", params: [] },
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatCliError", () => {
  it("collapses a rate-limited HTTP error to one short line with an --rpc hint", () => {
    const e = http429();
    expect(e.message.length).toBeGreaterThan(4000); // the noise being trimmed
    const out = formatCliError(e);
    expect(out).toContain("HTTP request failed.");
    expect(out).toContain("--rpc");
    expect(out).not.toContain("<!DOCTYPE");
    expect(out.length).toBeLessThan(250);
  });

  it("detects a 429 nested under ContractFunctionExecutionError (multicall reads)", () => {
    const e = new ContractFunctionExecutionError(http429(), {
      abi: erc20Abi,
      functionName: "allowance",
      args: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
    });
    const out = formatCliError(e);
    expect(out).toContain("--rpc");
    expect(out).not.toContain("<!DOCTYPE");
  });

  it("flags JSON-RPC 'over rate limit' details without an HTTP 429", () => {
    const e = new BaseError("HTTP request failed.", {
      details: "over rate limit",
    });
    expect(formatCliError(e)).toContain("--rpc");
  });

  it("shows the short message without an --rpc hint for other viem errors", () => {
    const e = new BaseError("Execution reverted.", {
      details: "execution reverted: CliffNotEnded",
    });
    const out = formatCliError(e);
    expect(out).toContain("Execution reverted.");
    expect(out).toContain("BOARDWALK_DEBUG");
    expect(out).not.toContain("--rpc");
  });

  it("keeps non-viem errors verbatim", () => {
    expect(formatCliError(new Error("plain failure"))).toBe("plain failure");
    expect(formatCliError("string failure")).toBe("string failure");
  });

  it("returns the full error when BOARDWALK_DEBUG is set", () => {
    vi.stubEnv("BOARDWALK_DEBUG", "1");
    expect(formatCliError(http429())).toContain("<!DOCTYPE");
  });
});
