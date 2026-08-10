---
name: boardwalk
description: >-
  Build and submit onchain Boardwalk actions from natural language: launch a token, contribute to / join a presale auction, claim presale tokens (or refund a failed launch), seed liquidity, stake/unstake BWLK and claim staking/participation rewards, claim issuer/referrer/integrator fees and vested tokens, add/remove and stake/unstake Boardwalk LP, swap a launch token against its raise token on Uniswap V2, boost/downvote a token's visibility, vote on the weekly revenue direction, and check launch status or cost. Boardwalk is a fee-protection token-launch platform (permanently-locked liquidity + a built-in swap-fee equivalent). This skill drives the boardwalk CLI (npm package @useboardwalk/sdk), which prints UNSIGNED transaction calldata (and EIP-712 payloads to sign) — the user's own wallet signs and submits. Works on Ethereum, Base, Arbitrum, and Robinhood Chain; BWLK staking/unstaking, handle-rewards, participation-reward claims, and governance voting are Ethereum-only. Use whenever a user wants to create, fund, or manage a Boardwalk launch onchain. With a shell it drives the CLI; with no shell (plain chat) it generates a prefilled launch link the user opens in the Boardwalk UI.
metadata:
  homepage: https://www.useboardwalk.com
---

# Boardwalk

**Boardwalk** is a fee-protection token-launch platform. Every token launched on Boardwalk gets **permanently-locked liquidity** (the LP can never be pulled) plus a **built-in swap-fee equivalent** — a 0.95% tax on trades, split between the issuer (0.35%), Boardwalk (0.35%), LP incentives (0.15%), and integrators (0.10%) — so creators keep earning after launch and buyers are protected from rug pulls. Launches run as fixed-window **presale auctions**: contributors deposit the chain's WETH (the raise token on every chain) during the presale, and on a successful close the contract seeds permanent liquidity on the chain's canonical Uniswap V2 and lets contributors claim their tokens.

This skill is the **executable layer** for Boardwalk. It drives the `boardwalk` CLI (the `@useboardwalk/sdk` npm package), which turns a natural-language intent into **UNSIGNED transaction calldata** — an ordered array of `{to, data, value}` calls (plus, for launch metadata, an **EIP-712** payload to sign). The CLI never touches a private key. **The user's wallet signs and submits.**

> **Conceptual docs** (auction mechanics, the fee model, governance/voting, vesting) live at
> <https://www.useboardwalk.com/docs> and <https://www.useboardwalk.com/llms.txt>.
> This skill covers **how to execute** those actions onchain.

---

## Two ways to drive Boardwalk

**Shell available → use the `boardwalk` CLI.** It prints unsigned calldata your wallet signs and submits (the rest of this doc): launch + metadata, contribute, claim, refund, seed-liquidity, BWLK stake/unstake + handle-rewards, fee/vesting/participation claims, Boardwalk LP add/remove/stake/unstake/claim, swap, cast-visibility, and vote.

**No shell (plain chat, no terminal) → emit a prefilled launch link.** `boardwalk launch-link …` (or `buildLaunchLink` from `@useboardwalk/sdk`) returns a `…/launch?path=…&prefill=…` URL. The user opens it, the Boardwalk UI loads the launch summary fully prefilled, then they add a logo, connect a wallet, and sign — all in the UI. No tools required, so it works on any surface.

> **Decision: shell → CLI; no shell → emit the prefilled link.** The link covers **launch** only; contribute, claim, stake, and vote need the CLI and a signer.

---

## Install & run

```bash
boardwalk <command> [flags]                          # after: npm i -g @useboardwalk/sdk
npx -p @useboardwalk/sdk@2.1.0 boardwalk <command> [flags]    # …or zero-install
```

