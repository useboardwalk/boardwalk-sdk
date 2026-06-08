---
title: Boardwalk Plugin
description: Launch tokens, contribute to auctions, claim, stake BMX, and vote — via the boardwalk CLI driven through Base MCP's non-custodial wallet.
---

The Boardwalk plugin lets an agent drive the Boardwalk token-launch platform from inside Base MCP. It shells out to the **`boardwalk` CLI (v0.1.0)**, which only ever prints **unsigned** calldata (and, for launch metadata, an EIP-712 payload to sign). The user's Base Account signs and submits — the CLI and the Base MCP server never touch a private key.

> [!IMPORTANT]
> This plugin is **CLI-backed**: it requires shell / terminal access to run `npx @boardwalk/cli …`. Complete the Base MCP onboarding in `SKILL.md` first (wallet connection, `send_calls`, `get_request_status`). If you cannot run shell commands, this plugin will not work.

## Safety Boundary

1. **Never request, store, or accept a private key.** Not as an argument, not as an env var, not in any form.
2. The CLI / SDK **only ever emit unsigned `{to, data, value}` calls** and EIP-712 typed-data payloads. It cannot broadcast.
3. The **user's wallet (Base Account) signs and submits** every transaction.
4. Always pass `--wallet` from `get_wallets`, submit **only** via `send_calls`, and let the user review and approve each request.

## Runner

Invoke the CLI through the shell. Every transaction command prints a JSON object to stdout:

