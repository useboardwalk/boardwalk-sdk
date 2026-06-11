#!/usr/bin/env node
// boardwalk CLI — prints UNSIGNED calldata as JSON. Never accepts private keys;
// the agent's wallet signs + submits (e.g. Base MCP `send_calls`). Boardwalk's
// ERC-8021 builder code is enforced on every built transaction.
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  erc20Abi,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";

import {
  MIME_BY_EXT,
  TOS_URI,
  TOS_VERSION,
  DEFAULT_RPC_BY_CHAIN,
  MULTICALL3_ADDRESS,
} from "./constants";
import { formatCliError } from "./cli-error";
import { SUPPORTED_CHAINS, toNumericChainId } from "./registry/chains";
import { getLaunchConfig } from "./registry/launch-config";
import {
  buildLaunchSteps,
  readLaunchCost,
  resolveLaunchedToken,
} from "./builders/launch";
import { buildContributeSteps } from "./builders/contribute";
import { buildClaimSteps } from "./builders/claim";
import { buildStakeBmxSteps } from "./builders/stake-bmx";
import { buildVoteSteps } from "./builders/vote";
import { buildLaunchLink } from "./launch/build-launch-link";
import { presaleManagerAbi } from "./registry/abis";
import { encodeSteps } from "./flow/encode";
import { getAuctionUrl, getLaunch } from "./read/launches";
import { buildLaunchMetadataTypedData } from "./metadata/message";
import { uploadLogo } from "./metadata/upload";
import { postSignedMetadata } from "./metadata/post";
import type {
  FeeRecipientInput,
  LaunchConfig,
  MetadataWireMessage,
  TxStep,
  VoteOption,
} from "./types";

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function requireAddress(value: string | undefined, name: string): Address {
  if (!value || !isAddress(value)) fail(`--${name} must be a valid address`);
  return value as Address;
}

function requireTxHash(value: string | undefined): Hash {
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    fail("--tx must be a 0x-prefixed 32-byte transaction hash");
  }
  return value as Hash;
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
    transport: http(rpc ?? DEFAULT_RPC_BY_CHAIN[chainId]),
  }) as unknown as PublicClient;
  return { client, chainId };
}

function print(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function emitCalls(
  steps: TxStep[],
  chainId: number,
  meta: Record<string, unknown> = {},
): void {
  print({ calls: encodeSteps(steps, chainId), ...meta });
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

/** Commander collector for repeatable `--fee`/`--vesting <label>:<address>:<percent>`. */
function collectRecipient(
  value: string,
  prev: FeeRecipientInput[],
): FeeRecipientInput[] {
  const parts = value.split(":");
  const label = (parts[0] ?? "").trim();
  const address = (parts[1] ?? "").trim();
  const percent = Number(parts[2]);
  if (
    !label ||
    !isAddress(address) ||
    !Number.isFinite(percent) ||
    percent <= 0
  ) {
    fail(
      `invalid recipient "${value}" — expected <label>:<address>:<percent> (e.g. individual:0xAbc…:40)`,
    );
  }
  return [...prev, { label, address: address as Address, percent }];
}

const program = new Command();
program
  .name("boardwalk")
  .description(
    "Build UNSIGNED Boardwalk transactions for an agent to sign + submit.\n" +
      "Every tx command prints { calls: [{to,data,value,chainId}], ...meta }; submit\n" +
      "the ordered `calls` array with your own wallet (e.g. Base MCP send_calls).\n" +
      "Boardwalk's ERC-8021 builder code is enforced on every built transaction.",
  )
  .version("0.2.0")
  .showHelpAfterError("(run `boardwalk <command> --help` for usage)");

program
  .command("launch")
  .summary("Build a token launch (approve BMX + createLaunch)")
  .description(
    "Build the launch flow (approve BMX → createLaunch). Then run launch-metadata with the tx hash.",
  )
  .requiredOption(
    "--chain <chain>",
    "chain slug (base|ethereum|fraxtal|katana|ink) or numeric id",
  )
  .requiredOption(
    "--wallet <address>",
    "issuer wallet address (BYO; never a private key)",
  )
  .requiredOption("--name <name>", "token name (3–32 chars)")
  .requiredOption("--ticker <ticker>", "token ticker (2–10 chars, A–Z 0–9)")
  .requiredOption(
    "--category <category>",
    "category slug (e.g. meme-culture, ai-agents, gaming)",
  )
  .option(
    "--path <path>",
    "launch path: express (24h) | advanced (7d)",
    "express",
  )
  .option(
    "--description <text>",
    "token description (defaults to Boardwalk boilerplate)",
  )
  .option(
    "--issuer-fee <address>",
    "issuer fee recipient (REQUIRED on the express path; receives 100%)",
  )
  .option(
    "--fee <spec>",
    "advanced issuer-fee recipient as <label>:<address>:<percent>, repeatable (labels: individual|entity|publicGood|growthTeam)",
    collectRecipient,
    [] as FeeRecipientInput[],
  )
  .option(
    "--vesting <spec>",
    "advanced vesting recipient as <label>:<address>:<percent>, repeatable; required when --presale-percent < 50, not allowed at 50 (labels: individual|entity|referrer|publicGood|growthTeam)",
    collectRecipient,
    [] as FeeRecipientInput[],
  )
  .option(
    "--presale-percent <n>",
    "presale supply percent (advanced path; 25–50 in steps of 5; default 50)",
  )
  .option("--referrer <address>", "referrer address (advanced path)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
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
        issuerFee: opts.fee.length ? opts.fee : undefined,
        vesting: opts.vesting.length ? opts.vesting : undefined,
        presaleSupplyPercent:
          opts.presalePercent != null ? Number(opts.presalePercent) : undefined,
        referrer: opts.referrer,
      },
    });
    const grad = getLaunchConfig(chainId);
    const advanced = opts.path === "advanced";
    emitCalls(result.steps, chainId, {
      action: "launch",
      bmxBurnCost: result.bmxBurnCost.toString(),
      config: serializeConfig(result.config),
      graduationThreshold: {
        wei: grad.graduationThresholdWei.toString(),
        display: `${formatUnits(grad.graduationThresholdWei, 18)} ${grad.raiseTokenSymbol}`,
      },
      next: {
        note:
          "Submit `calls` (batched: approve + createLaunch). After the create-launch tx confirms, finalize metadata — the token is resolved from the tx automatically." +
          (advanced
            ? " Advanced launches must set --raise-goal greater than the graduation threshold above."
            : ""),
        command: `boardwalk launch-metadata --tx <create-launch tx hash> --chain ${opts.chain} [--logo <file>] [--twitter <handle>]${advanced ? " --raise-goal <amount>" : ""}`,
      },
    });
  });

