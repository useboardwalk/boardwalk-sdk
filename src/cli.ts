#!/usr/bin/env node
// boardwalk CLI — prints UNSIGNED calldata as JSON. Never accepts private keys;
// the agent's wallet signs + submits (e.g. Base MCP `send_calls`).
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import {
  createPublicClient,
  http,
  parseUnits,
  isAddress,
  zeroAddress,
  erc20Abi,
  type Address,
  type PublicClient,
} from "viem";

import { SUPPORTED_CHAINS, toNumericChainId } from "./registry/chains";
import { getContracts } from "./registry/contracts";
import { launchFactoryAbi, erc721Abi } from "./registry/abis";
import { effectiveCost } from "./launch/member-discount";
import type { LaunchConfig } from "./launch/launch-config";
import { buildLaunchSteps } from "./builders/launch";
import { buildContributeSteps } from "./builders/contribute";
import { buildClaimSteps } from "./builders/claim";
import { buildStakeBmxSteps } from "./builders/stake-bmx";
import { buildVoteSteps, type VoteOption } from "./builders/vote";
import { encodeSteps, type EncodeOptions } from "./flow/encode";
import type { TxStep } from "./flow/types";
import { getLaunch } from "./read/launches";
import { buildLaunchMetadataTypedData } from "./metadata/message";
import { uploadLogo } from "./metadata/upload";
import { postSignedMetadata } from "./metadata/post";
import type { MetadataWireMessage } from "./metadata/message";

const DEFAULT_TOS_URI = "https://www.useboardwalk.com/docs/terms";
const DEFAULT_TOS_VERSION = "1";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
};

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function requireAddress(value: string | undefined, name: string): Address {
  if (!value || !isAddress(value)) fail(`--${name} must be a valid address`);
  return value as Address;
}

function chainIdOf(input: string): number {
  const numeric = /^\d+$/.test(input) ? Number(input) : toNumericChainId(input);
  const entry = SUPPORTED_CHAINS.find((c) => c.numericId === numeric);
  if (!entry) {
    fail(
      `unsupported chain "${input}". Supported: ${SUPPORTED_CHAINS.map((c) => c.slug).join(", ")}`,
    );
  }
  return entry.numericId;
}

function makeClient(
  chainInput: string,
  rpc?: string,
): { client: PublicClient; chainId: number } {
  const chainId = chainIdOf(chainInput);
  const entry = SUPPORTED_CHAINS.find((c) => c.numericId === chainId)!;
  const client = createPublicClient({
    chain: entry.chain,
    transport: http(rpc),
  }) as unknown as PublicClient;
  return { client, chainId };
}

function print(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function emitCalls(
  steps: TxStep[],
  chainId: number,
  builderCode: string | undefined,
  meta: Record<string, unknown> = {},
): void {
  const options: EncodeOptions = {};
  if (builderCode !== undefined) options.builderCode = builderCode;
  const calls = encodeSteps(steps, chainId, options);
  print({ calls, ...meta });
}

function serializeConfig(config: LaunchConfig) {
  return {
    ...config,
    presalePercent: config.presalePercent.toString(),
    vestingPercents: config.vestingPercents.map(String),
    issuerFeeSplits: config.issuerFeeSplits.map(String),
  };
}

const stripAt = (handle: string) => handle.replace(/^@/, "");

const program = new Command();
program
  .name("boardwalk")
  .description(
    "Build unsigned Boardwalk transactions for an agent to sign + submit.",
  )
  .version("0.1.0");

program
  .command("launch")
  .description(
    "Build the launch flow (approve BMX → createLaunch). Run launch-metadata after it confirms.",
  )
  .requiredOption("--chain <chain>", "chain slug or id")
  .requiredOption(
    "--wallet <address>",
    "issuer wallet address (BYO; never a private key)",
  )
  .requiredOption("--name <name>", "token name")
  .requiredOption("--ticker <ticker>", "token ticker")
  .requiredOption(
    "--category <category>",
    "category slug (e.g. meme-culture, ai-agents)",
  )
  .option("--path <path>", "express | advanced", "express")
  .option("--description <text>", "token description")
  .option("--issuer-fee <address>", "issuer fee recipient (express path)")
  .option("--presale-percent <n>", "presale supply percent (advanced path)")
  .option("--referrer <address>", "referrer address (advanced path)")
  .option("--builder-code <code>", "ERC-8021 builder code override")
  .option("--rpc <url>", "RPC override")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const result = await buildLaunchSteps({
      client,
      account,
      chainId,
      input: {
        name: opts.name,
        ticker: opts.ticker,
        category: opts.category,
        description: opts.description,
        path: opts.path,
        issuerFeeRecipient: opts.issuerFee,
        presaleSupplyPercent:
          opts.presalePercent != null ? Number(opts.presalePercent) : undefined,
        referrer: opts.referrer,
      },
    });
    emitCalls(result.steps, chainId, opts.builderCode, {
      action: "launch",
      bmxBurnCost: result.bmxBurnCost.toString(),
      config: serializeConfig(result.config),
      note: "After create-launch confirms, read the token from the LaunchCreated log, then run `boardwalk launch-metadata`.",
    });
  });

