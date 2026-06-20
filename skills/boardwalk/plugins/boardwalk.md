---
title: Boardwalk Plugin
description: Launch tokens, contribute to auctions, claim, stake BMX, and vote — via the boardwalk CLI driven through Base MCP's non-custodial wallet; or generate a prefilled launch link when no shell is available.
---

The Boardwalk plugin lets an agent drive the Boardwalk token-launch platform from inside Base MCP. It shells out to the **`boardwalk` CLI (v0.3.0)**, which only ever prints **unsigned** calldata (and, for launch metadata, an EIP-712 payload to sign). The user's Base Account signs and submits — the CLI and the Base MCP server never touch a private key.

> [!IMPORTANT]
> **Shell available → drive the `boardwalk` CLI** (below): unsigned calldata → `send_calls`. **No shell (plain chat, no terminal) → emit a prefilled launch link instead:** generate a `…/launch?path=…&prefill=…` URL — with `boardwalk launch-link` where a shell exists, or `buildLaunchLink` from `@useboardwalk/sdk` (a pure function, no tools) — and hand it to the user; the launch UI collects the logo and signs/submits. The link path needs no tools, so it works anywhere, but it covers **launch** only (contribute/claim/stake/vote require the CLI + a signer). For the CLI path, complete the Base MCP onboarding in `SKILL.md` first (wallet connection, `send_calls`, `get_request_status`).
>
> **Decision: shell → CLI; no shell → emit the prefilled link.**

## Safety Boundary

1. **Never request, store, or accept a private key.** Not as an argument, not as an env var, not in any form.
2. The CLI / SDK **only ever emit unsigned `{to, data, value}` calls** and EIP-712 typed-data payloads. It cannot broadcast.
3. The **user's wallet (Base Account) signs and submits** every transaction.
4. Always pass `--wallet` from `get_wallets`, submit **only** via `send_calls`, and let the user review and approve each request.

## Runner

Invoke the CLI through the shell. Every transaction command prints a JSON object to stdout:

```bash
boardwalk <command> [flags]                          # after: npm i -g @useboardwalk/sdk
npx -p @useboardwalk/sdk boardwalk <command> [flags]    # …or zero-install
```

```jsonc
{
  "calls": [
    {
      "id": "approve-…",
      "label": "…",
      "to": "0x…",
      "data": "0x…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "<action>",
      "label": "…",
      "to": "0x…",
      "data": "0x…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  // …per-command meta (action, token, amounts, config, bmxBurnCost, etc.)
}
```

- **`calls` is an ORDERED array.** When an ERC-20 allowance is insufficient, a conditional **approve** is element `[0]` and the action follows. Feed the **whole array** to one batched submit so the user approves once.
- Every call's `data` ends with Boardwalk's **enforced ERC-8021 builder-code suffix** — submit `data` exactly as printed.
- **`value`** is a decimal **wei** string. For every v1 action it is `"0"` (no native value is ever sent).
- **Reads** (`status`, `launch-cost`) default to a **public RPC**. Public RPCs **rate-limit** — on a 429 / timeout, retry with `--rpc <url>` pointing at a dedicated endpoint (only Base has a built-in default).

## Base MCP Conversion

Each element of the printed `calls` array maps **1:1** onto a Base MCP call object:

| CLI `calls[i]` field | `send_calls` field | Notes                                                                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------ |
| `to`                 | `to`               | target contract                                                          |
| `data`               | `data`             | full unsigned calldata (hex)                                             |
| `value`              | `value`            | decimal **wei** string (`"0"` for all v1)                                |
| `chainId`            | (request chain)    | always Base `8453` for stake/vote; per-token for launch/contribute/claim |
| `id` / `label`       | —                  | human context only; not sent on-chain                                    |

**Submit the entire array as ONE batch** to `send_calls`. The conditional approve and the action ride in the same request, so the user signs a single approval. Then poll **`get_request_status`** (not `get_call_status`) until it settles.