program
  .command("launch-link")
  .summary("Generate a prefilled /launch link (no wallet/RPC; logo added in the UI)")
  .description(
    "Build a prefilled `/launch?path=…&prefill=…` URL the user opens to review and sign in the UI. " +
      "Pure URL generation — no wallet, no RPC, no signing. Use this on shell-less surfaces (plain chat) " +
      "where the CLI can't run. The logo is added in the UI (a URL can't carry an image); homepage and any " +
      "metadata beyond the launch form are set later via launch-metadata.",
  )
  .requiredOption(
    "--chain <chain>",
    "chain slug (base|ethereum|fraxtal|katana|ink) or numeric id",
  )
  .requiredOption("--name <name>", "token name (3–32 chars)")
  .requiredOption("--ticker <ticker>", "token ticker (2–10 chars, A–Z 0–9)")
  .requiredOption(
    "--category <category>",
    "launch category slug (e.g. meme-culture, ai-agents, gaming)",
  )
  .option(
    "--path <path>",
    "launch path: express (24h) | advanced (7d)",
    "express",
  )
  .option("--description <text>", "token description")
  .option(
    "--issuer-fee <address>",
    "issuer fee recipient (express path: receives 100%)",
  )
  .option(
    "--fee <spec>",
    "advanced issuer-fee recipient as <label>:<address>:<percent>, repeatable (labels: individual|entity|publicGood|growthTeam)",
    collectRecipient,
    [] as FeeRecipientInput[],
  )
  .option(
    "--vesting <spec>",
    "advanced vesting recipient as <label>:<address>:<percent>, repeatable (labels: individual|entity|referrer|publicGood|growthTeam)",
    collectRecipient,
    [] as FeeRecipientInput[],
  )
  .option(
    "--presale-percent <n>",
    "presale supply percent (advanced path; 25–50 in steps of 5; default 50)",
  )
  .option("--referrer <address>", "referrer address (advanced path)")
  .option(
    "--raise-goal <amount>",
    "advanced raise goal in raise-token units (must exceed the graduation threshold)",
  )
  .option("--x, --twitter <handle>", "X/Twitter handle (either flag)")
  .option("--discord <invite>", "Discord invite code")
  .option("--telegram <handle>", "Telegram handle")
  .option("--youtube <url>", "YouTube channel URL")
  .option("--video <url>", "launch video URL (YouTube or TikTok)")
  .action((opts) => {
    const chainId = chainIdOf(opts.chain);
    const result = buildLaunchLink({
      name: opts.name,
      ticker: opts.ticker,
      category: opts.category,
      description: opts.description,
      path: opts.path,
      chain: chainId,
      issuerFeeRecipient: opts.issuerFee,
      issuerFee: opts.fee.length ? opts.fee : undefined,
      vesting: opts.vesting.length ? opts.vesting : undefined,
      presaleSupplyPercent:
        opts.presalePercent != null ? Number(opts.presalePercent) : undefined,
      referrer: opts.referrer,
      raiseGoalEth: opts.raiseGoal,
      video: opts.video,
      socials: {
        x: opts.twitter,
        youtube: opts.youtube,
        telegram: opts.telegram,
        discord: opts.discord,
      },
    });
    print({
      action: "launch-link",
      url: result.url,
      path: result.path,
      prefill: result.prefill,
      next: {
        note: "Open `url` to land on the launch summary with everything prefilled. Add the logo in the UI, then connect a wallet and sign — nothing here signs or sends.",
      },
    });
  });

