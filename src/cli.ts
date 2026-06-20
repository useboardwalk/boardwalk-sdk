#!/usr/bin/env node
// boardwalk CLI — prints UNSIGNED calldata as JSON. Never accepts private keys;
// the agent's wallet signs + submits (e.g. Base MCP `send_calls`). Boardwalk's
// ERC-8021 builder code is appended on Base (where the code is registered).
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  erc20Abi,
  zeroAddress,
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
import { buildRefundSteps } from "./builders/refund";
import { buildSeedLiquiditySteps } from "./builders/seed-liquidity";
import { buildUnstakeBmxSteps } from "./builders/unstake-bmx";
import { buildHandleRewardsSteps } from "./builders/handle-rewards";
import { buildClaimIssuerFeesSteps } from "./builders/claim-issuer-fees";
import { buildClaimReferrerFeesSteps } from "./builders/claim-referrer-fees";
import { buildClaimIntegratorFeesSteps } from "./builders/claim-integrator-fees";
import { buildClaimVestedTokensSteps } from "./builders/claim-vested-tokens";
import { buildClaimParticipationRewardsSteps } from "./builders/claim-participation-rewards";
import { buildCastVisibilitySteps } from "./builders/cast-visibility";
import { buildAddLiquiditySteps } from "./builders/add-liquidity";
import { buildRemoveLiquiditySteps } from "./builders/remove-liquidity";
import { buildStakeLpSteps } from "./builders/stake-lp";
import { buildWithdrawLpSteps } from "./builders/withdraw-lp";
import { buildClaimLpRewardsSteps } from "./builders/claim-lp-rewards";
import { buildSwapSteps } from "./builders/swap";
import { buildLaunchLink } from "./launch/build-launch-link";
import {
  integratorFeeCollectorAbi,
  lpStakingAbi,
  pairAbi,
  presaleManagerAbi,
  uniswapV2FactoryAbi,
} from "./registry/abis";
import { assertDeployed, getContracts } from "./registry/contracts";
import { encodeSteps } from "./flow/encode";
import { getAuctionUrl, getLaunch, getLaunchAddresses } from "./read/launches";
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

/** `--chain` help text, derived from the registry so it can't drift from the
 *  supported set when a chain is added. */
const CHAIN_HELP = `chain slug (${SUPPORTED_CHAINS.map((c) => c.slug).join("|")}) or numeric id`;

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

/** Apply a bps slippage floor: amount * (10000 - bps) / 10000. */
function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10_000 - slippageBps)) / BigInt(10_000);
}

/** Validate a 0–9999 bps option (default when omitted). */
function parseSlippageBps(value: string | undefined, fallback = 50): number {
  if (value == null) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n >= 10_000) {
    fail("--slippage-bps must be an integer between 0 and 9999");
  }
  return n;
}

/** Parse a comma-separated list of epoch numbers to bigints. */
function parseEpochs(csv: string): bigint[] {
  const epochs = (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (!/^\d+$/.test(s)) fail(`invalid epoch "${s}" — expected a non-negative integer`);
      return BigInt(s);
    });
  if (epochs.length === 0) fail("--epochs must list at least one epoch (e.g. 0,1,2)");
  return epochs;
}