program
  .command("contribute")
  .description("Build approve + contribute for an active presale.")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption(
    "--amount <amount>",
    "amount in human units of the raise token",
  )
  .requiredOption("--chain <chain>", "chain slug or id")
  .requiredOption("--wallet <address>", "contributor wallet address")
  .option("--builder-code <code>", "ERC-8021 builder code override")
  .option("--rpc <url>", "RPC override")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const token = requireAddress(opts.token, "token");
    const launch = await getLaunch(token, chainId);
    if (launch.status !== "presale") {
      fail(
        `auction is not in presale (status: ${launch.status}); cannot contribute`,
      );
    }
    if (!launch.presaleManager) {
      fail("presale manager not indexed yet for this token; retry shortly");
    }
    const decimals = await client.readContract({
      abi: erc20Abi,
      address: launch.raiseToken,
      functionName: "decimals",
    });
    const amount = parseUnits(opts.amount, decimals);
    const steps = await buildContributeSteps({
      client,
      account,
      chainId,
      presale: launch.presaleManager,
      amount,
    });
    emitCalls(steps, chainId, opts.builderCode, {
      action: "contribute",
      token,
      amount: amount.toString(),
      raiseToken: launch.raiseToken,
    });
  });

program
  .command("claim")
  .description("Build claimTokens for a successful (seeded) auction.")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or id")
  .requiredOption("--wallet <address>", "contributor wallet address")
  .option("--builder-code <code>", "ERC-8021 builder code override")
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const launch = await getLaunch(token, chainId);
    if (launch.status !== "seeded" && launch.status !== "pending_seed") {
      fail(
        `tokens are claimable only after the auction succeeds (status: ${launch.status})`,
      );
    }
    if (!launch.presaleManager)
      fail("presale manager not indexed yet for this token");
    const steps = buildClaimSteps({ presale: launch.presaleManager });
    emitCalls(steps, chainId, opts.builderCode, { action: "claim", token });
  });

program
  .command("stake-bmx")
  .description("Build approve + stakeBmx (Base-only).")
  .requiredOption("--amount <amount>", "BMX amount in human units")
  .requiredOption("--wallet <address>", "staker wallet address")
  .option("--chain <chain>", "chain slug or id", "base")
  .option("--builder-code <code>", "ERC-8021 builder code override")
  .option("--rpc <url>", "RPC override")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const amount = parseUnits(opts.amount, 18); // BMX is 18 decimals
    const steps = await buildStakeBmxSteps({
      client,
      account,
      chainId,
      amount,
    });
    emitCalls(steps, chainId, opts.builderCode, {
      action: "stake-bmx",
      amount: amount.toString(),
    });
  });

program
  .command("vote")
  .description(
    "Build a governance vote (Base-only). 1=Treasury 2=BuyBurnBMX 3=BuyBurnLP 4=Participation.",
  )
  .requiredOption("--option <1-4>", "vote option")
  .requiredOption("--wallet <address>", "voter wallet address")
  .option("--chain <chain>", "chain slug or id", "base")
  .option("--builder-code <code>", "ERC-8021 builder code override")
  .option("--rpc <url>", "RPC override")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const option = Number(opts.option) as VoteOption;
    const steps = await buildVoteSteps({ client, account, chainId, option });
    emitCalls(steps, chainId, opts.builderCode, { action: "vote", option });
  });