These tool names are **examples** of Base MCP capabilities — use whatever your harness exposes: **`get_wallets`** for the `--wallet` address, **`send_calls`** (EIP-5792 batch) to submit, **typed-data signing** for the launch-metadata leg (a capability, not a fixed tool name), and **`web_request`** to hit read endpoints or cold-load these docs (e.g. `https://www.useboardwalk.com/llms.txt`).

## Orchestration

The shape is identical for every on-chain action: **`get_wallets` → run CLI → take `calls` → `send_calls` (one batch) → `get_request_status`.**

### Contribute (multi-chain; only while `status == "presale"`)

1. `get_wallets` → Base Account address (use as `--wallet`).
2. Run the CLI:
   ```bash
   boardwalk contribute --token 0x4C86…BA48 --amount 0.01 --chain base --wallet 0x3666…1CA3
   ```
   Verified output:
   ```json
   {
     "calls": [
       {
         "id": "approve-raise-token",
         "label": "Approve token",
         "to": "0x4200000000000000000000000000000000000006",
         "data": "0x095ea7b3…",
         "value": "0",
         "chainId": 8453
       },
       {
         "id": "contribute",
         "label": "Contribute",
         "to": "0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
         "data": "0xc1cbbca7…",
         "value": "0",
         "chainId": 8453
       }
     ],
     "action": "contribute",
     "token": "0x4C867B5320760BE4AD944222178FC3D344d1BA48",
     "amount": "10000000000000000",
     "raiseToken": "0x4200000000000000000000000000000000000006"
   }
   ```
3. Take `calls` and submit the **two-element batch** (`approve-raise-token` + `contribute`) via `send_calls`.
4. Poll `get_request_status`.

> Tip: run `status --token … --chain …` first to confirm `status` is `"presale"` (see verified output below) before contributing.

### Claim (multi-chain; only after the auction is **seeded** AND the **7-day post-seed cliff** has ended)

1. `get_wallets`.
2. ```bash
   boardwalk claim --token 0x4C86…BA48 --chain base --wallet 0x3666…1CA3   # opt: --rpc <url>
   ```
   → `calls` = `[ { "id":"claim", … claimTokens calldata … } ]` (single element).
   The CLI gates on `status === "seeded"` (**not** `pending_seed`) then reads `PresaleManager.cliffEnd()`; until the 7-day post-seed cliff has passed it **refuses to emit calldata** and surfaces the `cliffEnd` timestamp instead of returning a doomed/reverting tx. On success the output includes `cliffEnd`.
3. `send_calls` the array → `get_request_status`.

### Stake BMX (**Base-only**)

1. `get_wallets`.
2. ```bash
   boardwalk stake-bmx --amount 100 --wallet 0x3666…1CA3 --chain base
   ```
   → `calls` = `[ approve-bmx (conditional), stake-bmx ]`.
3. `send_calls` the batch → `get_request_status`.

### Vote (**Base-only**; options 1–4)

`1 = Treasury`, `2 = Buy & Burn BMX`, `3 = Buy & Burn LP`, `4 = Participation`.

1. `get_wallets`.
2. ```bash
   boardwalk vote --option 1 --wallet 0x3666…1CA3 --chain base
   ```
   Verified output (here `governanceBurnAmount` was `0`, so there is **no** approve step):
   ```json
   {
     "calls": [
       {
         "id": "vote",
         "label": "Cast vote",
         "to": "0x487451487ed87aB447ec12B5627A4ff7c4c4974C",
         "data": "0xb3f98adc…",
         "value": "0",
         "chainId": 8453
       }
     ],
     "action": "vote",
     "option": 1
   }
   ```
   (If the burn is `> 0`, element `[0]` is `approve-bmx` and you submit both.)
   The CLI pre-checks eligibility onchain and **refuses to emit calldata** when the wallet has already voted this epoch, has no voting power (no staked BMX — stake via `stake-bmx` first), or its staked multiplier points are below the 1.5%-of-staked-BMX participation gate (compound points first). Surface the error; don't retry as-is.