/** Default swap/claim deadline: now + `seconds`, as a unix-seconds bigint. */
function deadlineFromNow(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

/** Parse a `--deadline <unixSeconds>` option, or fall back to now + `defaultSeconds`. */
function parseDeadline(value: string | undefined, defaultSeconds: number): bigint {
  if (value == null) return deadlineFromNow(defaultSeconds);
  if (!/^\d+$/.test(value)) fail("--deadline must be a unix-seconds integer");
  return BigInt(value);
}

/** Parse a required non-negative integer option (e.g. --recipient-idx, --allocation-id). */
function parseUintOption(value: string, flag: string): bigint {
  if (!/^\d+$/.test(value)) fail(`--${flag} must be a non-negative integer`);
  return BigInt(value);
}

/** Validate the launch `--path` option (anything but "advanced" was otherwise
 *  silently treated as advanced). */
function requireLaunchPath(value: string): "express" | "advanced" {
  if (value !== "express" && value !== "advanced") {
    fail('--path must be "express" or "advanced"');
  }
  return value;
}

const program = new Command();
program
  .name("boardwalk")
  .description(
    "Build UNSIGNED Boardwalk transactions for an agent to sign + submit.\n" +
      "Every tx command prints { calls: [{to,data,value,chainId}], ...meta }; submit\n" +
      "the ordered `calls` array with your own wallet (e.g. Base MCP send_calls).\n" +
      "Boardwalk's ERC-8021 builder code is appended on Base (where it is registered).",
  )
  .version("0.4.0")
  .showHelpAfterError("(run `boardwalk <command> --help` for usage)");

program
  .command("launch")
  .summary("Build a token launch (approve BMX + createLaunch)")
  .description(
    "Build the launch flow (approve BMX → createLaunch). Then run launch-metadata with the tx hash.",
  )
  .requiredOption(
    "--chain <chain>",
    CHAIN_HELP,
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
    const path = requireLaunchPath(opts.path);
    const result = await buildLaunchSteps({
      client,
      account,
      chainId,
      input: {
        name: opts.name,
        ticker: opts.ticker,
        category: opts.category,
        description: opts.description,
        path,
        issuerFeeRecipient: opts.issuerFee,
        issuerFee: opts.fee.length ? opts.fee : undefined,
        vesting: opts.vesting.length ? opts.vesting : undefined,
        presaleSupplyPercent:
          opts.presalePercent != null ? Number(opts.presalePercent) : undefined,
        referrer: opts.referrer,
      },
    });
    const grad = getLaunchConfig(chainId);
    const advanced = path === "advanced";
    emitCalls(result.steps, chainId, {
      action: "launch",
      bmxBurnCost: result.bmxBurnCost.toString(),
      config: serializeConfig(result.config),
      graduationThreshold: {
        wei: grad.graduationThresholdWei.toString(),
        display: grad.graduationDisplay,
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
    CHAIN_HELP,
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
    const path = requireLaunchPath(opts.path);
    const result = buildLaunchLink({
      name: opts.name,
      ticker: opts.ticker,
      category: opts.category,
      description: opts.description,
      path,
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

// ---------------------------------------------------------------------------
// Presale lifecycle
// ---------------------------------------------------------------------------

program
  .command("refund")
  .summary("Refund a contribution on a FAILED launch")
  .description(
    "Build refund() for a launch that failed to graduate (status: failed).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "contributor wallet address")
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const launch = await getLaunch(token, chainId);
    if (launch.status !== "failed") {
      fail(
        `refunds are only available on a failed launch (status: ${launch.status})`,
      );
    }
    if (!launch.presaleManager)
      fail("presale manager not indexed yet for this token");
    emitCalls(buildRefundSteps({ presale: launch.presaleManager }), chainId, {
      action: "refund",
      token,
    });
  });

program
  .command("seed-liquidity")
  .summary("Activate trading by seeding liquidity after a successful presale")
  .description(
    "Build seedLiquidity() for a launch that reached its graduation threshold.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .action(async (opts) => {
    const chainId = chainIdOf(opts.chain);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const launch = await getLaunch(token, chainId);
    if (launch.seeded) fail("liquidity is already seeded for this launch");
    if (!launch.presaleManager)
      fail("presale manager not indexed yet for this token");
    emitCalls(
      buildSeedLiquiditySteps({ presale: launch.presaleManager }),
      chainId,
      { action: "seed-liquidity", token },
    );
  });

// ---------------------------------------------------------------------------
// BMX staking
// ---------------------------------------------------------------------------

program
  .command("unstake-bmx")
  .summary("Unstake BMX (Base-only)")
  .description("Build unstakeBmx. Base-only — errors clearly on other chains.")
  .requiredOption("--amount <amount>", "BMX amount in human units (e.g. 100)")
  .requiredOption("--wallet <address>", "staker wallet address")
  .option("--chain <chain>", "chain slug or numeric id", "base")
  .action((opts) => {
    const chainId = chainIdOf(opts.chain);
    requireAddress(opts.wallet, "wallet");
    const amount = parseUnits(opts.amount, 18); // BMX is 18 decimals
    emitCalls(buildUnstakeBmxSteps({ chainId, amount }), chainId, {
      action: "unstake-bmx",
      amount: amount.toString(),
    });
  });

program
  .command("handle-rewards")
  .summary("Claim/compound staking rewards (Base-only)")
  .description(
    "Build handleRewards(...). With no flags it claims everything; pass flags to select actions.",
  )
  .requiredOption("--wallet <address>", "staker wallet address")
  .option("--chain <chain>", "chain slug or numeric id", "base")
  .option("--claim-op-bmx", "claim OP BMX rewards")
  .option("--stake-mp", "stake multiplier points")
  .option("--claim-weth", "claim WETH rewards")
  .option("--convert-weth-to-eth", "convert claimed WETH to ETH")
  .action((opts) => {
    const chainId = chainIdOf(opts.chain);
    requireAddress(opts.wallet, "wallet");
    const anyFlag =
      opts.claimOpBmx || opts.stakeMp || opts.claimWeth || opts.convertWethToEth;
    const all = !anyFlag; // no flags → claim everything
    emitCalls(
      buildHandleRewardsSteps({
        chainId,
        shouldClaimOpBmx: all || !!opts.claimOpBmx,
        shouldStakeMultiplierPoints: all || !!opts.stakeMp,
        shouldClaimWeth: all || !!opts.claimWeth,
        shouldConvertWethToEth: all || !!opts.convertWethToEth,
      }),
      chainId,
      { action: "handle-rewards" },
    );
  });

// ---------------------------------------------------------------------------
// Fee / vesting / participation claims
// ---------------------------------------------------------------------------

program
  .command("claim-issuer-fees")
  .summary("Issuer claims fees as the raise token")
  .description(
    "Build claimAsRaiseToken on the launch's FeeDistributor (resolved on-chain).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--recipient-idx <n>", "issuer-fee recipient index")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "issuer wallet address")
  .option("--min-out <amount>", "min raise-token out (human units; default 0)")
  .option("--deadline <unixSeconds>", "swap deadline (default now + 1200s)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const recipientIdx = parseUintOption(opts.recipientIdx, "recipient-idx");
    const minRaiseTokenOut =
      opts.minOut != null ? parseUnits(opts.minOut, 18) : BigInt(0);
    const deadline = parseDeadline(opts.deadline, 1200);
    const { feeDistributor } = await getLaunchAddresses(client, token, chainId);
    if (feeDistributor === zeroAddress)
      fail("fee distributor not deployed for this launch");
    emitCalls(
      buildClaimIssuerFeesSteps({
        feeDistributor,
        recipientIdx,
        minRaiseTokenOut,
        deadline,
      }),
      chainId,
      { action: "claim-issuer-fees", token, feeDistributor },
    );
  });

program
  .command("claim-referrer-fees")
  .summary("Referrer claims their fee share")
  .description(
    "Build claimReferrerFees on the launch's FeeDistributor (resolved on-chain).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "referrer wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const { feeDistributor } = await getLaunchAddresses(client, token, chainId);
    if (feeDistributor === zeroAddress)
      fail("fee distributor not deployed for this launch");
    emitCalls(buildClaimReferrerFeesSteps({ feeDistributor }), chainId, {
      action: "claim-referrer-fees",
      token,
      feeDistributor,
    });
  });

program
  .command("claim-integrator-fees")
  .summary("Integrator claims a launch token's accrued tax")
  .description(
    "Build claim() on the per-chain IntegratorFeeCollector. Derives minOut from the collector's quote.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "integrator wallet address")
  .option("--slippage-bps <bps>", "slippage tolerance in bps (default 50)")
  .option("--min-out <amount>", "override min raise-token out (human units)")
  .option("--deadline <unixSeconds>", "swap deadline (default now + 1200s)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    const account = requireAddress(opts.wallet, "wallet");
    const collector = assertDeployed(chainId, "integratorFeeCollector");
    const slippageBps = parseSlippageBps(opts.slippageBps);
    const deadline = parseDeadline(opts.deadline, 1200);

    // With --min-out we can skip the quote read entirely. Otherwise derive minOut
    // from the collector's quote; it reverts when there's nothing claimable.
    let minOut: bigint;
    let amountIn = "0";
    if (opts.minOut != null) {
      minOut = parseUnits(opts.minOut, 18);
    } else {
      let quote: readonly [bigint, bigint];
      try {
        quote = (await client.readContract({
          abi: integratorFeeCollectorAbi,
          address: collector,
          functionName: "quote",
          args: [account, token, BigInt(slippageBps)],
        })) as readonly [bigint, bigint];
      } catch {
        fail(
          "no claimable integrator fees for this token (or this wallet is not the integrator). Pass --min-out to override.",
        );
      }
      minOut = quote[1];
      amountIn = quote[0].toString();
    }

    emitCalls(
      buildClaimIntegratorFeesSteps({ chainId, token, minOut, deadline }),
      chainId,
      { action: "claim-integrator-fees", token, amountIn, minOut: minOut.toString() },
    );
  });

program
  .command("claim-vested")
  .summary("Claim vested launch tokens")
  .description(
    "Build claim(allocationId) on the launch's VestingStream (resolved on-chain).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--allocation-id <n>", "vesting allocation id")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "recipient wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const allocationId = parseUintOption(opts.allocationId, "allocation-id");
    const { vestingStream } = await getLaunchAddresses(client, token, chainId);
    if (vestingStream === zeroAddress)
      fail("vesting stream not deployed for this launch");
    emitCalls(
      buildClaimVestedTokensSteps({ vestingStream, allocationId }),
      chainId,
      { action: "claim-vested", token, vestingStream },
    );
  });