program
  .command("contribute")
  .summary("Join a presale (approve raise token + contribute)")
  .description(
    "Build approve + contribute for an active presale (status must be `presale`).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption(
    "--amount <amount>",
    "amount in human units of the raise token (e.g. 0.01)",
  )
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "contributor wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
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
    // One multicall for decimals + allowance (both on the raise token) instead
    // of two sequential reads — fewer adjacent calls against rate-limited RPCs.
    const [decimals, currentAllowance] = await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        { abi: erc20Abi, address: launch.raiseToken, functionName: "decimals" },
        {
          abi: erc20Abi,
          address: launch.raiseToken,
          functionName: "allowance",
          args: [account, launch.presaleManager],
        },
      ],
    });
    const amount = parseUnits(opts.amount, decimals);
    const steps = await buildContributeSteps({
      client,
      account,
      chainId,
      presale: launch.presaleManager,
      amount,
      currentAllowance,
    });
    emitCalls(steps, chainId, {
      action: "contribute",
      token,
      amount: amount.toString(),
      raiseToken: launch.raiseToken,
    });
  });

program
  .command("claim")
  .summary("Claim presale tokens after a successful auction")
  .description(
    "Build claimTokens for a seeded auction whose 7-day post-seed cliff has ended.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "contributor wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const launch = await getLaunch(token, chainId);
    if (launch.status !== "seeded") {
      fail(
        `tokens are claimable only after liquidity is seeded (status: ${launch.status})`,
      );
    }
    if (!launch.presaleManager)
      fail("presale manager not indexed yet for this token");
    // Enforce the post-seed cliff: claimTokens() reverts (CliffNotEnded) until
    // cliffEnd, so read it and refuse to emit a guaranteed-revert tx.
    const cliffEnd = await client.readContract({
      abi: presaleManagerAbi,
      address: launch.presaleManager,
      functionName: "cliffEnd",
    });
    const now = Math.floor(Date.now() / 1000);
    if (Number(cliffEnd) > now) {
      fail(
        `tokens are locked until the post-seed cliff ends at ${new Date(Number(cliffEnd) * 1000).toISOString()} (cliffEnd=${cliffEnd}); claim after that`,
      );
    }
    emitCalls(buildClaimSteps({ presale: launch.presaleManager }), chainId, {
      action: "claim",
      token,
      cliffEnd: cliffEnd.toString(),
    });
  });

program
  .command("stake-bmx")
  .summary("Stake BMX (Base-only)")
  .description(
    "Build approve + stakeBmx. Base-only — errors clearly on other chains.",
  )
  .requiredOption("--amount <amount>", "BMX amount in human units (e.g. 100)")
  .requiredOption("--wallet <address>", "staker wallet address")
  .option("--chain <chain>", "chain slug or numeric id", "base")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
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
    emitCalls(steps, chainId, {
      action: "stake-bmx",
      amount: amount.toString(),
    });
  });

program
  .command("vote")
  .summary("Vote on fee direction (Base-only)")
  .description(
    "Build a governance vote (Base-only). Options: 1=Treasury 2=Buy&BurnBMX 3=Buy&BurnLP 4=Participation.",
  )
  .requiredOption("--option <1-4>", "vote option (1–4)")
  .requiredOption("--wallet <address>", "voter wallet address")
  .option("--chain <chain>", "chain slug or numeric id", "base")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const option = Number(opts.option) as VoteOption;
    const steps = await buildVoteSteps({ client, account, chainId, option });
    emitCalls(steps, chainId, { action: "vote", option });
  });

program
  .command("launch-cost")
  .summary("Read the BMX burn cost to launch (with member discount)")
  .description("Read-only: the effective BMX burn cost to launch on a chain.")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption(
    "--wallet <address>",
    "issuer wallet address (checked for the NFT member discount)",
  )
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const cost = await readLaunchCost(client, account, chainId);
    print({
      chainId,
      baseBurn: cost.baseBurn.toString(),
      discountBps: cost.discountBps.toString(),
      isMember: cost.isMember,
      bmxBurnCost: cost.bmxBurnCost.toString(),
    });
  });

