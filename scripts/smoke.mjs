#!/usr/bin/env node
// End-to-end smoke test: runs every `boardwalk` CLI command against the live
// deployment on all four chains and checks each either emits valid calldata / a
// read, or fails with the exact gating error expected for the chain and the
// chosen launch's state. Non-mutating — only prints unsigned calldata; never
// signs or submits. submit-metadata is skipped (it would POST to the backend).
//
// Per chain it runs the full multi-chain command set; the Ethereum-only
// commands (stake-bwlk, unstake-bwlk, handle-rewards, vote, claim-participation)
// are asserted to build on Ethereum and to fail loudly everywhere else.
//
//   node scripts/smoke.mjs                          # public RPCs
//   node scripts/smoke.mjs --chain base             # one chain only
//   BOARDWALK_ETH_RPC=<url> BOARDWALK_RPC=<url> …   # private RPCs (public ones rate-limit)
//
// Per-chain RPC overrides: BOARDWALK_ETH_RPC (1), BOARDWALK_RPC (8453),
// BOARDWALK_ARB_RPC (42161), BOARDWALK_RH_RPC (4663).
//
// Builds dist first if missing: `npm run build`.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");
const API = process.env.BOARDWALK_API_URL ?? "https://api.useboardwalk.com";
const W = "0x1111111111111111111111111111111111111111";
// The real ERC-8021 suffix (code + length + magic), taken from the build so the
// assertion can't drift. The builder code is not the trailing bytes, so a
// suffix check must compare this whole blob.
const { BUILDER_CODE_SUFFIX } = await import(join(ROOT, "dist", "index.js"));
const SUFFIX = BUILDER_CODE_SUFFIX.toLowerCase().slice(2);

/** Per-chain config. `weth` is the raise token; `rpc` is an optional override. */
const CHAINS = {
  ethereum: { id: 1, weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", rpc: process.env.BOARDWALK_ETH_RPC ?? "https://ethereum-rpc.publicnode.com" },
  base: { id: 8453, weth: "0x4200000000000000000000000000000000000006", rpc: process.env.BOARDWALK_RPC ?? "https://base-rpc.publicnode.com" },
  arbitrum: { id: 42161, weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", rpc: process.env.BOARDWALK_ARB_RPC ?? "https://arbitrum-one-rpc.publicnode.com" },
  robinhood: { id: 4663, weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", rpc: process.env.BOARDWALK_RH_RPC ?? "https://rpc.mainnet.chain.robinhood.com" },
};
const ETHEREUM_ONLY = ["stake-bwlk", "unstake-bwlk", "handle-rewards", "vote", "claim-participation"];

if (!existsSync(CLI)) {
  console.error(`Missing ${CLI} — run \`npm run build\` first.`);
  process.exit(1);
}

const run = (args) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { cwd: ROOT, timeout: 45_000, killSignal: "SIGKILL" },
      (err, stdout, stderr) => {
        // A timeout/SIGKILL leaves err.code null — report nonzero so it fails.
        const code = err ? (typeof err.code === "number" ? err.code : 1) : 0;
        resolve({ code, stdout, stderr });
      },
    );
  });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Newest indexed launch on a chain, or null when the indexer has none. */