program
  .command("claim-participation")
  .summary("Claim participation BMX rewards (Base-only)")
  .description("Build claimAll(epochs) on the ParticipationDistributor.")
  .requiredOption("--epochs <csv>", "comma-separated epoch numbers (e.g. 0,1,2)")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--chain <chain>", "chain slug or numeric id", "base")
  .action((opts) => {
    const chainId = chainIdOf(opts.chain);
    requireAddress(opts.wallet, "wallet");
    const epochs = parseEpochs(opts.epochs);
    emitCalls(
      buildClaimParticipationRewardsSteps({ chainId, epochs }),
      chainId,
      { action: "claim-participation", epochs: epochs.map(String) },
    );
  });

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

program
  .command("cast-visibility")
  .summary("Upvote (boost) or downvote (deboost) a token — burns BMX")
  .description(
    "Build approve BMX + boost/deboost. Reads the live BMX cost (with member discount).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--mode <mode>", "boost | deboost")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    const account = requireAddress(opts.wallet, "wallet");
    if (opts.mode !== "boost" && opts.mode !== "deboost")
      fail("--mode must be boost or deboost");
    const steps = await buildCastVisibilitySteps({
      client,
      account,
      chainId,
      token,
      mode: opts.mode,
    });
    emitCalls(steps, chainId, {
      action: "cast-visibility",
      mode: opts.mode,
      token,
    });
  });

