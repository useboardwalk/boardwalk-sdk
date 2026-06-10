---
name: boardwalk
description: >-
  Build and submit onchain Boardwalk actions from natural language: launch a token, contribute to / join a presale auction, claim presale tokens after a successful launch, stake BMX, vote on fee direction, and check launch status or cost. Boardwalk is a fee-protection token-launch platform (permanently-locked liquidity + a built-in swap-fee equivalent). This skill drives the boardwalk CLI (npm package @useboardwalk/sdk), which prints UNSIGNED transaction calldata (and EIP-712 payloads to sign) — the user's own wallet signs and submits. Works on Base (full feature parity) plus Ethereum, Fraxtal, Katana, and Ink (launch/contribute/claim); stake-bmx and vote are Base-only. Use whenever a user wants to create, fund, or manage a Boardwalk launch onchain. With a shell it drives the CLI; with no shell (plain chat) it generates a prefilled launch link the user opens in the Boardwalk UI.
metadata:
  homepage: https://www.useboardwalk.com
---

# Boardwalk

**Boardwalk** is a fee-protection token-launch platform. Every token launched on Boardwalk gets **permanently-locked liquidity** (the LP can never be pulled) plus a **built-in swap-fee equivalent** that routes ongoing trading fees back to the issuer, BMX stakers, liquidity, and platform participation — so creators keep earning after launch and buyers are protected from rug pulls. Launches run as fixed-window **presale auctions**: contributors deposit a raise token (e.g. WETH) during the presale, and on a successful close the contract seeds permanent liquidity and lets contributors claim their tokens.

This skill is the **executable layer** for Boardwalk. It drives the `boardwalk` CLI (the `@useboardwalk/sdk` npm package), which turns a natural-language intent into **UNSIGNED transaction calldata** — an ordered array of `{to, data, value}` calls (plus, for launch metadata, an **EIP-712** payload to sign). The CLI never touches a private key. **The user's wallet signs and submits.**

> **Conceptual docs** (auction mechanics, the fee model, governance/voting, vesting) live at
> <https://www.useboardwalk.com/docs> and <https://www.useboardwalk.com/llms.txt>.
> This skill covers **how to execute** those actions onchain.

---

## Two ways to drive Boardwalk

**Shell available → use the `boardwalk` CLI.** It prints unsigned calldata your wallet signs and submits (the rest of this doc): launch, contribute, claim, stake, vote, and metadata.

**No shell (plain chat, no terminal) → emit a prefilled launch link.** `boardwalk launch-link …` (or `buildLaunchLink` from `@useboardwalk/sdk`) returns a `…/launch?path=…&prefill=…` URL. The user opens it, the Boardwalk UI loads the launch summary fully prefilled, then they add a logo, connect a wallet, and sign — all in the UI. No tools required, so it works on any surface.

> **Decision: shell → CLI; no shell → emit the prefilled link.** The link covers **launch** only; contribute, claim, stake, and vote need the CLI and a signer.

---

## Install & run

```bash
boardwalk <command> [flags]                          # after: npm i -g @useboardwalk/sdk
npx -p @useboardwalk/sdk boardwalk <command> [flags]    # …or zero-install
```