3. `send_calls` the array → `get_request_status`.

### Read-only helpers (no submission)

```bash
# status — verified (Base, token BARRY):
boardwalk status --token 0x4C86…BA48 --chain base
# → { "token":"0x4C867B5320760BE4AD944222178FC3D344d1BA48", "chainId":8453,
#     "status":"presale", "path":"ADVANCED",
#     "presaleManager":"0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
#     "raiseToken":"0x4200000000000000000000000000000000000006", "seeded":false }

# launch-cost — verified (Base):
boardwalk launch-cost --chain base --wallet 0x3666…1CA3
# → { "chainId":8453, "baseBurn":"100000000000000000000",
#     "discountBps":"5000", "isMember":false, "bmxBurnCost":"100000000000000000000" }
```

`launch-cost` tells you the **BMX burn** required for a launch up front (`bmxBurnCost`, wei). The Boardwalk NFT is **not** required to launch — `isMember: true` only applies a discount (`discountBps`).

### More actions (v0.3)

The CLI also covers the rest of the Boardwalk surface — all with the same flow (**`get_wallets` → run CLI → `send_calls` the batch → `get_request_status`**) and the same `{ calls, …meta }` output. The fee/vesting/LP commands take only `--token` and resolve the per-launch contract on-chain.

```bash
# presale lifecycle
boardwalk refund         --token 0x… --chain base --wallet 0xYou    # status == failed
boardwalk seed-liquidity --token 0x… --chain base --wallet 0xYou
# BMX staking (Base-only)
boardwalk unstake-bmx    --amount 100 --wallet 0xYou
boardwalk handle-rewards --wallet 0xYou                             # no flags = claim all
# fee / vesting / participation claims
boardwalk claim-issuer-fees     --token 0x… --recipient-idx 0 --chain base --wallet 0xYou [--min-out --deadline]
boardwalk claim-referrer-fees   --token 0x… --chain base --wallet 0xYou
boardwalk claim-integrator-fees --token 0x… --chain base --wallet 0xYou [--slippage-bps 50]
boardwalk claim-vested          --token 0x… --allocation-id 0 --chain base --wallet 0xYou
boardwalk claim-participation   --epochs 0,1,2 --wallet 0xYou       # Base-only
# visibility (burns BMX)
boardwalk cast-visibility --token 0x… --mode boost|deboost --chain base --wallet 0xYou
# Boardwalk LP
boardwalk add-liquidity    --token-a 0xWETH --token-b 0xBMX --amount-a 0.01 --amount-b 100 --chain base --wallet 0xYou [--slippage-bps 50]
boardwalk remove-liquidity --token 0x… --liquidity 1 --chain base --wallet 0xYou [--slippage-bps 50]
boardwalk stake-lp         --token 0x… --amount 1 --chain base --wallet 0xYou
boardwalk unstake-lp       --token 0x… --amount 1 --chain base --wallet 0xYou
boardwalk claim-lp-rewards --token 0x… --chain base --wallet 0xYou
# swap (Boardwalk DEX, single-hop launch↔raise token)
boardwalk swap --token 0x… --amount 0.01 --direction buy|sell --chain base --wallet 0xYou [--slippage-bps 50]
```

Base-only: `unstake-bmx`, `handle-rewards`, `claim-participation` (alongside `stake-bmx`/`vote`). State gates: `refund` needs `status == failed`; `swap`/LP/`stake-lp` need a **seeded** launch (the CLI errors `no Boardwalk pool` / `not seeded` otherwise). See `SKILL.md` for the full per-command flag and validation reference.

### Launch link (shell-less — no `send_calls`)

When you **can't** run a shell, you can still start a launch: emit a prefilled link. There's no `get_wallets` and no `send_calls` here — just produce the URL and hand it over.