// ---------------------------------------------------------------------------
// Boardwalk LP + swap
// ---------------------------------------------------------------------------

program
  .command("add-liquidity")
  .summary("Add liquidity to a Boardwalk pair")
  .description(
    "Build approve(s) + addLiquidity on the Boardwalk LP manager. Min amounts use --slippage-bps off the desired amounts.",
  )
  .requiredOption("--token-a <address>", "first token")
  .requiredOption("--token-b <address>", "second token (e.g. the raise token)")
  .requiredOption("--amount-a <amount>", "token A amount in human units")
  .requiredOption("--amount-b <amount>", "token B amount in human units")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--slippage-bps <bps>", "slippage tolerance in bps (default 50)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const tokenA = requireAddress(opts.tokenA, "token-a");
    const tokenB = requireAddress(opts.tokenB, "token-b");
    const slippageBps = parseSlippageBps(opts.slippageBps);
    const [decA, decB] = await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        { abi: erc20Abi, address: tokenA, functionName: "decimals" },
        { abi: erc20Abi, address: tokenB, functionName: "decimals" },
      ],
    });
    const amountADesired = parseUnits(opts.amountA, decA);
    const amountBDesired = parseUnits(opts.amountB, decB);
    const steps = await buildAddLiquiditySteps({
      client,
      account,
      chainId,
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin: applySlippage(amountADesired, slippageBps),
      amountBMin: applySlippage(amountBDesired, slippageBps),
    });
    emitCalls(steps, chainId, {
      action: "add-liquidity",
      tokenA,
      tokenB,
      amountADesired: amountADesired.toString(),
      amountBDesired: amountBDesired.toString(),
    });
  });