- The CLI is **v0.1.0** (bin `boardwalk`, package `@useboardwalk/sdk`). Reads use a public RPC by default; **public RPCs rate-limit — on a 429 / timeout, retry with `--rpc <url>`** pointing at a dedicated endpoint (only Base has a built-in default RPC).
- The user supplies their own wallet address with `--wallet <addr>` (BYO wallet — get it from your harness, e.g. Base MCP `get_wallets`). The CLI builds calldata **for** that address; it never asks for a key.
- **Every transaction command prints JSON** of this shape:

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
  // …action-specific meta (bmxBurnCost, config, raiseToken, option, …)
}
```

- `calls` is an **ORDERED array**. When an ERC-20 allowance is insufficient, a **conditional approve is element 0** and the action follows. Feed the **whole array** to a batched submit so the user approves once. If the allowance is already sufficient, the approve step is **omitted** and you get just the action call.
- Every call's `data` ends with Boardwalk's **enforced ERC-8021 builder-code suffix** — submit `data` exactly as printed.
- `value` is a **decimal wei string** and is `"0"` for **every** v1 action (no native value is ever attached).
- Read commands (`status`, `launch-cost`) print a plain JSON object (no `calls`).

---

## Safety boundary

This posture is non-negotiable:

1. **Never request, store, or accept a private key** — not from the user, not anywhere.
2. The CLI/SDK only ever emit **UNSIGNED** `{to, data, value}` calls and **EIP-712** typed-data payloads.
3. The **user's wallet** (e.g. their Base Account) signs and submits everything.
4. Pass `--wallet` from the user's connected address (e.g. Base MCP `get_wallets`); submit only via the user's signer (e.g. Base MCP `send_calls`); let the **user review and approve** before anything lands onchain.

There is **no login** required for onchain actions — no Privy, no session. The only hard prerequisites are onchain (see each command).

---

## Command reference

| Command           | What it does                                                                   | Key flags                                                                                                                                                                                                                             | Chain scope   |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `launch`          | Create a launch: emits conditional BMX approve + `create-launch`               | `--chain --wallet --name --ticker --category` · opt: `--path --description --issuer-fee --rpc` · advanced: `--presale-percent --referrer --fee <label:address:percent>` (repeatable) `--vesting <label:address:percent>` (repeatable) | multi-chain   |
| `launch-metadata` | Upload logo to CDN, then print an EIP-712 payload to sign + the submit request | `--token --chain` · logo: `--logo \| --logo-data \| --logo-url` · opt: `--twitter --discord --telegram --homepage --video --description --raise-goal --tos-uri --tos-version`                                                         | multi-chain   |
| `submit-metadata` | POST the signed metadata (auto-retries on 404 for indexer lag)                 | `--token --chain --signature --message`                                                                                                                                                                                               | multi-chain   |
| `contribute`      | Join a presale: conditional raise-token approve + `contribute`                 | `--token --amount --chain --wallet` · opt: `--rpc`                                                                                                                                                                                    | multi-chain   |
| `claim`           | Claim presale tokens (only after seeded + 7-day post-seed cliff)               | `--token --chain --wallet` · opt: `--rpc`                                                                                                                                                                                             | multi-chain   |
| `stake-bmx`       | Stake BMX: conditional BMX approve + `stake-bmx`                               | `--amount --wallet` · opt: `--chain base --rpc`                                                                                                                                                                                       | **Base only** |
| `vote`            | Vote on fee direction (optional BMX approve if burn>0) + `vote`                | `--option <1-4> --wallet` · opt: `--chain base --rpc`                                                                                                                                                                                 | **Base only** |
| `launch-cost`     | Read the BMX burn cost to launch (with member discount)                        | `--chain --wallet` · opt: `--rpc`                                                                                                                                                                                                     | read-only     |
| `status`          | Read a launch's status / path / presale manager / raise token                  | `--token --chain`                                                                                                                                                                                                                     | read-only     |

`--amount` is in **human units** (e.g. `0.01` WETH, `100` BMX); the CLI scales to wei. Categories are slugs (e.g. `meme-culture`). `--option` for `vote`: **1 = Treasury, 2 = Buy & Burn BMX, 3 = Buy & Burn LP, 4 = Participation**. There is also a shell-free **`launch-link`** command (below) that emits a prefilled `/launch` URL instead of calldata.

---

## Validate before you call

Check inputs **before** invoking the CLI — bad input wastes a round-trip or builds a tx that reverts. The CLI re-checks all of this and exits non-zero with a one-line `Error: …`, so on a failure read the message, fix the one input, and retry (don't loop blindly).

| Input | Rule |
| --- | --- |
| Addresses (`--wallet --token --issuer-fee --referrer`, fee/vesting addresses) | valid 20-byte EIP-55 hex (`isAddress`) |
| `--chain` | one of `base`, `ethereum`, `fraxtal`, `katana`, `ink` (or its numeric id) |
| `--amount` (`contribute`, `stake-bmx`) | a number **> 0**, in human units |
| `--option` (`vote`) | integer **1–4** |
| `--category` | a launch slug: `meme-culture, gaming, creator-media, protocol-defi, infra-tools, app-consumer, nft-collectibles, community, ai-agents, public-goods, other` |
| `--presale-percent` (advanced) | integer **25–50, divisible by 5** |
| `--fee` / `--vesting` (advanced) | `<label>:<address>:<percent>`, percent **> 0**. Advanced needs **≥1 `--fee`**; **`--vesting` is required when presale < 50**. Labels — fee: `individual\|entity\|publicGood\|growthTeam`; vesting also allows `referrer` |
| `--raise-goal` (advanced metadata / link) | **strictly greater** than the chain's graduation threshold (the `launch` output surfaces it as `graduationThreshold`, a top-level field) |
| `--tx` (`launch-metadata`) | matches `^0x[0-9a-fA-F]{64}$` |
| `--signature` (`submit-metadata`) | `0x`-prefixed hex |
| `--message` (`submit-metadata`) | the exact `sign.message` JSON from `launch-metadata` (must parse) |

### Pre-flight gates (read state first)

- **`contribute`** → run `status`; require `status === "presale"` and a non-null `presaleManager`, and confirm the wallet holds **≥ amount** of `raiseToken`.
- **`claim`** → run `status`; require `status === "seeded"`. The CLI then checks the 7-day post-seed cliff and **either** emits the `claim` call **or** refuses with a `cliffEnd` timestamp — surface the unlock time, don't retry before it.
- **`launch` / `vote`** → check the wallet's BMX balance covers the burn (`launch-cost` gives `bmxBurnCost`; `vote` only burns when `governanceBurnAmount > 0`).
- **All** → the wallet must be on the **right chain**; `stake-bmx` and `vote` are **Base-only**.

---

### `launch` — create a token launch

Builds the launch transaction. Boardwalk requires **burning BMX** to launch (the burn cost is discounted for Boardwalk NFT members — the NFT is **not** required, it only lowers the cost). The CLI emits a conditional `approve-bmx` (so the launch contract can pull the burn) followed by `create-launch`. Alongside `calls`, the output carries `bmxBurnCost` (wei) and the full `config` tuple passed to `createLaunch`.

- **Paths:** `--path express` (24-hour auction, simpler fees, fully distributed supply) or `--path advanced` (7-day auction, customizable fee breakdown + token vesting).
- **Prereqs:** the wallet holds **≥ bmxBurnCost** BMX, on the right chain.
- **Advanced-path params:**
  - `--fee <label:address:percent>` (**repeatable**) — the issuer-fee split across recipients; valid labels: `individual` | `entity` | `publicGood` | `growthTeam`. **At least one is required** for `--path advanced`.
  - `--vesting <label:address:percent>` (**repeatable**) — token vesting recipients; valid labels: `individual` | `entity` | `referrer` | `publicGood` | `growthTeam`. **Required when `--presale-percent` < 50.**
  - `--presale-percent` is **25–50 in steps of 5**.
- The `launch` output includes `graduationThreshold { wei, display }` (top-level, alongside `calls`).
- **Metadata is required:** once the `create-launch` tx confirms, always complete the **Launch metadata sub-flow** below. A launch with no metadata appears on the Boardwalk UI with no name, logo, or socials — finish it on every launch.

```bash
boardwalk launch \
  --chain base --wallet 0x3666…1CA3 \
  --name "Agent Test Token" --ticker AGENTX \
  --category meme-culture --path express \
  --issuer-fee 0x3666…1CA3