- With a shell: `boardwalk launch-link --chain base --name "My Token" --ticker MYT --category meme-culture --issuer-fee 0xYou` → `{ url, prefill, … }`.
- Without a shell: call `buildLaunchLink(input)` from `@useboardwalk/sdk` (a pure function, no tools) for the same URL.

The user opens `url`, the Boardwalk UI loads the launch **summary** prefilled, and they add a logo + sign in the UI. POST/metadata payloads can't be pasted on a shell-less surface, so the link hands that off to the UI. **Launch only** — contribute/claim/stake/vote still need the CLI + a signer.

## Launching a token

A launch is a multi-leg flow. Legs (a)–(c) create the token on-chain; legs (d)–(f) attach its public metadata (name, logo, socials). **Always complete (d)–(f) once the create-launch tx confirms** — a launch with no metadata shows on the Boardwalk UI with no name or logo and reads as broken to everyone who finds it, so metadata is a required part of every launch, not an optional add-on. **On a shell-less surface, emit a `launch-link` URL instead of running (a)–(f)** — the UI then collects the logo and submits the metadata for the user.

1. **(a) Get the wallet.** `get_wallets` → use as `--wallet`.
2. **(b) Create the launch on-chain.**

   ```bash
   boardwalk launch --chain base --wallet 0x3666…1CA3 \
     --name "Agent Test Token" --ticker AGENTX --category meme-culture \
     --path express --issuer-fee 0x3666…1CA3
   ```

   Verified shape:

   ```jsonc
   // calls = [
   //   { "id":"approve-bmx",    "to":"0x548f93779fBC992010C07467cBaf329DD5F059B7", "data":"0x095ea7b3…", "value":"0", "chainId":8453 },
   //   { "id":"create-launch",  "to":"0x0a818F0B6fB245AFB0eAE7b09CB2ef0a9D50Bce7", "data":"0x8e04750d…", "value":"0", "chainId":8453 }
   // ]
   // plus top-level (siblings of calls): "bmxBurnCost":"100000000000000000000", "config": <the createLaunch tuple>,
   //         "graduationThreshold": { "wei":"…", "display":"…" }, "next": … }
   ```

   `send_calls` the **`[approve-bmx, create-launch]`** batch → `get_request_status`. Requires enough BMX to cover `bmxBurnCost`. Use `--presale-percent`, `--referrer`, `--description` etc. as needed; `--path` defaults sensibly (express = 24h, advanced = 7d). On the express path `--issuer-fee <address>` is **required** (exactly one recipient, receives 100% of the issuer fee).

   **Advanced-path params** (`--path advanced`):
   - `--fee <label:address:percent>` — the issuer-fee split across recipients; **repeatable**, labels: `individual` | `entity` | `publicGood` | `growthTeam`. **At least one is required** for advanced.
   - `--vesting <label:address:percent>` — token vesting recipients; **repeatable**, labels: `individual` | `entity` | `referrer` | `publicGood` | `growthTeam`. **Required when `--presale-percent` < 50; not allowed at 50.**
   - `--presale-percent` is **25–50 in steps of 5**.

   Advanced example:

   ```bash
   boardwalk launch --chain base --wallet 0xYou \
     --name "My Token" --ticker MYT --category ai-agents \
     --path advanced --presale-percent 40 \
     --fee individual:0xYou:60 --fee entity:0xCo:40 \
     --vesting individual:0xYou:100
   ```