```bash
npx @boardwalk/cli <command> [flags]        # or: boardwalk <command>  (if installed globally)
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
- **`value`** is a decimal **wei** string. For every v1 action it is `"0"` (no native value is ever sent).
- **Reads** (`status`, `launch-cost`) default to a **public RPC**. Override with `--rpc <url>` on any command if you need a specific endpoint.

## Base MCP Conversion

Each element of the printed `calls` array maps **1:1** onto a Base MCP call object:

| CLI `calls[i]` field | `send_calls` field | Notes                                                                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------ |
| `to`                 | `to`               | target contract                                                          |
| `data`               | `data`             | full unsigned calldata (hex)                                             |
| `value`              | `value`            | decimal **wei** string (`"0"` for all v1)                                |
| `chainId`            | (request chain)    | always Base `8453` for stake/vote; per-token for launch/contribute/claim |
| `id` / `label`       | —                  | human context only; not sent on-chain                                    |

**Submit the entire array as ONE batch** to `send_calls`. The conditional approve and the action ride in the same request, so the user signs a single approval. Then poll `get_request_status` until it settles.

## Orchestration

The shape is identical for every on-chain action: **`get_wallets` → run CLI → take `calls` → `send_calls` (one batch) → `get_request_status`.**

### Contribute (multi-chain; only while `status == "presale"`)

1. `get_wallets` → Base Account address (use as `--wallet`).
2. Run the CLI:
   ```bash
   npx @boardwalk/cli contribute --token 0x4C86…BA48 --amount 0.01 --chain base --wallet 0x3666…1CA3
   ```
   Verified output:
   ```json
   {
     "calls": [
       {
         "id": "approve-raise-token",
         "label": "Approve token",
         "to": "0x4200000000000000000000000000000000000006",
         "data": "0x095ea7b3000000000000000000000000de88ff82a8aa7dd1015e554bd3d5431838b63473000000000000000000000000000000000000000000000000002386f26fc10000",
         "value": "0",
         "chainId": 8453
       },
       {
         "id": "contribute",
         "label": "Contribute",
         "to": "0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
         "data": "0xc1cbbca7000000000000000000000000000000000000000000000000002386f26fc10000",
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

### Claim (multi-chain; only after success — `status` is `seeded` / `pending_seed`)

1. `get_wallets`.
2. ```bash
   npx @boardwalk/cli claim --token 0x4C86…BA48 --chain base --wallet 0x3666…1CA3
   ```
   → `calls` = `[ { "id":"claim", … claimTokens calldata … } ]` (single element).
3. `send_calls` the array → `get_request_status`.

### Stake BMX (**Base-only**)

1. `get_wallets`.
2. ```bash
   npx @boardwalk/cli stake-bmx --amount 100 --wallet 0x3666…1CA3 --chain base
   ```
   → `calls` = `[ approve-bmx (conditional), stake-bmx ]`.
3. `send_calls` the batch → `get_request_status`.

### Vote (**Base-only**; options 1–4)

`1 = Treasury`, `2 = Buy & Burn BMX`, `3 = Buy & Burn LP`, `4 = Participation`.

1. `get_wallets`.
2. ```bash
   npx @boardwalk/cli vote --option 1 --wallet 0x3666…1CA3 --chain base
   ```
   Verified output (here `governanceBurnAmount` was `0`, so there is **no** approve step):
   ```json
   {
     "calls": [
       {
         "id": "vote",
         "label": "Cast vote",
         "to": "0x487451487ed87aB447ec12B5627A4ff7c4c4974C",
         "data": "0xb3f98adc0000000000000000000000000000000000000000000000000000000000000001",
         "value": "0",
         "chainId": 8453
       }
     ],
     "action": "vote",
     "option": 1
   }
   ```
   (If the burn is `> 0`, element `[0]` is `approve-bmx` and you submit both.)
3. `send_calls` the array → `get_request_status`.

### Read-only helpers (no submission)

```bash
# status — verified (Base, token BARRY):
npx @boardwalk/cli status --token 0x4C86…BA48 --chain base
# → { "token":"0x4C867B5320760BE4AD944222178FC3D344d1BA48", "chainId":8453,
#     "status":"presale", "path":"ADVANCED",
#     "presaleManager":"0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
#     "raiseToken":"0x4200000000000000000000000000000000000006", "seeded":false }

# launch-cost — verified (Base):
npx @boardwalk/cli launch-cost --chain base --wallet 0x3666…1CA3
# → { "chainId":8453, "baseBurn":"100000000000000000000",
#     "discountBps":"5000", "isMember":false, "bmxBurnCost":"100000000000000000000" }
```

`launch-cost` tells you the **BMX burn** required for a launch up front (`bmxBurnCost`, wei). The Boardwalk NFT is **not** required to launch — `isMember: true` only applies a discount (`discountBps`).

## Launching a token

A launch is a multi-leg flow. The on-chain creation (legs a–c) is sufficient on its own; metadata (legs d–f) is an off-chain enrichment and may be skipped.

1. **(a) Get the wallet.** `get_wallets` → use as `--wallet`.
2. **(b) Create the launch on-chain.**
   ```bash
   npx @boardwalk/cli launch --chain base --wallet 0x3666…1CA3 \
     --name "Agent Test Token" --ticker AGENTX --category meme-culture \
     --path express --issuer-fee 0x3666…1CA3
   ```
   Verified shape:
   ```jsonc
   // calls = [
   //   { "id":"approve-bmx",    "to":"0x548f93779fBC992010C07467cBaf329DD5F059B7", "data":"0x095ea7b3…", "value":"0", "chainId":8453 },
   //   { "id":"create-launch",  "to":"0x0a818F0B6fB245AFB0eAE7b09CB2ef0a9D50Bce7", "data":"0x8e04750d…", "value":"0", "chainId":8453 }
   // ]
   // meta: { "bmxBurnCost":"100000000000000000000", "config": <the createLaunch tuple>, "note": … }
   ```
   `send_calls` the **`[approve-bmx, create-launch]`** batch → `get_request_status`. Requires enough BMX to cover `bmxBurnCost`. Use `--presale-percent`, `--referrer`, `--description`, `--builder-code` etc. as needed; `--path` defaults sensibly (express = 24h, advanced = 7d).
3. **(c) Read the new token address.** From the confirmed `create-launch` transaction receipt, parse the **`LaunchCreated`** event log to extract the freshly deployed token address. Use that address for all subsequent legs.
4. **(d) Build the metadata payload** (uploads the logo to the CDN, then returns what to sign):
   ```bash
   npx @boardwalk/cli launch-metadata --token <newToken> --chain base \
     --logo ./logo.png            # or --logo-data <base64|dataURL>  or --logo-url <url> \
     --twitter myhandle --homepage https://… --description "…" --raise-goal 50
   ```
   Returns `{ sign: { domain, types, primaryType, message }, submit: { method, path, body }, note }`.
5. **(e) Sign the EIP-712 typed data.** Sign the returned `sign` object (`domain` / `types` / `primaryType` / `message`) with the **issuer** Base Account via Base MCP's typed-data signing → a `0x…` signature.
6. **(f) Submit the signed metadata:**
   ```bash
   npx @boardwalk/cli submit-metadata --token <newToken> --chain base \
     --signature 0x<sig> --message '<wireMessage-json>'
   ```
   This POSTs the signed metadata and **auto-retries on 404** to ride out backend indexer lag.

> The launch is **valid on-chain even if you stop after leg (c)** — metadata (logo, socials, description) is purely off-chain enrichment and can be added later.

## Chains & attribution

| Chain    | id   | launch / contribute / claim | stake-bmx / vote |
| -------- | ---- | --------------------------- | ---------------- |
| **base** | 8453 | ✅ (full feature parity)    | ✅ Base-only     |
| ethereum | 1    | ✅                          | ❌               |
| fraxtal  | 252  | ✅                          | ❌               |
| katana   | —    | ✅                          | ❌               |
| ink      | —    | ✅                          | ❌               |

- **Base is the only chain with full feature parity.** `stake-bmx` and `vote` are **Base-only** — the contracts are placeholders elsewhere and the CLI errors clearly if you target another chain.
- **Attribution:** pass `--builder-code <code>` (or set `BOARDWALK_BUILDER_CODE`) on any tx command. The SDK appends an **ERC-8021 data-suffix** to the calldata, so volume submitted through the agent's own wallet is still attributable.

## Slippage / safety warnings

- **State-gated actions.** `contribute` is only valid while `status == "presale"`; `claim` is only valid after success (`status` is `seeded` / `pending_seed`). Run `status` first if unsure.
- **The CLI fails loudly** on the wrong state (e.g. contributing to a non-presale launch) and on undeployed chains (e.g. `stake-bmx`/`vote` off Base) — surface that error to the user rather than retrying blindly.
- **On-chain prerequisites** are hard requirements: enough **BMX** to launch / vote (when burn `> 0`); enough **raise token** to contribute; and the wallet on the correct chain. There is **no** Privy / login step for on-chain actions — only the wallet signature.
- **No native value is ever sent** (`value` is always `"0"`), so there is no ETH-spend surprise; the only transfers are ERC-20 approvals plus the action itself.