program
  .command("launch-cost")
  .description(
    "Read the effective BMX burn cost to launch (after any member discount).",
  )
  .requiredOption("--chain <chain>", "chain slug or id")
  .requiredOption("--wallet <address>", "issuer wallet address")
  .option("--rpc <url>", "RPC override")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const { launchFactory } = getContracts(chainId);
    const [baseBurn, discountBps, nftCollection] = await Promise.all([
      client.readContract({
        abi: launchFactoryAbi,
        address: launchFactory,
        functionName: "bmxBurnAmount",
      }),
      client.readContract({
        abi: launchFactoryAbi,
        address: launchFactory,
        functionName: "memberLaunchDiscountBps",
      }),
      client.readContract({
        abi: launchFactoryAbi,
        address: launchFactory,
        functionName: "nftCollection",
      }),
    ]);
    let isMember = false;
    if (nftCollection !== zeroAddress) {
      const balance = await client.readContract({
        abi: erc721Abi,
        address: nftCollection,
        functionName: "balanceOf",
        args: [account],
      });
      isMember = balance > BigInt(0);
    }
    print({
      chainId,
      baseBurn: baseBurn.toString(),
      discountBps: discountBps.toString(),
      isMember,
      bmxBurnCost: effectiveCost(baseBurn, discountBps, isMember).toString(),
    });
  });

program
  .command("status")
  .description("Read a launch's status + presale address.")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or id")
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    print(await getLaunch(token, chainId));
  });

program
  .command("launch-metadata")
  .description(
    "Upload the logo + build the EIP-712 metadata payload to sign, then run submit-metadata.",
  )
  .requiredOption(
    "--token <address>",
    "launch token address (from the LaunchCreated log)",
  )
  .requiredOption("--chain <chain>", "chain slug or id")
  .option("--logo <file>", "path to a logo image (uploaded to the CDN)")
  .option("--logo-data <dataurl>", "data: URL of a logo (uploaded to the CDN)")
  .option("--logo-url <url>", "already-hosted logo URL (used as-is)")
  .option("--twitter <handle>", "X/Twitter handle")
  .option("--discord <invite>", "Discord invite code")
  .option("--telegram <handle>", "Telegram handle")
  .option("--homepage <url>", "homepage URL")
  .option("--video <url>", "video URL")
  .option(
    "--description <text>",
    "description (mirrors the onchain description)",
  )
  .option(
    "--raise-goal <amount>",
    "raise goal in raise-token units (advanced; visual only)",
  )
  .option("--tos-uri <uri>", "Terms of Service URI", DEFAULT_TOS_URI)
  .option("--tos-version <v>", "Terms of Service version", DEFAULT_TOS_VERSION)
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");

    let logoUrl: string | undefined = opts.logoUrl;
    if (!logoUrl && opts.logo) {
      const bytes = await readFile(opts.logo);
      const ext = (opts.logo.split(".").pop() ?? "").toLowerCase();
      const mime = MIME_BY_EXT[ext];
      if (!mime) fail(`unsupported logo extension ".${ext}"`);
      logoUrl = (
        await uploadLogo(new Uint8Array(bytes), {
          mime,
          filename: `logo.${ext}`,
        })
      ).url;
    } else if (!logoUrl && opts.logoData) {
      logoUrl = (await uploadLogo(opts.logoData)).url;
    }

    const raiseGoalWei = opts.raiseGoal
      ? parseUnits(opts.raiseGoal, 18).toString()
      : "0";
    const typed = buildLaunchMetadataTypedData(chainId, {
      token,
      logoUrl: logoUrl ?? "",
      twitterUrl: opts.twitter ? `https://x.com/${stripAt(opts.twitter)}` : "",
      discordUrl: opts.discord ? `https://discord.gg/${opts.discord}` : "",
      telegramUrl: opts.telegram
        ? `https://t.me/${stripAt(opts.telegram)}`
        : "",
      homepageUrl: opts.homepage ?? "",
      videoUrl: opts.video ?? "",
      description: opts.description ?? "",
      tosUri: opts.tosUri,
      tosVersion: opts.tosVersion,
      raiseGoalWei,
    });

    print({
      action: "launch-metadata",
      sign: {
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.wireMessage,
      },
      submit: {
        method: "POST",
        path: `/boardwalk-launches/${token}/metadata?chainId=${chainId}`,
        body: { signature: "<eip712-signature>", message: typed.wireMessage },
      },
      note: "Sign `sign` (EIP-712 typed data) with the issuer wallet, then run `boardwalk submit-metadata` with the signature.",
    });
  });

program
  .command("submit-metadata")
  .description("POST a signed metadata payload (retries through indexer lag).")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or id")
  .requiredOption(
    "--signature <hex>",
    "EIP-712 signature from the issuer wallet",
  )
  .requiredOption(
    "--message <json>",
    "the wireMessage JSON emitted by launch-metadata",
  )
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    const wireMessage = JSON.parse(opts.message) as MetadataWireMessage;
    const result = await postSignedMetadata(
      token,
      wireMessage,
      opts.signature,
      { chainId },
    );
    print({ action: "submit-metadata", result });
  });

program.parseAsync().catch((e) => fail(errMsg(e)));