3. **(c) Capture the create-launch tx hash** from the `send_calls` result. You do **not** parse event logs — the next command resolves the token from the receipt for you.
4. **(d) Resolve the token + build the metadata payload** (reads the token from the tx, uploads the logo, returns what to sign):

   ```bash
   boardwalk launch-metadata --tx 0x<create-launch tx hash> --chain base \
     --logo ./logo.png            # or --logo-data <base64|dataURL>  or --logo-url <url> \
     --twitter myhandle --homepage https://… --description "…" --raise-goal 50
   ```

   Returns `{ token, auctionUrl, sign: { domain, types, primaryType, message }, next }`. Use `token` for the rest. (Already have the token? Use `--token <addr>` instead of `--tx`.)

   For advanced launches, set `--raise-goal` **above the chain's graduation threshold** (which the `launch` output surfaces as the top-level `graduationThreshold`); the CLI validates this and errors otherwise. Thresholds: **10 wETH** on Base / Mainnet / Ink, **20000 frxUSD** on Fraxtal, **2000000 KAT** on Katana.

5. **(e) Sign the EIP-712 typed data.** Sign the returned `sign` object (`domain` / `types` / `primaryType` / `message`) with the **issuer** Base Account via Base MCP's typed-data signing → a `0x…` signature.
6. **(f) Submit the signed metadata:**
   ```bash
   boardwalk submit-metadata --token 0x<token> --chain base \
     --signature 0x<sig> --message '<sign.message JSON>'
   ```
   This POSTs the signed metadata and **auto-retries on 404** to ride out backend indexer lag (a fresh launch takes a few seconds to register).

> The token is live on-chain after leg (c), but **don't stop there** — until legs (d)–(f) land, the Boardwalk UI shows it with no name, logo, or socials. Always finish the metadata flow once the launch tx confirms.

## Chains & attribution

| Chain    | id   | launch / contribute / claim | stake-bmx / vote |
| -------- | ---- | --------------------------- | ---------------- |
| **base** | 8453 | ✅ (full feature parity)    | ✅ Base-only     |
| ethereum | 1    | ✅                          | ❌               |
| fraxtal  | 252  | ✅                          | ❌               |
| katana   | —    | ✅                          | ❌               |
| ink      | —    | ✅                          | ❌               |

- **Base is the only chain with full feature parity.** Base-only commands: `stake-bmx`, `unstake-bmx`, `handle-rewards`, `claim-participation`, and `vote` — the contracts are placeholders elsewhere and the CLI errors clearly if you target another chain. The other v0.3 actions (refund, seed-liquidity, fee/vesting claims, cast-visibility, LP, swap) are multi-chain.
- **Attribution is automatic & enforced:** every built transaction carries Boardwalk's **ERC-8021 data-suffix** on its calldata, so volume submitted through the agent's own wallet is attributed. There is no flag to set.

## Slippage / safety warnings

- **State-gated actions.** `contribute` is only valid while `status == "presale"`; `claim` is only valid after the auction is **seeded** AND the **7-day post-seed cliff** has ended. Run `status` first if unsure.
- **The CLI fails loudly** on the wrong state (e.g. contributing to a non-presale launch) and on undeployed chains (e.g. `stake-bmx`/`vote` off Base) — surface that error to the user rather than retrying blindly.
- **On-chain prerequisites** are hard requirements: enough **BMX** to launch / vote (when burn `> 0`); enough **raise token** to contribute; and the wallet on the correct chain. There is **no** Privy / login step for on-chain actions — only the wallet signature.
- **No native value is ever sent** (`value` is always `"0"`), so there is no ETH-spend surprise; the only transfers are ERC-20 approvals plus the action itself.

## Docs & loading

- **Concepts** (auction mechanics, fee model, governance/voting): <https://www.useboardwalk.com/docs> and <https://www.useboardwalk.com/llms.txt> — fetch with `web_request` if you need them.
- This plugin is **self-contained and loadable cold** (e.g. via `web_request`) from a stable public URL: it names no local paths, needs no secrets, and assumes no chat-pasted image bytes. Host it at `plugins/boardwalk.md` alongside `SKILL.md`.
- **Non-custodial by construction:** the CLI/SDK only emit unsigned calldata + EIP-712 payloads, and the prefilled-link path signs in the user's UI — no private key ever leaves the user's wallet.
