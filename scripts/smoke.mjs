#!/usr/bin/env node
// End-to-end smoke test: runs every `boardwalk` CLI command against live chains
// and checks each either emits valid calldata / a read, or fails with the exact
// gating error expected for the chosen launch's state. Non-mutating — only prints
// unsigned calldata; never signs or submits. submit-metadata is skipped (it would
// POST to the backend).
//
// Launch/presale/LP/swap/visibility commands run against Base; the Ethereum-only
// staking/governance commands (stake-bwlk, unstake-bwlk, handle-rewards, vote,
// claim-participation) run against Ethereum mainnet. Until the redeployment's
// addresses land in the registry, commands that hit placeholder contracts fail —
// that is expected; run this after the addresses are filled in.
//
//   node scripts/smoke.mjs                          # public RPCs
//   BOARDWALK_RPC=<url> node scripts/smoke.mjs      # private Base RPC (public RPCs rate-limit)
//   BOARDWALK_ETH_RPC=<url> node scripts/smoke.mjs  # private Ethereum RPC
//
// Builds dist first if missing: `npm run build`.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");
const RPC = process.env.BOARDWALK_RPC ?? "https://mainnet.base.org";
const ETH_RPC = process.env.BOARDWALK_ETH_RPC; // omit → CLI uses viem's default mainnet RPC
const API = process.env.BOARDWALK_API_URL ?? "https://api.useboardwalk.com";
const W = "0x1111111111111111111111111111111111111111";
const WETH = "0x4200000000000000000000000000000000000006"; // Base canonical WETH (the raise token)
const BUILDER_CODE_HEX = "62635f736e7a696e6e3672"; // "bc_snzinn6r"

if (!existsSync(CLI)) {
  console.error(`Missing ${CLI} — run \`npm run build\` first.`);
  process.exit(1);
}

