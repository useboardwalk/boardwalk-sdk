#!/usr/bin/env node
// End-to-end smoke test: runs every `boardwalk` CLI command against a live chain
// and checks each either emits valid calldata / a read, or fails with the exact
// gating error expected for the chosen launch's state. Non-mutating — only prints
// unsigned calldata; never signs or submits. submit-metadata is skipped (it would
// POST to the backend).
//
//   node scripts/smoke.mjs                       # default Base public RPC
//   BOARDWALK_RPC=<url> node scripts/smoke.mjs   # private RPC (public RPCs rate-limit)
//
// Builds dist first if missing: `npm run build`.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");
const RPC = process.env.BOARDWALK_RPC ?? "https://mainnet.base.org";
const API = process.env.BOARDWALK_API_URL ?? "https://api.useboardwalk.com";
const W = "0x1111111111111111111111111111111111111111";
const WETH = "0x4200000000000000000000000000000000000006";
const BMX = "0x548f93779fBC992010C07467cBaf329DD5F059B7";
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
      { cwd: ROOT },
      (err, stdout, stderr) => {
        resolve({ code: err?.code ?? 0, stdout, stderr: stderr + (err ? "" : "") });
      },
    );
  });

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function pickTokens() {
  const res = await fetch(`${API}/boardwalk-launches?chainId=8453&limit=25`, {
    headers: { accept: "application/json" },
  });
  const { launches = [] } = await res.json();
  const express = launches.find((l) => l.path === "EXPRESS") ?? launches[0];
  const advanced = launches.find((l) => l.path === "ADVANCED") ?? launches[0];
  if (!express) throw new Error("no Base launches returned from the API");
  return { token: express.token, advancedToken: advanced.token };
}

/** A command + how to judge its result for the chosen launch state. */
function commands({ token, advancedToken }) {
  const ok = (r) => {
    const j = JSON.parse(r.stdout);
    if (!Array.isArray(j.calls) || j.calls.length === 0) return "no calls[]";
    for (const c of j.calls) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(c.to)) return `bad to: ${c.to}`;
      if (!c.data?.startsWith("0x")) return "bad data";
      if (!c.data.includes(BUILDER_CODE_HEX)) return "missing builder code";
      if (typeof c.value !== "string" || c.chainId !== 8453) return "bad value/chainId";
    }
    return null;
  };
  const readOk = (r) => (JSON.parse(r.stdout), null);
  const has = (key) => (r) => (JSON.parse(r.stdout)[key] ? null : `no ${key}`);
  const gracefully = (re) => (r) =>
    r.code !== 0 && re.test(r.stdout + r.stderr)
      ? null
      : `expected error /${re.source}/`;

  return [
    { name: "launch-cost", args: ["launch-cost", "--chain", "base", "--wallet", W, "--rpc", RPC], check: readOk },
    { name: "status", args: ["status", "--token", token, "--chain", "base"], check: readOk },
    { name: "launch-link", args: ["launch-link", "--chain", "base", "--name", "Smoke", "--ticker", "SMOKE", "--category", "meme-culture", "--issuer-fee", W], check: has("url") },
    { name: "launch", args: ["launch", "--chain", "base", "--wallet", W, "--name", "Smoke", "--ticker", "SMOKE", "--category", "meme-culture", "--path", "express", "--issuer-fee", W, "--rpc", RPC], check: ok },
    { name: "launch-metadata", args: ["launch-metadata", "--token", token, "--chain", "base"], check: has("sign") },
    { name: "contribute", args: ["contribute", "--token", token, "--amount", "0.01", "--chain", "base", "--wallet", W, "--rpc", RPC], check: gracefully(/not in presale/i) },
    { name: "claim", args: ["claim", "--token", token, "--chain", "base", "--wallet", W, "--rpc", RPC], check: gracefully(/seeded/i) },
    { name: "refund", args: ["refund", "--token", token, "--chain", "base", "--wallet", W], check: ok },
    { name: "seed-liquidity", args: ["seed-liquidity", "--token", token, "--chain", "base", "--wallet", W], check: ok },
    { name: "stake-bmx", args: ["stake-bmx", "--amount", "100", "--wallet", W, "--chain", "base", "--rpc", RPC], check: ok },
    { name: "unstake-bmx", args: ["unstake-bmx", "--amount", "100", "--wallet", W, "--chain", "base"], check: ok },
    { name: "handle-rewards", args: ["handle-rewards", "--wallet", W, "--chain", "base"], check: ok },
    { name: "vote", args: ["vote", "--option", "1", "--wallet", W, "--chain", "base", "--rpc", RPC], check: gracefully(/voting power|already voted|participation/i) },
    { name: "claim-participation", args: ["claim-participation", "--epochs", "0,1", "--wallet", W, "--chain", "base"], check: ok },
    { name: "claim-issuer-fees", args: ["claim-issuer-fees", "--token", advancedToken, "--recipient-idx", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-referrer-fees", args: ["claim-referrer-fees", "--token", advancedToken, "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-integrator-fees", args: ["claim-integrator-fees", "--token", token, "--min-out", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-vested", args: ["claim-vested", "--token", advancedToken, "--allocation-id", "0", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "cast-visibility", args: ["cast-visibility", "--token", token, "--mode", "boost", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "add-liquidity", args: ["add-liquidity", "--token-a", WETH, "--token-b", BMX, "--amount-a", "0.01", "--amount-b", "100", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "remove-liquidity", args: ["remove-liquidity", "--token", token, "--liquidity", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: gracefully(/no Boardwalk LP pool/i) },
    { name: "stake-lp", args: ["stake-lp", "--token", token, "--amount", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: gracefully(/not seeded|no LP token/i) },
    { name: "unstake-lp", args: ["unstake-lp", "--token", token, "--amount", "1", "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "claim-lp-rewards", args: ["claim-lp-rewards", "--token", token, "--chain", "base", "--wallet", W, "--rpc", RPC], check: ok },
    { name: "swap", args: ["swap", "--token", token, "--amount", "0.01", "--direction", "buy", "--chain", "base", "--wallet", W, "--rpc", RPC], check: gracefully(/no Boardwalk pool/i) },
  ];
}

async function main() {
  const tokens = await pickTokens();
  console.log(`Smoke against Base — express=${tokens.token} advanced=${tokens.advancedToken}\nRPC=${RPC}\n`);
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