program
  .command("remove-liquidity")
  .summary("Remove liquidity from a Boardwalk token/raise-token pair")
  .description(
    "Build approve LP + removeLiquidity. Min amounts are derived from pool reserves and --slippage-bps.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--liquidity <amount>", "LP tokens to burn (human units)")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--slippage-bps <bps>", "slippage tolerance in bps (default 50)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const token = requireAddress(opts.token, "token");
    const { raiseToken } = getContracts(chainId);
    const factory = assertDeployed(chainId, "uniswapV2Factory");
    const pair = (await client.readContract({
      abi: uniswapV2FactoryAbi,
      address: factory,
      functionName: "getPair",
      args: [token, raiseToken],
    })) as Address;
    if (pair === zeroAddress) fail("no Boardwalk LP pool for this token");
    const liquidity = parseUnits(opts.liquidity, 18); // V2 LP tokens are 18 decimals
    const [reserves, totalSupply, token0] = await client.multicall({
      allowFailure: false,
      multicallAddress: MULTICALL3_ADDRESS,
      contracts: [
        { abi: pairAbi, address: pair, functionName: "getReserves" },
        { abi: pairAbi, address: pair, functionName: "totalSupply" },
        { abi: pairAbi, address: pair, functionName: "token0" },
      ],
    });
    if (totalSupply === BigInt(0)) fail("pool has no liquidity");
    const tokenIsToken0 =
      (token0 as Address).toLowerCase() === token.toLowerCase();
    const outToken =
      (liquidity * (tokenIsToken0 ? reserves[0] : reserves[1])) / totalSupply;
    const outRaise =
      (liquidity * (tokenIsToken0 ? reserves[1] : reserves[0])) / totalSupply;
    const slippageBps = parseSlippageBps(opts.slippageBps);
    const steps = await buildRemoveLiquiditySteps({
      client,
      account,
      chainId,
      tokenA: token,
      tokenB: raiseToken,
      lpToken: pair,
      liquidity,
      amountAMin: applySlippage(outToken, slippageBps),
      amountBMin: applySlippage(outRaise, slippageBps),
    });
    emitCalls(steps, chainId, {
      action: "remove-liquidity",
      token,
      lpToken: pair,
      liquidity: liquidity.toString(),
    });
  });