```

```bash
# advanced path: issuer-fee split + vesting (presale-percent < 50 requires vesting)
boardwalk launch --chain base --wallet 0xYou \
  --name "My Token" --ticker MYT --category ai-agents \
  --path advanced --presale-percent 40 \
  --fee individual:0xYou:60 --fee entity:0xCo:40 \
  --vesting individual:0xYou:100
```

```jsonc
// verified output (truncated calldata shown as printed):
{
  "calls": [
    {
      "id": "approve-bmx",
      "to": "0x548f93779fBC992010C07467cBaf329DD5F059B7",
      "data": "0x095ea7b3…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "create-launch",
      "to": "0x0a818F0B6fB245AFB0eAE7b09CB2ef0a9D50Bce7",
      "data": "0x8e04750d…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  // plus top-level (siblings of `calls`): bmxBurnCost: "100000000000000000000", config: <createLaunch tuple>, graduationThreshold: { wei, display }, next
}
```

#### Launch metadata sub-flow (name/logo/socials) — required after every launch

Once the `create-launch` tx confirms, **always** attach the token's public metadata — never stop at the on-chain leg. A launch with no metadata appears on the Boardwalk UI with no name, logo, or socials and reads as broken to anyone who finds it, so treat this as a required part of the launch, not an optional extra. It's a **three-step** flow because the metadata is gated by an issuer **EIP-712 signature**:

1. **`launch-metadata --tx <create-launch tx hash>`** — resolves the launched **token** from the tx receipt (no log-parsing), uploads the logo to the CDN, and prints `{ token, auctionUrl, sign, next }`.
   - `sign` is the EIP-712 typed data: `{ domain, types, primaryType, message }`.
   - **Logo** is provided one of three ways: `--logo <file>`, `--logo-data <base64-or-dataURL>`, or `--logo-url <url>`.
   - Other fields: `--twitter --discord --telegram --homepage --video --description --raise-goal --tos-uri --tos-version`. (Already have the token address? Use `--token <addr>` instead of `--tx`.)
   - **`--raise-goal` (advanced) must EXCEED the chain's graduation threshold** — the CLI validates it and errors otherwise. Thresholds: **10 wETH** on Base / Mainnet / Ink, **20000 frxUSD** on Fraxtal, **2000000 KAT** on Katana. Set advanced `--raise-goal` above the graduation threshold (which the `launch` output surfaces as the top-level `graduationThreshold`).
2. **Sign** the `sign` payload (EIP-712 typed-data signing) with the **issuer wallet** — the same wallet that launched. (Base MCP can sign typed data.)
3. **`submit-metadata`** — POSTs the signed metadata. Pass `--token <token>`, `--signature <hex>`, and `--message <sign.message-json>`. It **auto-retries on 404** to ride out backend indexer lag, so a transient 404 right after launch is expected, not a failure.

```bash
# 1) resolve the token + build the EIP-712 payload (+ upload logo)
boardwalk launch-metadata --tx 0x<create-launch tx hash> --chain base \
  --logo ./logo.png --twitter boardwalk --homepage https://example.com
# → { token, auctionUrl, sign, next }

# 2) sign sign.message (issuer wallet, typed data) → <hex signature>

# 3) submit
boardwalk submit-metadata --token 0x<token> --chain base \
  --signature 0x<hex> --message '<sign.message JSON>'
```

---

### `launch-link` — generate a prefilled launch link (no shell needed)

Returns a `…/launch?path=…&prefill=…` URL that opens the Boardwalk launch form on its **summary** step, fully prefilled. **No wallet, no RPC, no signing** — pure URL generation, so it works on shell-less surfaces (plain chat) where the CLI can't run. The user opens the link, **adds a logo in the UI** (an image can't ride in a URL), connects a wallet, and signs. Nothing auto-submits.

- **Required:** `--chain --name --ticker --category`.
- **Optional:** `--path` (default express) `--description --issuer-fee`; advanced: `--presale-percent --fee --vesting --referrer --raise-goal`; socials: `--twitter`/`--x --discord --telegram --youtube --video`.
- **Validate** the same inputs as `launch` (see [Validate before you call](#validate-before-you-call)) — `launch-link` runs the identical checks and throws on bad input. Advanced `--raise-goal` must exceed the graduation threshold.
- **No `--logo`** (the UI collects it) and **no `--homepage`** (the launch form has no homepage field; set it later via `launch-metadata`).

```bash
boardwalk launch-link --chain base --name "My Token" --ticker MYT \
  --category meme-culture --issuer-fee 0xYou
# → { action: "launch-link", url: "https://app.useboardwalk.com/launch?path=express&prefill=…", path, prefill, next }
```

The user opens `url` → reviews the prefilled summary → adds a logo → signs in the UI. For an agent with no shell, this is the **only** way to start a launch — it needs no tools.

---

### `contribute` — join a presale auction

Deposits a raise token into the launch's presale. The CLI emits a conditional `approve-raise-token` (so the **presale manager** can pull your deposit) followed by `contribute`. **Only valid while `status == "presale"`** — check first with `status`.

- **Prereqs:** the wallet holds **≥ amount** of the raise token (find it via `status` → `raiseToken`), on the right chain.

```bash
boardwalk contribute \
  --token 0x4C867B5320760BE4AD944222178FC3D344d1BA48 \
  --amount 0.01 --chain base --wallet 0x3666…1CA3
```

```jsonc
// verified output:
{
  "calls": [
    {
      "id": "approve-raise-token",
      "label": "Approve token",
      "to": "0x4200000000000000000000000000000000000006",
      "data": "0x095ea7b3…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "contribute",
      "label": "Contribute",
      "to": "0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
      "data": "0xc1cbbca7…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  "action": "contribute",
  "token": "0x4C867B5320760BE4AD944222178FC3D344d1BA48",
  "amount": "10000000000000000",
  "raiseToken": "0x4200000000000000000000000000000000000006",
}
```

---

### `claim` — claim presale tokens

Contributors claim their allocation **only after the auction is `seeded` AND the 7-day post-seed cliff has ended**. Emits a single `claim` call (`claimTokens`). The CLI gates strictly: it requires `status === "seeded"` (**not** `pending_seed`), then reads `PresaleManager.cliffEnd()` and **refuses to emit any call — surfacing the `cliffEnd` timestamp — until the cliff has passed** (so you never broadcast a doomed/reverting tx). On success the output includes `cliffEnd`. Add `--rpc <url>` if the default RPC rate-limits the `cliffEnd` read.

```bash
boardwalk claim --token 0x4C86…BA48 --chain base --wallet 0x3666…1CA3
```

---

### `stake-bmx` — stake BMX (Base only)

Stakes BMX to earn a share of platform fees and accrue **Voting Power**. Emits a conditional `approve-bmx` + `stake-bmx`. **Base only** — the staking contracts are placeholders on other chains and the CLI errors clearly if you point it elsewhere.

- **Prereqs:** the wallet holds **≥ amount** BMX on Base.

```bash
boardwalk stake-bmx --amount 100 --wallet 0x3666…1CA3 --chain base
```

---

### `vote` — vote on fee direction (Base only)

Casts a Boardwalk governance vote that directs where protocol swap fees flow. Pick `--option`:

| Option | Direction      |
| ------ | -------------- |
| `1`    | Treasury       |
| `2`    | Buy & Burn BMX |
| `3`    | Buy & Burn LP  |
| `4`    | Participation  |

If the configured `governanceBurnAmount` is **> 0**, the CLI prepends a conditional `approve-bmx`; when it is `0`, you get **just** the `vote` call (as below). **Base only.**

```bash
boardwalk vote --option 1 --wallet 0x3666…1CA3 --chain base
```

```jsonc
// verified output (governanceBurnAmount was 0 → no approve step):
{
  "calls": [
    {
      "id": "vote",
      "label": "Cast vote",
      "to": "0x487451487ed87aB447ec12B5627A4ff7c4c4974C",
      "data": "0xb3f98adc…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  "action": "vote",
  "option": 1,
}
```

---

### Read commands

**`status`** — what state is a launch in?

```bash
boardwalk status --token 0x4C86…BA48 --chain base
```

```jsonc
// verified output:
{
  "token": "0x4C867B5320760BE4AD944222178FC3D344d1BA48",
  "chainId": 8453,
  "status": "presale", // gate: presale → contribute; seeded (+ 7-day post-seed cliff) → claim
  "path": "ADVANCED",
  "presaleManager": "0xde88fF82A8aA7DD1015E554BD3d5431838b63473",
  "raiseToken": "0x4200000000000000000000000000000000000006",
  "seeded": false,
}
```

**`launch-cost`** — how much BMX does it cost me to launch?

```bash
boardwalk launch-cost --chain base --wallet 0x3666…1CA3
```

```jsonc
// verified output (all values are wei strings):
{
  "chainId": 8453,
  "baseBurn": "100000000000000000000",
  "discountBps": "5000", // Boardwalk NFT member discount in basis points
  "isMember": false,
  "bmxBurnCost": "100000000000000000000", // the amount to actually burn
}
```

---

## Submitting the calls

The `calls` array is **unsigned** `{ to, data, value }` (plus `id`, `label`, `chainId`). Submit it with the **user's wallet** — there is no signed transaction in the CLI output, by design.

- **Batched, single approval (recommended):** pass the **entire `calls` array** to a batched submit so the user approves once. With Base MCP this is `send_calls` — feed it the array of `{ to, data, value }`, then poll `get_request_status` until it resolves.
- **Order matters:** when an approve step is present it is **element 0** and must execute **before** the action. A batched submit preserves order; if you submit calls one-by-one, send the **approve first**, wait for it, then the action.
- **Metadata leg:** the `launch-metadata` `sign` payload is **EIP-712 typed data**, not a `calls` entry. Sign it with the issuer wallet (Base MCP supports typed-data signing), then run `submit-metadata`.
- **No shell?** There are no `calls` to submit — generate a prefilled link with `launch-link` and hand the user the URL; the UI collects the logo, signs, and submits.

```text
launch → send_calls([approve-bmx, create-launch]) → poll get_request_status
       → launch-metadata → sign(EIP-712) → submit-metadata
```

---

## Supported chains

`--chain` accepts a **slug** or **id**.

| Chain    | Slug       | Chain ID | Launch / Contribute / Claim | Stake BMX | Vote |
| -------- | ---------- | -------- | --------------------------- | --------- | ---- |
| Base     | `base`     | 8453     | ✅                          | ✅        | ✅   |
| Ethereum | `ethereum` | 1        | ✅                          | —         | —    |
| Fraxtal  | `fraxtal`  | 252      | ✅                          | —         | —    |
| Katana   | `katana`   | —        | ✅                          | —         | —    |
| Ink      | `ink`      | —        | ✅                          | —         | —    |

**Base** is the only chain with **full feature parity**. `stake-bmx` and `vote` are **Base-only** — on other chains those contracts are placeholders and the CLI errors clearly.

---

## Attribution

Attribution is **automatic and enforced**: every transaction the SDK builds carries Boardwalk's **ERC-8021** builder-code suffix on its calldata, so volume is attributed even when submitted through the agent's own wallet. There is no flag to set or change, and it does not alter the action, recipient, or amount.

---

## Prompt examples by category

**Launch**

- "Launch a meme token called Agent Test Token, ticker AGENTX, on Base, express path." → `launch --chain base --path express --name "Agent Test Token" --ticker AGENTX --category meme-culture --wallet <addr>`
- "How much BMX does it cost me to launch on Base?" → `launch-cost --chain base --wallet <addr>`
- "Create an advanced 7-day launch on Fraxtal with my address as the issuer-fee recipient." → `launch --chain fraxtal --path advanced --issuer-fee <addr> …`
- "Do I get a launch discount?" → `launch-cost …` (read `isMember` / `discountBps`).
- "Set the logo and Twitter for my new token and publish its profile." → `launch-metadata --logo … --twitter …` → sign EIP-712 → `submit-metadata`.
- "Add a description, homepage, and raise goal to token 0x4C86…BA48." → `launch-metadata --description … --homepage … --raise-goal …` → sign → `submit-metadata`.

**Contribute**

- "Contribute 0.01 WETH to the BARRY presale on Base." → `status` (confirm `presale`) → `contribute --token … --amount 0.01 --chain base --wallet <addr>`.
- "Join this auction with 0.5 of the raise token." → `contribute --amount 0.5 …`.
- "Is this launch still open to contribute?" → `status --token … --chain …` (look for `status: "presale"`).
- "Ape into token 0x… for 1 WETH." → `contribute --token 0x… --amount 1 --chain base --wallet <addr>` (attribution is automatic).

**Post-launch**

- "Did my launch succeed and what's its state?" → `status --token … --chain …`.
- "Claim my presale tokens for 0x4C86…BA48 on Base." → `status` (expect `seeded`, and only after the 7-day post-seed cliff) → `claim --token … --chain base --wallet <addr>`.
- "Stake 100 BMX." → `stake-bmx --amount 100 --wallet <addr>` (Base only).
- "Vote to route fees to Treasury." → `vote --option 1 --wallet <addr>` (Base only).
- "Vote to Buy & Burn BMX with the protocol fees." → `vote --option 2 …`.
- "Direct fees to Participation." → `vote --option 4 …`.

**Prefilled link (no shell)**

- "I'm in a plain chat with no terminal — how do I launch X on Base?" → `launch-link --chain base --name … --ticker … --category …` → hand the user the returned URL.
- "Give me a link to launch a token with these settings that I can open in the app." → `launch-link …` (prefills the summary; the user adds a logo and signs in the UI).

---

## Concepts & docs

This skill is the **executable** layer — it builds the transactions. For the **conceptual** layer (how the auction mechanics, fee model, and governance/voting actually work), read:

- <https://www.useboardwalk.com/llms.txt> — LLM-oriented overview
- <https://www.useboardwalk.com/docs> — full product docs