- The CLI is **v2.1.0** (bin `boardwalk`, package `@useboardwalk/sdk`). Reads use a built-in public RPC on every supported chain; **public RPCs rate-limit — on a 429 / timeout, retry with `--rpc <url>`** pointing at a dedicated endpoint.
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
  // …action-specific meta (bwlkBurnCost, config, raiseToken, option, …)
}
```

- `calls` is an **ORDERED array**. When an ERC-20 allowance is insufficient, a **conditional approve is element 0** and the action follows. Feed the **whole array** to a batched submit so the user approves once. If the allowance is already sufficient, the approve step is **omitted** and you get just the action call.
- On Base, every call's `data` ends with Boardwalk's **ERC-8021 builder-code suffix**; on any chain, submit `data` exactly as printed.
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
| `launch`          | Create a launch: emits conditional BWLK approve + `create-launch`              | `--chain --wallet --name --ticker --category` (+ `--issuer-fee` on express) · opt: `--path --description --rpc` · standard (`--path advanced`): `--presale-percent --referrer --fee <label:address:percent>` (repeatable) `--vesting <label:address:percent>` (repeatable) | multi-chain   |
| `launch-metadata` | Upload logo to CDN, then print an EIP-712 payload to sign + the submit request | `--tx \| --token` (`--tx` = create-launch tx hash, recommended) `--chain` · logo: `--logo \| --logo-data \| --logo-url` · opt: `--twitter --discord --telegram --homepage --video --description --raise-goal --tos-uri --tos-version`                                                         | multi-chain   |
| `submit-metadata` | POST the signed metadata (auto-retries on 404 for indexer lag)                 | `--token --chain --signature --message`                                                                                                                                                                                               | multi-chain   |
| `contribute`      | Join an auction: conditional raise-token approve + `contribute`                 | `--token --amount --chain --wallet` · opt: `--rpc`                                                                                                                                                                                    | multi-chain   |
| `claim`           | Claim tokens (only after seeded + 7-day post-seed cliff)               | `--token --chain --wallet` · opt: `--rpc`                                                                                                                                                                                             | multi-chain   |
| `stake-bwlk`      | Stake BWLK: conditional BWLK approve + `stake-bwlk`                            | `--amount --wallet` · opt: `--chain ethereum --rpc`                                                                                                                                                                                   | **Ethereum only** |
| `vote`            | Vote on the weekly revenue direction (optional BWLK approve if burn>0) + `vote` | `--option <1-4> --wallet` · opt: `--chain ethereum --rpc`                                                                                                                                                                            | **Ethereum only** |
| `refund`          | Reclaim a contribution on a **failed** launch + `refund`                       | `--token --chain --wallet`                                                                                                                                                                                                            | multi-chain   |
| `seed-liquidity`  | Activate trading after a successful auction + `seedLiquidity`                  | `--token --chain --wallet`                                                                                                                                                                                                            | multi-chain   |
| `unstake-bwlk`    | Unstake BWLK (no approve) + `unstakeBwlk`                                       | `--amount --wallet` · opt: `--chain ethereum`                                                                                                                                                                                         | **Ethereum only** |
| `handle-rewards`  | Claim/compound staking rewards + `handleRewards`                               | `--wallet` · opt: `--chain ethereum --claim-bwlk --stake-mp --claim-weth --convert-weth-to-eth` (no flags = claim all)                                                                                                                | **Ethereum only** |
| `claim-issuer-fees` | Issuer claims fees as the raise token + `claimAsRaiseToken`                  | `--token --recipient-idx --chain --wallet` · opt: `--min-out --deadline --rpc`                                                                                                                                                        | multi-chain   |
| `claim-referrer-fees` | Referrer claims their fee share + `claimReferrerFees`                      | `--token --chain --wallet` · opt: `--rpc`                                                                                                                                                                                             | multi-chain   |
| `claim-integrator-fees` | Integrator claims a token's accrued tax + `claim`                       | `--token --chain --wallet` · opt: `--slippage-bps --min-out --deadline --rpc`                                                                                                                                                         | multi-chain   |
| `claim-vested`    | Claim vested launch tokens + `claim(allocationId)`                             | `--token --allocation-id --chain --wallet` · opt: `--rpc`                                                                                                                                                                             | multi-chain   |
| `claim-participation` | Claim participation BWLK rewards + `claimAll(epochs)`                      | `--epochs <csv> --wallet` · opt: `--chain ethereum`                                                                                                                                                                                   | **Ethereum only** |
| `cast-visibility` | Boost/downvote a token (burns BWLK) + `boost`/`deboost`                        | `--token --mode boost\|deboost --chain --wallet` · opt: `--rpc`                                                                                                                                                                       | multi-chain   |
| `add-liquidity`   | Add liquidity to a launch-token/WETH pair (2 approves + `addLiquidity`)        | `--token-a --token-b --amount-a --amount-b --chain --wallet` · opt: `--slippage-bps --rpc`                                                                                                                                            | multi-chain   |
| `remove-liquidity` | Remove liquidity (approve LP + `removeLiquidity`)                             | `--token --liquidity --chain --wallet` · opt: `--slippage-bps --rpc`                                                                                                                                                                  | multi-chain   |
| `stake-lp`        | Stake a launch's LP tokens (approve + `stake`)                                 | `--token --amount --chain --wallet` · opt: `--rpc`                                                                                                                                                                                    | multi-chain   |
| `unstake-lp`      | Unstake LP tokens + `withdraw`                                                 | `--token --amount --chain --wallet` · opt: `--rpc`                                                                                                                                                                                    | multi-chain   |
| `claim-lp-rewards` | Claim LP staking rewards + `claim`                                            | `--token --chain --wallet` · opt: `--rpc`                                                                                                                                                                                             | multi-chain   |
| `swap`            | Swap launch↔raise token on Uniswap V2 (approve + `swapExactTokensForTokensSupportingFeeOnTransferTokens`) | `--token --amount --direction buy\|sell --chain --wallet` · opt: `--slippage-bps --rpc`                                                                                                                    | multi-chain   |
| `launch-cost`     | Read the BWLK burn cost to launch (with member discount)                       | `--chain --wallet` · opt: `--rpc`                                                                                                                                                                                                     | read-only     |
| `status`          | Read a launch's status / path / presale manager / raise token                  | `--token --chain`                                                                                                                                                                                                                     | read-only     |

`--amount` (and `--amount-a/--amount-b/--liquidity/--min-out`) are in **human units** (e.g. `0.01` WETH, `100` BWLK); the CLI scales to wei. Categories are slugs (e.g. `meme-culture`). `--option` for `vote`: **1 = Treasury, 2 = Buy & Burn BWLK, 3 = Buy & Burn LP, 4 = Participation**. `--mode` for `cast-visibility` is `boost|deboost`; `--direction` for `swap` is `buy` (raise→token) or `sell` (token→raise). The fee/vesting/LP-staking commands take only `--token` and **resolve the per-launch contract on-chain** (no need to pass FeeDistributor/VestingStream/LPStaking addresses). There is also a shell-free **`launch-link`** command (below) that emits a prefilled `/launch` URL instead of calldata.

---

## Validate before you call

Check inputs **before** invoking the CLI — bad input wastes a round-trip or builds a tx that reverts. The CLI re-checks all of this and exits non-zero with a one-line `Error: …`, so on a failure read the message, fix the one input, and retry (don't loop blindly).

| Input | Rule |
| --- | --- |
| Addresses (`--wallet --token --issuer-fee --referrer --token-a --token-b`, fee/vesting addresses) | valid 20-byte EIP-55 hex (`isAddress`) |
| `--chain` | one of `ethereum`, `base`, `arbitrum`, `robinhood` (or its numeric id) |
| `--amount` / `--amount-a` / `--amount-b` / `--liquidity` / `--min-out` | a number **> 0**, in human units |
| `--option` (`vote`) | integer **1–4** |
| `--path` (`launch`, `launch-link`) | `express` or `advanced` (rejected otherwise). `advanced` is the launch the docs/UI call **standard** — pass the literal `advanced` |
| `--mode` (`cast-visibility`) | `boost` or `deboost` |
| `--direction` (`swap`) | `buy` or `sell` |
| `--epochs` (`claim-participation`) | comma-separated non-negative integers, **≥ 1** (e.g. `0,1,2`) |
| `--recipient-idx` (`claim-issuer-fees`), `--allocation-id` (`claim-vested`) | a **non-negative integer** |
| `--slippage-bps` (`swap`, LP, `claim-integrator-fees`) | integer **0–9999** (default 50 = 0.5%) |
| `--deadline` (fee claims) | unix-seconds integer (default now + 1200s) |
| `--category` | a launch slug: `meme-culture, gaming, creator-media, protocol-defi, infra-tools, app-consumer, nft-collectibles, community, ai-agents, public-goods, other` |
| `--presale-percent` (standard path) | integer **25–50, divisible by 5** |
| `--fee` / `--vesting` (standard path) | `<label>:<address>:<percent>`, percent **> 0**. The standard path needs **≥1 `--fee`**; **`--vesting` is required when presale < 50**. Labels — fee: `individual\|entity\|publicGood\|growthTeam`; vesting also allows `referrer` |
| `--raise-goal` (standard-path metadata / link) | **strictly greater** than the chain's graduation threshold (the `launch` output surfaces it as `graduationThreshold`, a top-level field) |
| `--tx` (`launch-metadata`) | matches `^0x[0-9a-fA-F]{64}$` |
| `--signature` (`submit-metadata`) | `0x`-prefixed hex, any length — smart-account (ERC-1271) signatures exceed 65 bytes; pass them through whole |
| `--message` (`submit-metadata`) | the exact `sign.message` JSON from `launch-metadata` (must parse) |

### Pre-flight gates (read state first)

- **`contribute`** → run `status`; require `status === "presale"` and a non-null `presaleManager`, and confirm the wallet holds **≥ amount** of `raiseToken`.
- **`claim`** → run `status`; require `status === "seeded"`. The CLI then checks the 7-day post-seed cliff and **either** emits the `claim` call **or** refuses with a `cliffEnd` timestamp — surface the unlock time, don't retry before it.
- **`refund`** → run `status`; only valid on `status === "failed"` (the CLI gates on this).
- **`seed-liquidity`** → only before liquidity is seeded; the CLI refuses if the launch is already `seeded`.
- **`swap` / `remove-liquidity` / `stake-lp` / `unstake-lp` / `claim-lp-rewards`** → require a **seeded** launch (the Uniswap V2 pool / LP token must exist); the CLI errors clearly (`no Uniswap V2 pool`, `liquidity is not seeded`) otherwise.
- **`claim-issuer-fees` / `claim-referrer-fees` / `claim-vested`** → the launch must be indexed on-chain; the CLI resolves the per-launch FeeDistributor/VestingStream via `LaunchFactory.launches(--token)` and errors if it's undeployed.
- **`cast-visibility`** → burns BWLK; the wallet needs ≥ the live boost cost in BWLK (the CLI reads it, applying the NFT member discount).
- **`launch` / `vote`** → check the wallet's BWLK balance covers the burn (`launch-cost` gives `bwlkBurnCost`; `vote` only burns when `governanceBurnAmount > 0`).
- **`vote`** → the CLI checks eligibility onchain and refuses to emit the call if the wallet **already voted this epoch**, has **no staked BWLK (no voting power)**, or its **multiplier points are below the 1.5% participation gate** — surface the error (stake BWLK / compound points), don't retry as-is.
- **All** → the wallet must be on the **right chain**; `stake-bwlk`, `unstake-bwlk`, `handle-rewards`, `claim-participation`, and `vote` are **Ethereum-only** (the staking/governance contracts are placeholders elsewhere and the CLI errors clearly).

---

### `launch` — create a token launch

Builds the launch transaction. Boardwalk requires **burning BWLK** to launch (the burn cost is discounted for Boardwalk NFT members — the NFT is **not** required, it only lowers the cost). The CLI emits a conditional `approve-bwlk` (so the launch contract can pull the burn) followed by `create-launch`. Alongside `calls`, the output carries `bwlkBurnCost` (wei) and the full `config` tuple passed to `createLaunch`.

- **Paths:** `--path express` (24-hour auction, simpler fees, fully distributed supply) or `--path advanced` (2-day auction after a 24-hour start delay, customizable fee breakdown + token vesting).
- **Naming:** the longer path is called a **standard** launch in Boardwalk's docs and UI; the CLI flag, the SDK types, and the onchain contracts all still spell it `advanced`. They are the same path. When a user says "standard launch", pass `--path advanced`; when reporting back, "standard" is the name to use.
- **Express-path params:** `--issuer-fee <address>` is **required** (the contract demands exactly one fee recipient; it receives 100% of the issuer fee — typically the issuer wallet). `--fee`, `--vesting`, and `--referrer` are standard-path only.
- **Prereqs:** the wallet holds **≥ bwlkBurnCost** BWLK, on the right chain.
- **Standard-path params (`--path advanced`):**
  - `--fee <label:address:percent>` (**repeatable**) — the issuer-fee split across recipients; valid labels: `individual` | `entity` | `publicGood` | `growthTeam`. **1–4 recipients; at least one is required** for `--path advanced`.
  - `--vesting <label:address:percent>` (**repeatable**, up to 5) — token vesting recipients; valid labels: `individual` | `entity` | `referrer` | `publicGood` | `growthTeam`. **Required when `--presale-percent` < 50; not allowed at 50** (full presale leaves nothing to vest).
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
# standard path (--path advanced): issuer-fee split + vesting (presale-percent < 50 requires vesting)
boardwalk launch --chain base --wallet 0xYou \
  --name "My Token" --ticker MYT --category ai-agents \
  --path advanced --presale-percent 40 \
  --fee individual:0xYou:60 --fee entity:0xCo:40 \
  --vesting individual:0xYou:100
```

