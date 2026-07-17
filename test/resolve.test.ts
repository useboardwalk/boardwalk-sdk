import { describe, it, expect } from "vitest";
import type { Address, PublicClient } from "viem";
import { base } from "viem/chains";
import { resolveLaunchedToken } from "../src/builders/launch";
import { chainContracts } from "../src/registry/contracts";

const HASH = ("0x" + "ab".repeat(32)) as `0x${string}`;

// The registry ships placeholder addresses until the redeployment lands, and
// resolveLaunchedToken asserts the factory is deployed — inject a dummy.
chainContracts[base.id]!.launchFactory =
  "0xaaaa00000000000000000000000000000000aaa1" as Address;

/** A client whose `waitForTransactionReceipt` returns a receipt with `logs`. */
function receiptClient(logs: unknown[]): PublicClient {
  return {
    waitForTransactionReceipt: async () => ({ logs }),
  } as unknown as PublicClient;
}

describe("resolveLaunchedToken", () => {
  it("throws when the receipt has no LaunchCreated log", async () => {
    await expect(
      resolveLaunchedToken(receiptClient([]), HASH, base.id),
    ).rejects.toThrow(/LaunchCreated/);
  });

  it("ignores logs not emitted by the launch factory (anti-spoof guard)", async () => {
    const foreign = {
      address: "0x000000000000000000000000000000000000dEaD",
      data: "0x",
      topics: [],
    };
    await expect(
      resolveLaunchedToken(receiptClient([foreign]), HASH, base.id),
    ).rejects.toThrow(/LaunchCreated/);
  });
});