program
  .command("stake-lp")
  .summary("Stake a launch's LP tokens")
  .description(
    "Build approve LP + stake on the launch's LPStaking (resolved on-chain).",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--amount <amount>", "LP tokens to stake (human units)")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const token = requireAddress(opts.token, "token");
    const { lpStaking } = await getLaunchAddresses(client, token, chainId);
    if (lpStaking === zeroAddress)
      fail("LP staking is not deployed until liquidity is seeded");
    const lpToken = (await client.readContract({
      abi: lpStakingAbi,
      address: lpStaking,
      functionName: "lpToken",
    })) as Address;
    if (lpToken === zeroAddress)
      fail("this launch has no LP token yet — liquidity is not seeded");
    const amount = parseUnits(opts.amount, 18); // V2 LP tokens are 18 decimals
    const steps = await buildStakeLpSteps({
      client,
      account,
      lpStaking,
      lpToken,
      amount,
    });
    emitCalls(steps, chainId, {
      action: "stake-lp",
      token,
      lpStaking,
      lpToken,
      amount: amount.toString(),
    });
  });

program
  .command("unstake-lp")
  .summary("Unstake a launch's LP tokens")
  .description("Build withdraw on the launch's LPStaking (resolved on-chain).")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--amount <amount>", "LP tokens to unstake (human units)")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const { lpStaking } = await getLaunchAddresses(client, token, chainId);
    if (lpStaking === zeroAddress)
      fail("LP staking is not deployed for this launch");
    const amount = parseUnits(opts.amount, 18);
    emitCalls(buildWithdrawLpSteps({ lpStaking, amount }), chainId, {
      action: "unstake-lp",
      token,
      lpStaking,
      amount: amount.toString(),
    });
  });

program
  .command("claim-lp-rewards")
  .summary("Claim a launch's LP staking rewards")
  .description("Build claim() on the launch's LPStaking (resolved on-chain).")
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const token = requireAddress(opts.token, "token");
    requireAddress(opts.wallet, "wallet");
    const { lpStaking } = await getLaunchAddresses(client, token, chainId);
    if (lpStaking === zeroAddress)
      fail("LP staking is not deployed for this launch");
    emitCalls(buildClaimLpRewardsSteps({ lpStaking }), chainId, {
      action: "claim-lp-rewards",
      token,
      lpStaking,
    });
  });

program
  .command("swap")
  .summary("Swap via the Boardwalk DEX (raise token ↔ launch token)")
  .description(
    "Build approve + swapExactTokensForTokens through Boardwalk's V2 router. " +
      "--direction buy spends the raise token for the launch token; sell does the reverse.",
  )
  .requiredOption("--token <address>", "launch token address")
  .requiredOption("--amount <amount>", "input amount in human units of the sell token")
  .requiredOption("--direction <dir>", "buy | sell")
  .requiredOption("--chain <chain>", "chain slug or numeric id")
  .requiredOption("--wallet <address>", "wallet address")
  .option("--slippage-bps <bps>", "slippage tolerance in bps (default 50)")
  .option("--rpc <url>", "RPC URL override (default: chain's public RPC)")
  .action(async (opts) => {
    const { client, chainId } = makeClient(opts.chain, opts.rpc);
    const account = requireAddress(opts.wallet, "wallet");
    const token = requireAddress(opts.token, "token");
    if (opts.direction !== "buy" && opts.direction !== "sell")
      fail("--direction must be buy or sell");
    const { raiseToken } = getContracts(chainId);
    const sellToken = opts.direction === "buy" ? raiseToken : token;
    const buyToken = opts.direction === "buy" ? token : raiseToken;
    const slippageBps = parseSlippageBps(opts.slippageBps);
    const decimals = await client.readContract({
      abi: erc20Abi,
      address: sellToken,
      functionName: "decimals",
    });
    const sellAmount = parseUnits(opts.amount, decimals);
    const steps = await buildSwapSteps({
      client,
      account,
      chainId,
      sellToken,
      buyToken,
      sellAmount,
      slippageBps,
    });
    emitCalls(steps, chainId, {
      action: "swap",
      direction: opts.direction,
      token,
      sellToken,
      buyToken,
      sellAmount: sellAmount.toString(),
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