```jsonc
// example output (truncated calldata shown as printed):
{
  "calls": [
    {
      "id": "approve-bwlk",
      "to": "0x…", // the BWLK token
      "data": "0x095ea7b3…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "create-launch",
      "to": "0x…", // the LaunchFactory
      "data": "0x8e04750d…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  // plus top-level (siblings of `calls`): bwlkBurnCost: "100000000000000000000", config: <createLaunch tuple>, graduationThreshold: { wei, display }, next
}
```

#### Launch metadata sub-flow (name/logo/socials) — required after every launch

Once the `create-launch` tx confirms, **always** attach the token's public metadata — never stop at the on-chain leg. A launch with no metadata appears on the Boardwalk UI with no name, logo, or socials and reads as broken to anyone who finds it, so treat this as a required part of the launch, not an optional extra. It's a **three-step** flow because the metadata is gated by an issuer **EIP-712 signature**:

1. **`launch-metadata --tx <create-launch tx hash>`** — resolves the launched **token** from the tx receipt (no log-parsing), uploads the logo to the CDN, and prints `{ token, auctionUrl, sign, next }`.
   - `sign` is the EIP-712 typed data: `{ domain, types, primaryType, message }`.
   - **Logo** is provided one of three ways: `--logo <file>`, `--logo-data <base64-or-dataURL>`, or `--logo-url <url>`.
   - Other fields: `--twitter --discord --telegram --homepage --video --description --raise-goal --tos-uri --tos-version`. (Already have the token address? Use `--token <addr>` instead of `--tx`.)
   - **`--raise-goal` (standard path) must EXCEED the chain's graduation threshold** — the CLI validates it and errors otherwise. The threshold is **2.5 wETH** on every chain. It is timelocked per path, so Express and Standard can differ — trust the `graduationThreshold` in the `launch` output over any number written here. Set the standard-path `--raise-goal` above the graduation threshold (which the `launch` output surfaces as the top-level `graduationThreshold`).
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
- **Optional:** `--path` (default express) `--description --issuer-fee`; standard (`--path advanced`): `--presale-percent --fee --vesting --referrer --raise-goal`; socials: `--twitter`/`--x --discord --telegram --youtube --video`.
- **Validate** the same inputs as `launch` (see [Validate before you call](#validate-before-you-call)) — `launch-link` runs the identical checks and throws on bad input. The standard path's `--raise-goal` must exceed the graduation threshold.
- **No `--logo`** (the UI collects it) and **no `--homepage`** (the launch form has no homepage field; set it later via `launch-metadata`).

```bash
boardwalk launch-link --chain base --name "My Token" --ticker MYT \
  --category meme-culture --issuer-fee 0xYou
# → { action: "launch-link", url: "https://app.useboardwalk.com/launch?path=express&prefill=…", path, prefill, next }
```

The user opens `url` → reviews the prefilled summary → adds a logo → signs in the UI. For an agent with no shell, this is the **only** way to start a launch — it needs no tools.

---

### `contribute` — join an auction

Deposits a raise token into the launch's presale. The CLI emits a conditional `approve-raise-token` (so the **presale manager** can pull your deposit) followed by `contribute`. **Only valid while `status == "presale"`** — check first with `status`.

- **Prereqs:** the wallet holds **≥ amount** of the raise token (find it via `status` → `raiseToken`), on the right chain.

```bash
boardwalk contribute \
  --token 0xYourToken \
  --amount 0.01 --chain base --wallet 0x3666…1CA3
```

```jsonc
// example output:
{
  "calls": [
    {
      "id": "approve-raise-token",
      "label": "Approve token",
      "to": "0x4200000000000000000000000000000000000006", // WETH on Base
      "data": "0x095ea7b3…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "contribute",
      "label": "Contribute",
      "to": "0x…", // the launch's presale manager
      "data": "0xc1cbbca7…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  "action": "contribute",
  "token": "0xYourToken",
  "amount": "10000000000000000",
  "raiseToken": "0x4200000000000000000000000000000000000006",
}
```

---

### `claim` — claim tokens

Contributors claim their allocation **only after the auction is `seeded` AND the 7-day post-seed cliff has ended**. Emits a single `claim` call (`claimTokens`). The CLI gates strictly: it requires `status === "seeded"` (**not** `pending_seed`), then reads `PresaleManager.cliffEnd()` and **refuses to emit any call — surfacing the `cliffEnd` timestamp — until the cliff has passed** (so you never broadcast a doomed/reverting tx). On success the output includes `cliffEnd`. Add `--rpc <url>` if the default RPC rate-limits the `cliffEnd` read.

```bash
boardwalk claim --token 0xYourToken --chain base --wallet 0x3666…1CA3
```

---

### `stake-bwlk` — stake BWLK (Ethereum only)

Stakes BWLK to earn a share of platform fees (WETH + BWLK) and accrue **multiplier points** that compound voting weight. Emits a conditional `approve-bwlk` (the staked-BWLK tracker pulls the tokens) + `stake-bwlk`. **Ethereum only** — the staking contracts are placeholders on other chains and the CLI errors clearly if you point it elsewhere.

- **Prereqs:** the wallet holds **≥ amount** BWLK on Ethereum.

```bash
boardwalk stake-bwlk --amount 100 --wallet 0x3666…1CA3 --chain ethereum
```

---

### `vote` — vote on the weekly revenue direction (Ethereum only)

Casts a weekly revenue vote: epoch N's vote directs where epoch N+1's protocol revenue budget goes. Voting weight is staked BWLK (sbfBWLK); revenue collected on Base, Arbitrum, and Robinhood is bridged to Ethereum weekly. Pick `--option`:

| Option | Direction       |
| ------ | --------------- |
| `1`    | Treasury        |
| `2`    | Buy & Burn BWLK |
| `3`    | Buy & Burn LP   |
| `4`    | Participation   |

If the configured `governanceBurnAmount` is **> 0** (it starts at 0, capped at 1 BWLK), the CLI prepends a conditional `approve-bwlk`; when it is `0`, you get **just** the `vote` call (as below). **Ethereum only.**

The CLI pre-checks eligibility against the GovernanceVoter and **refuses to emit a guaranteed-revert tx** when the wallet has already voted this epoch, has no voting power (no staked BWLK — stake first via `stake-bwlk`), or holds fewer staked multiplier points than the 1.5%-of-staked-BWLK participation gate (compound points first).

```bash
boardwalk vote --option 1 --wallet 0x3666…1CA3 --chain ethereum
```

```jsonc
// example output (governanceBurnAmount was 0 → no approve step):
{
  "calls": [
    {
      "id": "vote",
      "label": "Cast vote",
      "to": "0x…", // the GovernanceVoter
      "data": "0xb3f98adc…",
      "value": "0",
      "chainId": 1,
    },
  ],
  "action": "vote",
  "option": 1,
}
```

---

### More actions

All of these print the same `{ calls, …meta }` shape and follow the same submit flow (batched `calls`, approve at `[0]` when present). The fee/vesting/LP commands take only `--token` and resolve the per-launch contract on-chain.

**Auction lifecycle**

```bash
boardwalk refund         --token 0x… --chain base --wallet 0xYou   # only when status == failed
boardwalk seed-liquidity --token 0x… --chain base --wallet 0xYou   # activate trading post-presale
```

**BWLK staking (Ethereum-only)**

```bash
boardwalk unstake-bwlk   --amount 100 --wallet 0xYou               # no approve
boardwalk handle-rewards --wallet 0xYou                            # no flags = claim everything
boardwalk handle-rewards --wallet 0xYou --claim-weth --convert-weth-to-eth
```

**Fee / vesting / participation claims**

```bash
boardwalk claim-issuer-fees     --token 0x… --recipient-idx 0 --chain base --wallet 0xYou [--min-out 0.1 --deadline <unix>]
boardwalk claim-referrer-fees   --token 0x… --chain base --wallet 0xYou
boardwalk claim-integrator-fees --token 0x… --chain base --wallet 0xYou [--slippage-bps 50]   # derives minOut from the collector quote
boardwalk claim-vested          --token 0x… --allocation-id 0 --chain base --wallet 0xYou
boardwalk claim-participation   --epochs 0,1,2 --wallet 0xYou        # Ethereum-only, pays BWLK
```

**Visibility (burns BWLK)**

```bash
boardwalk cast-visibility --token 0x… --mode boost   --chain base --wallet 0xYou
boardwalk cast-visibility --token 0x… --mode deboost --chain base --wallet 0xYou
```

**Boardwalk LP**

```bash
boardwalk add-liquidity    --token-a 0xWETH --token-b 0xYourToken --amount-a 0.01 --amount-b 1000 --chain base --wallet 0xYou [--slippage-bps 50]   # one side must be the chain's WETH
boardwalk remove-liquidity --token 0x… --liquidity 1 --chain base --wallet 0xYou [--slippage-bps 50]
boardwalk stake-lp         --token 0x… --amount 1 --chain base --wallet 0xYou
boardwalk unstake-lp       --token 0x… --amount 1 --chain base --wallet 0xYou
boardwalk claim-lp-rewards --token 0x… --chain base --wallet 0xYou
```

**Swap (canonical Uniswap V2, single-hop launch↔raise token)**

```bash
boardwalk swap --token 0x… --amount 0.01 --direction buy  --chain base --wallet 0xYou   # raise → token
boardwalk swap --token 0x… --amount 1000 --direction sell --chain base --wallet 0xYou   # token → raise
```

The swap quotes via the router's `getAmountsOut`, tax-adjusted because launch tokens are fee-on-transfer (the 0.95% tax plus the 0.30% pair fee makes a swap cost about 1.25%), and applies `--slippage-bps` (default 50); it errors `No Uniswap V2 pool` if the token's pool isn't seeded.

---

### Read commands

**`status`** — what state is a launch in?

```bash
boardwalk status --token 0xYourToken --chain base
```

```jsonc
// example output:
{
  "token": "0xYourToken",
  "chainId": 8453,
  "status": "presale", // gate: presale → contribute; seeded (+ 7-day post-seed cliff) → claim
  "path": "ADVANCED", // the API mirrors the contract naming — report this as a "standard" launch
  "presaleManager": "0x…",
  "raiseToken": "0x4200000000000000000000000000000000000006", // WETH on Base
  "seeded": false,
}
```

**`launch-cost`** — how much BWLK does it cost me to launch?

```bash
boardwalk launch-cost --chain base --wallet 0x3666…1CA3
```

```jsonc
// example output (all values are wei strings):
{
  "chainId": 8453,
  "baseBurn": "100000000000000000000",
  "discountBps": "5000", // Boardwalk NFT member discount in basis points
  "isMember": false,
  "bwlkBurnCost": "100000000000000000000", // the amount to actually burn
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
launch → send_calls([approve-bwlk, create-launch]) → poll get_request_status
       → launch-metadata → sign(EIP-712) → submit-metadata
```

---

## Supported chains

`--chain` accepts a **slug** or **id**.

| Chain           | Slug        | Chain ID | Launch / Contribute / Claim | Stake BWLK | Vote |
| --------------- | ----------- | -------- | --------------------------- | ---------- | ---- |
| Ethereum        | `ethereum`  | 1        | ✅                          | ✅         | ✅   |
| Base            | `base`      | 8453     | ✅                          | —          | —    |
| Arbitrum        | `arbitrum`  | 42161    | ✅                          | —          | —    |
| Robinhood Chain | `robinhood` | 4663     | ✅                          | —          | —    |

**Ethereum** is the governance, staking, and revenue home (revenue collected on the other chains is bridged there weekly). **Ethereum-only** commands: `stake-bwlk`, `unstake-bwlk`, `handle-rewards`, `claim-participation`, and `vote` — on other chains those contracts are placeholders and the CLI errors clearly. The other actions (refund, seed-liquidity, fee/vesting claims, cast-visibility, LP, swap) are **multi-chain**, available on all four chains.

---

## Attribution

Attribution is **automatic** on **Base**: every transaction the SDK builds there carries Boardwalk's **ERC-8021** builder-code suffix on its calldata (Base is where the code is registered), so Base volume is attributed even when submitted through the agent's own wallet. Non-Base chains carry no suffix. There is no flag to set or change, and it does not alter the action, recipient, or amount.

---

## Prompt examples by category

**Launch**

- "Launch a meme token called Agent Test Token, ticker AGENTX, on Base, express path." → `launch --chain base --path express --name "Agent Test Token" --ticker AGENTX --category meme-culture --wallet <addr> --issuer-fee <addr>`
- "How much BWLK does it cost me to launch on Base?" → `launch-cost --chain base --wallet <addr>`
- "Create a standard 2-day launch on Arbitrum with my address as the fee recipient." → `launch --chain arbitrum --path advanced --fee individual:<addr>:100 …` (standard = `--path advanced`)
- "Do I get a launch discount?" → `launch-cost …` (read `isMember` / `discountBps`).
- "Set the logo and Twitter for my new token and publish its profile." → `launch-metadata --logo … --twitter …` → sign EIP-712 → `submit-metadata`.
- "Add a description, homepage, and raise goal to token 0xYourToken." → `launch-metadata --description … --homepage … --raise-goal …` → sign → `submit-metadata`.

**Contribute**

- "Contribute 0.01 WETH to the BARRY presale on Base." → `status` (confirm `presale`) → `contribute --token … --amount 0.01 --chain base --wallet <addr>`.
- "Join this auction with 0.5 of the raise token." → `contribute --amount 0.5 …`.
- "Is this launch still open to contribute?" → `status --token … --chain …` (look for `status: "presale"`).
- "Ape into token 0x… for 1 WETH." → `contribute --token 0x… --amount 1 --chain base --wallet <addr>` (attribution is automatic).

**Post-launch**

- "Did my launch succeed and what's its state?" → `status --token … --chain …`.
- "Claim my presale tokens for 0xYourToken on Base." → `status` (expect `seeded`, and only after the 7-day post-seed cliff) → `claim --token … --chain base --wallet <addr>`.
- "Stake 100 BWLK." → `stake-bwlk --amount 100 --wallet <addr>` (Ethereum only).
- "Vote to send this week's revenue to Treasury." → `vote --option 1 --wallet <addr>` (Ethereum only).
- "Vote to Buy & Burn BWLK with the protocol revenue." → `vote --option 2 …`.
- "Direct revenue to Participation." → `vote --option 4 …`.

**Prefilled link (no shell)**

- "I'm in a plain chat with no terminal — how do I launch X on Base?" → `launch-link --chain base --name … --ticker … --category …` → hand the user the returned URL.
- "Give me a link to launch a token with these settings that I can open in the app." → `launch-link …` (prefills the summary; the user adds a logo and signs in the UI).

---

## Concepts & docs

This skill is the **executable** layer — it builds the transactions. For the **conceptual** layer (how the auction mechanics, fee model, and governance/voting actually work), read:

- <https://www.useboardwalk.com/llms.txt> — LLM-oriented overview
- <https://www.useboardwalk.com/docs> — full product docs