const run = (args) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { cwd: ROOT, timeout: 30_000, killSignal: "SIGKILL" },
      (err, stdout, stderr) => {
        // A timeout/SIGKILL leaves err.code null — report nonzero so it fails.
        const code = err ? (typeof err.code === "number" ? err.code : 1) : 0;
        resolve({ code, stdout, stderr: stderr + (err ? "" : "") });
      },
    );
  });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickTokens() {
  const res = await fetch(`${API}/boardwalk-launches?chainId=8453&limit=25`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `token API failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }
  const { launches = [] } = await res.json();
  const express = launches.find((l) => l.path === "EXPRESS") ?? launches[0];
  const advanced = launches.find((l) => l.path === "ADVANCED") ?? launches[0];
  if (!express) throw new Error("no Base launches returned from the API");
  return { token: express.token, advancedToken: advanced.token };
}

/** A command + how to judge its result for the chosen launch state. */
function commands({ token, advancedToken }) {
  // Base calls carry the ERC-8021 builder-code suffix; Ethereum calls don't.
  const okOn = (chainId) => (r) => {
    const j = JSON.parse(r.stdout);
    if (!Array.isArray(j.calls) || j.calls.length === 0) return "no calls[]";
    for (const c of j.calls) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(c.to)) return `bad to: ${c.to}`;
      if (!c.data?.startsWith("0x")) return "bad data";
      const hasSuffix = c.data.toLowerCase().endsWith(BUILDER_CODE_HEX);
      if (chainId === 8453 && !hasSuffix) return "missing builder code suffix";
      if (chainId !== 8453 && hasSuffix) return "unexpected builder code suffix";
      if (typeof c.value !== "string" || c.chainId !== chainId)
        return "bad value/chainId";
    }
    return null;
  };
  const ok = okOn(8453);
  const okEth = okOn(1);
  const readOk = (r) => (JSON.parse(r.stdout), null);
  const has = (key) => (r) => (JSON.parse(r.stdout)[key] ? null : `no ${key}`);
  // State-gated commands: accept EITHER valid calldata (the live token's state
  // allows the action) OR the known gating error (it doesn't). The smoke picks a
  // live token whose state varies between runs, so a fixed expectation is flaky.
  const okOrGated = (re, check = ok) => (r) =>
    r.code === 0
      ? check(r)
      : re.test(r.stdout + r.stderr)
        ? null
        : `expected calls or error /${re.source}/`;

  const eth = ETH_RPC ? ["--rpc", ETH_RPC] : [];

  return [
    // --- Base: launch / presale / claims / LP / swap / visibility ---
    { name: "launch-cost", args: ["launch-cost", "--chain", "base", "--wallet", W, "--rpc", RPC], check: readOk },
    { name: "status", args: ["status", "--token", token, "--chain", "base"], check: readOk },
    { name: "launch-link", args: ["launch-link", "--chain", "base", "--name", "Smoke", "--ticker", "SMOKE", "--category", "meme-culture", "--issuer-fee", W], check: has("url") },
    { name: "launch", args: ["launch", "--chain", "base", "--wallet", W, "--name", "Smoke", "--ticker", "SMOKE", "--category", "meme-culture", "--path", "express", "--issuer-fee", W, "--rpc", RPC], check: ok },
    { name: "launch-metadata", args: ["launch-metadata", "--token", token, "--chain", "base"], check: has("sign") },
    { name: "contribute", args: ["contribute", "--token", token, "--amount", "0.01", "--chain", "base", "--wallet", W, "--rpc", RPC], check: okOrGated(/not in presale/i) },
    { name: "claim", args: ["claim", "--token", token, "--chain", "base", "--wallet", W, "--rpc", RPC], check: okOrGated(/seeded|cliff/i) },
    { name: "refund", args: ["refund", "--token", token, "--chain", "base", "--wallet", W], check: okOrGated(/failed launch/i) },
    { name: "seed-liquidity", args: ["seed-liquidity", "--token", token, "--chain", "base", "--wallet", W], check: ok },
    { name: "claim-issuer-fees", args: ["claim-issuer-fees", "--token", advancedToken, "--recipient-idx", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-referrer-fees", args: ["claim-referrer-fees", "--token", advancedToken, "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-integrator-fees", args: ["claim-integrator-fees", "--token", token, "--min-out", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-vested", args: ["claim-vested", "--token", advancedToken, "--allocation-id", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "cast-visibility", args: ["cast-visibility", "--token", token, "--mode", "boost", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "add-liquidity", args: ["add-liquidity", "--token-a", token, "--token-b", WETH, "--amount-a", "100", "--amount-b", "0.01", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "remove-liquidity", args: ["remove-liquidity", "--token", token, "--liquidity", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: okOrGated(/no Uniswap V2 pool/i) },
    { name: "stake-lp", args: ["stake-lp", "--token", token, "--amount", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: okOrGated(/not seeded|no LP token/i) },
    { name: "unstake-lp", args: ["unstake-lp", "--token", token, "--amount", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-lp-rewards", args: ["claim-lp-rewards", "--token", token, "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "swap", args: ["swap", "--token", token, "--amount", "0.01", "--direction", "buy", "--chain", "base", "--wallet", W, "--rpc", RPC], check: okOrGated(/no Uniswap V2 pool/i) },
    // --- Ethereum: BWLK staking / governance / participation ---
    { name: "stake-bwlk", args: ["stake-bwlk", "--amount", "100", "--wallet", W, "--chain", "ethereum", ...eth], check: okEth },
    { name: "unstake-bwlk", args: ["unstake-bwlk", "--amount", "100", "--wallet", W, "--chain", "ethereum"], check: okEth },
    { name: "handle-rewards", args: ["handle-rewards", "--wallet", W, "--chain", "ethereum"], check: okEth },
    { name: "vote", args: ["vote", "--option", "1", "--wallet", W, "--chain", "ethereum", ...eth], check: okOrGated(/voting power|already voted|participation|ineligible/i, okEth) },
    { name: "claim-participation", args: ["claim-participation", "--epochs", "0,1", "--wallet", W, "--chain", "ethereum"], check: okEth },
  ];
}

async function main() {
  const tokens = await pickTokens();
  console.log(`Smoke — Base express=${tokens.token} advanced=${tokens.advancedToken}\nBase RPC=${RPC}  Ethereum RPC=${ETH_RPC ?? "(viem default)"}\n`);
  const cmds = commands(tokens);
  let failures = 0;
  for (const cmd of cmds) {
    const r = await run(cmd.args);
    let reason = null;
    try {
      reason = cmd.check(r);
    } catch (e) {
      reason = `parse error: ${(e.message || e).slice(0, 80)} | out=${(r.stdout + r.stderr).slice(0, 120)}`;
    }
    if (reason) {
      failures += 1;
      console.log(`FAIL  ${cmd.name.padEnd(22)} ${reason}`);
    } else {
      console.log(`ok    ${cmd.name}`);
    }
    await delay(250); // ease public-RPC rate limits
  }
  console.log(`\n${cmds.length - failures}/${cmds.length} commands ok` + (failures ? ` — ${failures} FAILED` : ""));
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("smoke runner error:", e);
  process.exit(1);
});