async function pickTokens(chainId) {
  try {
    const res = await fetch(`${API}/boardwalk-launches?chainId=${chainId}&limit=25`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const { launches = [] } = await res.json();
    if (launches.length === 0) return null;
    const express = launches.find((l) => l.path === "EXPRESS") ?? launches[0];
    const advanced = launches.find((l) => l.path === "ADVANCED") ?? launches[0];
    return { token: express.token, advancedToken: advanced.token };
  } catch {
    return null;
  }
}

function commands(slug, { token, advancedToken, indexed }) {
  const { id: chainId, weth, rpc } = CHAINS[slug];
  const rpcArgs = rpc ? ["--rpc", rpc] : [];

  // Only Base calldata carries the ERC-8021 builder-code suffix.
  const ok = (r) => {
    const j = JSON.parse(r.stdout);
    if (!Array.isArray(j.calls) || j.calls.length === 0) return "no calls[]";
    for (const c of j.calls) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(c.to)) return `bad to: ${c.to}`;
      if (!c.data?.startsWith("0x")) return "bad data";
      if (/^0x0{40}$/.test(c.to)) return "call targets the zero address";
      const hasSuffix = c.data.toLowerCase().endsWith(SUFFIX);
      if (chainId === 8453 && !hasSuffix) return "missing builder code suffix";
      if (chainId !== 8453 && hasSuffix) return "unexpected builder code suffix";
      if (typeof c.value !== "string" || c.chainId !== chainId)
        return "bad value/chainId";
    }
    return null;
  };
  const readOk = (r) => (JSON.parse(r.stdout), null);
  const has = (key) => (r) => (JSON.parse(r.stdout)[key] ? null : `no ${key}`);
  // State-gated commands: accept EITHER valid calldata (the live token's state
  // allows the action) OR a known gating error. Launch state varies between
  // runs, so a fixed expectation would be flaky.
  const okOrGated = (re, check = ok) => (r) =>
    r.code === 0 ? check(r) : re.test(r.stdout + r.stderr) ? null : `expected calls or /${re.source}/, got: ${(r.stdout + r.stderr).trim().slice(0, 120)}`;
  /** An Ethereum-only command run off Ethereum must fail with the scope error. */
  const gatedOffEthereum = (r) =>
    r.code !== 0 && /not deployed on chain|Ethereum/i.test(r.stdout + r.stderr)
      ? null
      : `expected an Ethereum-only rejection, got: ${(r.stdout + r.stderr).trim().slice(0, 120)}`;

  // Commands that resolve per-launch contracts through the factory. With no
  // launch from this deployment they correctly report nothing deployed.
  const NO_LAUNCH = /No Boardwalk launch found|not deployed for this launch|is not deployed|no LP token|not indexed|unsupported chainid/i;
  const isEth = chainId === 1;
  const cmds = [];

  // --- reads + link building (no wallet state) ---
  cmds.push({ name: "launch-cost", args: ["launch-cost", "--chain", slug, "--wallet", W, ...rpcArgs], check: readOk });
  cmds.push({ name: "launch-link", args: ["launch-link", "--chain", slug, "--name", "Smoke Token", "--ticker", "SMOKE", "--category", "meme-culture", "--issuer-fee", W], check: has("url") });

  // --- launch + metadata ---
  cmds.push({ name: "launch(express)", args: ["launch", "--chain", slug, "--wallet", W, "--name", "Smoke Token", "--ticker", "SMOKE", "--category", "meme-culture", "--path", "express", "--issuer-fee", W, ...rpcArgs], check: ok });
  cmds.push({ name: "launch(advanced)", args: ["launch", "--chain", slug, "--wallet", W, "--name", "Smoke Token", "--ticker", "SMOKE", "--category", "meme-culture", "--path", "advanced", "--presale-percent", "40", "--fee", `individual:${W}:100`, "--vesting", `individual:${W}:100`, ...rpcArgs], check: ok });

  // --- visibility, LP, swap (all chains) ---
  cmds.push({ name: "cast-visibility", args: ["cast-visibility", "--token", token, "--mode", "boost", "--chain", slug, "--wallet", W, ...rpcArgs], check: ok });
  cmds.push({ name: "add-liquidity", args: ["add-liquidity", "--token-a", token, "--token-b", weth, "--amount-a", "100", "--amount-b", "0.01", "--chain", slug, "--wallet", W, ...rpcArgs], check: ok });
  cmds.push({ name: "remove-liquidity", args: ["remove-liquidity", "--token", token, "--liquidity", "1", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(/no Uniswap V2 pool|no liquidity/i) });
  // swap quotes against the launch token's own tax views, so it needs a real
  // Boardwalk launch token rather than the WETH stand-in.
  if (indexed)
    cmds.push({ name: "swap", args: ["swap", "--token", token, "--amount", "0.01", "--direction", "buy", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(/no Uniswap V2 pool|zero output|reverted/i) });
  cmds.push({ name: "stake-lp", args: ["stake-lp", "--token", token, "--amount", "1", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });
  cmds.push({ name: "unstake-lp", args: ["unstake-lp", "--token", token, "--amount", "1", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });
  cmds.push({ name: "claim-lp-rewards", args: ["claim-lp-rewards", "--token", token, "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });

  // --- per-launch fee / vesting claims (resolved through the factory) ---
  cmds.push({ name: "claim-issuer-fees", args: ["claim-issuer-fees", "--token", advancedToken, "--recipient-idx", "0", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });
  cmds.push({ name: "claim-referrer-fees", args: ["claim-referrer-fees", "--token", advancedToken, "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });
  cmds.push({ name: "claim-vested", args: ["claim-vested", "--token", advancedToken, "--allocation-id", "0", "--chain", slug, "--wallet", W, ...rpcArgs], check: okOrGated(NO_LAUNCH) });
  cmds.push({ name: "claim-integrator-fees", args: ["claim-integrator-fees", "--token", token, "--min-out", "0", "--chain", slug, "--wallet", W, ...rpcArgs], check: ok });

  // --- indexer-backed lifecycle ---
  // With a launch indexed on this chain these run for real. Without one they
  // still run against a stand-in token to prove the SDK ↔ indexer contract
  // holds per chain: the API must answer "Launch not found", NOT reject the
  // chain id. `unsupported chainid` is therefore a failure, not a pass.
  const notFound = /Launch not found|not indexed/i;
  const indexerReachedIt = (r) =>
    r.code !== 0 && notFound.test(r.stdout + r.stderr)
      ? null
      : /unsupported chainid/i.test(r.stdout + r.stderr)
        ? "indexer rejects this chain id"
        : `expected a not-found gate, got: ${(r.stdout + r.stderr).trim().slice(0, 120)}`;

  cmds.push({ name: "status", args: ["status", "--token", token, "--chain", slug], check: indexed ? readOk : indexerReachedIt });
  cmds.push({ name: "contribute", args: ["contribute", "--token", token, "--amount", "0.01", "--chain", slug, "--wallet", W, ...rpcArgs], check: indexed ? okOrGated(/not in presale|not indexed/i) : indexerReachedIt });
  cmds.push({ name: "claim", args: ["claim", "--token", token, "--chain", slug, "--wallet", W, ...rpcArgs], check: indexed ? okOrGated(/seeded|cliff/i) : indexerReachedIt });
  cmds.push({ name: "refund", args: ["refund", "--token", token, "--chain", slug, "--wallet", W], check: indexed ? okOrGated(/failed launch/i) : indexerReachedIt });
  cmds.push({ name: "seed-liquidity", args: ["seed-liquidity", "--token", token, "--chain", slug, "--wallet", W], check: indexed ? okOrGated(/already seeded|not indexed/i) : indexerReachedIt });
  // launch-metadata builds the EIP-712 payload locally, so it works either way.
  cmds.push({ name: "launch-metadata", args: ["launch-metadata", "--token", token, "--chain", slug], check: has("sign") });

  // --- Ethereum-only: build on Ethereum, must fail loudly elsewhere ---
  const ethOnly = [
    ["stake-bwlk", ["stake-bwlk", "--amount", "100", "--wallet", W, "--chain", slug, ...rpcArgs]],
    ["unstake-bwlk", ["unstake-bwlk", "--amount", "100", "--wallet", W, "--chain", slug]],
    ["handle-rewards", ["handle-rewards", "--wallet", W, "--chain", slug]],
    ["claim-participation", ["claim-participation", "--epochs", "0,1", "--wallet", W, "--chain", slug]],
  ];
  for (const [name, args] of ethOnly)
    cmds.push({ name: isEth ? name : `${name}(gated)`, args, check: isEth ? ok : gatedOffEthereum });
  cmds.push({
    name: isEth ? "vote" : "vote(gated)",
    args: ["vote", "--option", "1", "--wallet", W, "--chain", slug, ...rpcArgs],
    // Pre-epoch, no stake, already voted, and the 3-win cap are all valid outcomes.
    check: isEth ? okOrGated(/voting opens at|voting power|already voted|participation|ineligible/i) : gatedOffEthereum,
  });

  return cmds;
}

async function main() {
  const only = process.argv.includes("--chain")
    ? process.argv[process.argv.indexOf("--chain") + 1]
    : null;
  const slugs = only ? [only] : Object.keys(CHAINS);
  if (only && !CHAINS[only]) {
    console.error(`unknown chain "${only}" — expected one of ${Object.keys(CHAINS).join(", ")}`);
    process.exit(1);
  }

  let failures = 0;
  let total = 0;
  const notes = [];

  for (const slug of slugs) {
    const { id } = CHAINS[slug];
    const picked = await pickTokens(id);
    const indexed = Boolean(picked);
    if (!indexed) notes.push(`${slug}: no indexed launches — lifecycle commands asserted against the indexer's not-found gate; swap skipped`);
    // With no indexed launch, drive the launch-scoped commands off the chain's
    // own WETH: a real ERC-20 with no Boardwalk launch behind it, so the
    // factory-resolved paths exercise their not-deployed branch.
    const tokens = picked ?? { token: CHAINS[slug].weth, advancedToken: CHAINS[slug].weth };

    console.log(`\n===== ${slug} (chain ${id})${indexed ? ` — token ${tokens.token}` : " — no indexed launches"} =====`);
    const cmds = commands(slug, { ...tokens, indexed });
    for (const cmd of cmds) {
      const r = await run(cmd.args);
      total += 1;
      let reason = null;
      try {
        reason = cmd.check(r);
      } catch (e) {
        reason = `parse error: ${(e.message || e).slice(0, 70)} | out=${(r.stdout + r.stderr).trim().slice(0, 110)}`;
      }
      if (reason) {
        failures += 1;
        console.log(`FAIL  ${cmd.name.padEnd(24)} ${reason}`);
      } else {
        console.log(`ok    ${cmd.name}`);
      }
      await delay(400); // ease public-RPC rate limits
    }
  }

  if (notes.length) {
    console.log("\nNotes:");
    for (const n of notes) console.log(`  - ${n}`);
  }
  console.log(`\n${total - failures}/${total} checks ok` + (failures ? ` — ${failures} FAILED` : ""));
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("smoke runner error:", e);
  process.exit(1);
});