program
  .command("status")
  .summary("Read a launch's status + presale address")
  .description(
    "Read-only: a launch's status, path, presale manager, and raise token.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    print(await getLaunch(token, chainId));
  });

program
  .command("launch-metadata")
  .summary(
    "Resolve the launched token + upload logo + build the EIP-712 payload to sign",
  )
  .description(
    "After the create-launch tx confirms, resolve the token from the receipt (--tx), upload the logo, " +
      "and print the EIP-712 payload to sign. Finish with submit-metadata.",
  )
  .option(
    "--tx <hash>",
    "create-launch transaction hash — resolves the token from the receipt (recommended)",
  )
  .option("--token <address>", "launch token address (if you already have it)")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .option("--logo <file>", "path to a logo image on disk (uploaded to the CDN)")
  .option(
    "--logo-data <dataurl>",
    "base64 / data: URL of a logo (uploaded to the CDN)",
  )
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
  .option("--tos-uri <uri>", "Terms of Service URI", TOS_URI)
  .option("--tos-version <v>", "Terms of Service version", TOS_VERSION)
  .option(
    "--rpc <url>",
    "RPC URL override (used with --tx; default: chain's public RPC)",
  )
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);

    let token: Address;
    if (opts.tx) {
      const txHash = requireTxHash(opts.tx);
      const { client } = makeClient(opts.chain, opts.rpc);
      token = (await resolveLaunchedToken(client, txHash, chainId)).token;
    } else if (opts.token) {
      token = requireAddress(opts.token, "token");
    } else {
      fail(
        "provide --tx <create-launch tx hash> (recommended) or --token <address>",
      );
    }

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

    let raiseGoalWei = "0";
    if (opts.raiseGoal) {
      const wei = parseUnits(opts.raiseGoal, 18);
      const grad = getLaunchConfig(chainId);
      // Advanced raise goal must exceed the graduation threshold (mirrors the FE).
      if (wei <= grad.graduationThresholdWei) {
        fail(
          `raise goal (${opts.raiseGoal} ${grad.raiseTokenSymbol}) must be greater than the graduation threshold (${formatUnits(grad.graduationThresholdWei, 18)} ${grad.raiseTokenSymbol}) on this chain`,
        );
      }
      raiseGoalWei = wei.toString();
    }
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
      token,
      auctionUrl: getAuctionUrl(token, chainId),
      sign: {
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.wireMessage,
      },
      next: {
        note: "Sign `sign` (EIP-712 typed data) with the issuer wallet, then run the command below with --signature filled in (--message is `sign.message`).",
        command: `boardwalk submit-metadata --token ${token} --chain ${opts.chain} --signature <signature> --message <sign.message>`,
      },
    });
  });

program
  .command("submit-metadata")
  .summary("POST a signed metadata payload")
  .description(
    "POST a signed metadata payload (retries through backend indexer lag).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption(
    "--signature <hex>",
    "EIP-712 signature from the issuer wallet",
  )
  .requiredOption(
    "--message <json>",
    "the `sign.message` JSON emitted by launch-metadata",
  )
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    if (!/^0x[0-9a-fA-F]+$/.test(opts.signature)) {
      fail("--signature must be a 0x-prefixed hex string");
    }
    let wireMessage: MetadataWireMessage;
    try {
      wireMessage = JSON.parse(opts.message) as MetadataWireMessage;
    } catch {
      fail(
        "--message must be the JSON object from launch-metadata `sign.message`",
      );
    }
    const result = await postSignedMetadata(
      token,
      wireMessage,
      opts.signature,
      { chainId },
    );
    print({
      action: "submit-metadata",
      token,
      auctionUrl: getAuctionUrl(token, chainId),
      result,
    });
  });

program.addHelpText(
  "after",
  `
Launch flow (non-custodial — you sign + submit):
  1. boardwalk launch …                         → submit the returned calls with your wallet
  2. boardwalk launch-metadata --tx <hash> …    → resolves the token, returns the EIP-712 payload + auction URL
  3. sign the payload, then boardwalk submit-metadata --signature … --message …

Examples:
  $ boardwalk launch --chain base --wallet 0xYou --name "My Token" --ticker MYT \\
      --category meme-culture --path express --issuer-fee 0xYou
  $ boardwalk launch-link --chain base --name "My Token" --ticker MYT \\
      --category meme-culture --issuer-fee 0xYou   # prefilled /launch link (no wallet, no shell)
  $ boardwalk contribute --token 0xLaunch --amount 0.1 --chain base --wallet 0xYou
  $ boardwalk vote --option 1 --wallet 0xYou           # Base-only

The CLI only prints unsigned calldata — it never signs or sends.`,
);

program.parseAsync().catch((e) => fail(formatCliError(e)));
