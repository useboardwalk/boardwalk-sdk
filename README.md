# @useboardwalk/sdk

Framework-agnostic builders for **unsigned** [Boardwalk](https://www.useboardwalk.com) transactions, plus a `boardwalk` CLI. Lets an agent (or any app) launch a token, contribute to an auction, claim, stake BMX, and vote — by producing `{to, data, value, chainId}` calldata that the caller's own wallet signs and submits.

> **Non-custodial by design.** This package never requests, stores, or accepts a private key. It only emits unsigned calldata and EIP-712 payloads. Your wallet signs and submits.

> **Attribution.** Transactions the SDK builds on **Base** carry Boardwalk's [ERC-8021](https://github.com/base/builder-codes) builder-code suffix on their calldata (that's where the code is registered). There is no per-call, CLI, or env override — see [Attribution](#attribution).

## Install

```bash
npm install @useboardwalk/sdk                  # library
npm install -g @useboardwalk/sdk               # CLI, then:  boardwalk --help
npx -p @useboardwalk/sdk boardwalk --help      # …or zero-install
```

Requires Node ≥ 18 (uses global `fetch`/`Blob`/`FormData`). The bin is `boardwalk` (the package is `@useboardwalk/sdk`).

## CLI

The CLI turns an intent into **unsigned** calldata. Every transaction command prints JSON `{ calls: [{ id, label, to, data, value, chainId }], ...meta }`. `calls` is **ordered** — a conditional ERC-20 `approve` is first when needed; submit the whole array as one batch (e.g. Base MCP `send_calls`) so the user approves once. `value` is a decimal wei string (`"0"` for all v1 actions). **The CLI never signs or sends.**

Every command and flag is self-documenting:

```bash
boardwalk --help
boardwalk <command> --help
```

| Command                                                | Summary                                                  | Chain     |
| ------------------------------------------------------ | -------------------------------------------------------- | --------- |
| [`launch`](#launch)                                    | Build a token launch (approve BMX + `createLaunch`)      | multi     |
| [`launch-metadata`](#launch-metadata--submit-metadata) | Upload logo + build the EIP-712 metadata payload to sign | multi     |
| [`submit-metadata`](#launch-metadata--submit-metadata) | POST the signed metadata (retries through indexer lag)   | multi     |
| [`contribute`](#contribute)                            | Join an auction (approve raise token + `contribute`)      | multi     |
| [`claim`](#claim)                                      | Claim tokens after a successful auction          | multi     |
| [`stake-bmx`](#stake-bmx)                              | Stake BMX (approve + `stakeBmx`)                         | **Base**  |
| [`vote`](#vote)                                        | Vote on fee direction (optional approve + `vote`)        | **Base**  |
| [`launch-cost`](#read-commands)                        | Read the BMX burn cost to launch                         | read-only |
| [`status`](#read-commands)                             | Read a launch's status + presale address                 | read-only |

**Common flags:** `--chain <slug|id>` (base · ethereum · fraxtal · katana · ink · arbitrum), `--wallet <address>` (BYO; never a key), `--rpc <url>` (override; defaults to the chain's public RPC — `https://mainnet.base.org` for Base). **Public RPCs rate-limit** — on a 429 / timeout, retry with `--rpc <url>` pointing at a dedicated endpoint (only Base has a built-in default; the other chains fall through to viem's public RPC). Amounts (`--amount`, `--raise-goal`) are in **human units**; the CLI scales to wei.

### `launch`

Build the launch flow: a conditional BMX approval (Boardwalk burns BMX to launch) + `createLaunch`. `meta` carries `bmxBurnCost` (wei) and the full `config` tuple.

```bash
boardwalk launch --chain base --wallet 0xYou \
  --name "My Token" --ticker MYT --category meme-culture \
  --path express --issuer-fee 0xYou
```

Flags: `--name --ticker --category` (required) · `--path express|advanced` (express = 24h, advanced = 7d) · `--description`. **Express:** `--issuer-fee <addr>` (single recipient, 100%). **Advanced:** `--presale-percent <25–50, step 5>` · `--fee <label:addr:percent>` (repeatable — the issuer-fee split across `individual|entity|publicGood|growthTeam`) · `--vesting <label:addr:percent>` (repeatable; required when presale < 50) · `--referrer <addr>`. The output `meta` carries the per-chain `graduationThreshold` (the raise goal you later set in `launch-metadata` must exceed it). Output `calls` = `[approve-bmx?, create-launch]` plus a `next` step.

```bash
# advanced: fee breakdown + vesting
boardwalk launch --chain base --wallet 0xYou --name "My Token" --ticker MYT \
  --category ai-agents --path advanced --presale-percent 40 \
  --fee individual:0xYou:60 --fee entity:0xCo:40 --vesting individual:0xYou:100
```

### `launch-metadata` / `submit-metadata`

After the `create-launch` tx confirms, pass its **tx hash** to `launch-metadata` — the SDK **resolves the token from the receipt** (you never parse event logs), uploads the logo, and returns the resolved `token`, the `auctionUrl`, and the **EIP-712** payload (`sign`). Sign `sign` with the **issuer** wallet, then run `submit-metadata`, which **retries through backend indexer lag** (a fresh launch takes a few seconds to register).

```bash
boardwalk launch-metadata --tx 0x<create-launch tx hash> --chain base \
  --logo ./logo.png --twitter myhandle --homepage https://example.com --raise-goal 50
# → { token, auctionUrl, sign, next }. Sign `sign` (EIP-712), then:
boardwalk submit-metadata --token 0x<token> --chain base \
  --signature 0x<sig> --message '<sign.message json>'
```

Already have the token address? Use `--token 0x…` instead of `--tx`. **Logo** (one of): `--logo <file>` (path on disk) · `--logo-data <base64|dataURL>` (e.g. an agent-generated image) · `--logo-url <url>` (already hosted) — see [Logos](#logos). Other fields: `--twitter --discord --telegram --homepage --video --description --raise-goal --tos-uri --tos-version`. **`--raise-goal`** (advanced) is validated to exceed the chain's graduation threshold (10 wETH on Base/Mainnet/Ink/Arbitrum, 20 000 frxUSD on Fraxtal, 2 000 000 KAT on Katana). A launch is valid onchain even if you skip metadata.

### `contribute`

```bash
boardwalk contribute --token 0xLaunch --amount 0.1 --chain base --wallet 0xYou
```

Resolves the presale + raise token, gates on `status == "presale"`, then builds `[approve-raise-token?, contribute]`. Verified output (`0.01` to a live Base presale):

```jsonc
{
  "calls": [
    {
      "id": "approve-raise-token",
      "to": "0x4200…0006",
      "data": "0x095ea7b3…",
      "value": "0",
      "chainId": 8453,
    },
    {
      "id": "contribute",
      "to": "0xde88…3473",
      "data": "0xc1cbbca7…",
      "value": "0",
      "chainId": 8453,
    },
  ],
  "action": "contribute",
  "token": "0x4C86…BA48",
  "amount": "10000000000000000",
  "raiseToken": "0x4200…0006",
}
```

### `claim`

```bash
boardwalk claim --token 0xLaunch --chain base --wallet 0xYou
```

Gates on success (`seeded` / `pending_seed`), then builds a single `claimTokens` call.

### `stake-bmx`

```bash
boardwalk stake-bmx --amount 100 --wallet 0xYou --chain base
```

`[approve-bmx?, stake-bmx]`. **Base-only** — errors clearly on other chains.

### `vote`

```bash
boardwalk vote --option 1 --wallet 0xYou --chain base
```

`--option`: `1` Treasury · `2` Buy & Burn BMX · `3` Buy & Burn LP · `4` Participation. Prepends a BMX approve only when the configured burn is `> 0`. **Base-only.**

### Read commands

```bash
boardwalk status      --token 0xLaunch --chain base
# → { token, chainId, status, path, presaleManager, raiseToken, seeded }
boardwalk launch-cost --chain base --wallet 0xYou
# → { chainId, baseBurn, discountBps, isMember, bmxBurnCost }   (wei strings)
```

### Submitting with Base MCP

```text
get_wallets → use as --wallet
boardwalk <action> … --json → take `calls`
send_calls(calls)           → one batched approval (approve + action)
get_request_status          → confirm
```

## SDK

Each builder takes a viem `PublicClient` (for live reads like allowance / burn cost) and returns `TxStep[]`; `encodeSteps` turns them into ready-to-submit calldata (with the builder-code suffix applied on Base).

```ts
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { buildContributeSteps, encodeSteps, getLaunch } from "@useboardwalk/sdk";

const client = createPublicClient({ chain: base, transport: http() });
const launch = await getLaunch("0xLaunch…", base.id); // { presaleManager, status, raiseToken, … }

const steps = await buildContributeSteps({
  client,
  account: "0xYou…",
  chainId: base.id,
  presale: launch.presaleManager!,
  amount: 10n ** 17n, // 0.1 raise token (wei)
});

const calls = encodeSteps(steps, base.id); // [{ to, data, value, chainId }, …] — sign + submit these
```

The launch metadata leg (`buildLaunchMetadataTypedData` → your wallet signs → `postSignedMetadata`), `uploadLogo`, and `readLaunchCost` are exported too. All public types come from one place — `import type { … } from "@useboardwalk/sdk"`.

## Agent skill

This package ships an [Agent Skill](https://agentskills.io) at `skills/boardwalk/SKILL.md` that teaches an agent how and when to drive the CLI (and emit prefilled launch links). It references the CLI via `npx`; it does not bundle the SDK.

**Claude Code** — install as a plugin:

```
/plugin marketplace add useboardwalk/boardwalk-sdk
/plugin install boardwalk@boardwalk-sdk
```

Or drop it in by hand (swap `~/.claude` for a project's `.claude` to scope it locally):

```bash
mkdir -p ~/.claude/skills/boardwalk
curl -sL https://unpkg.com/@useboardwalk/sdk/skills/boardwalk/SKILL.md \
  -o ~/.claude/skills/boardwalk/SKILL.md
```

**Other agents** (Cursor, Codex, Gemini CLI, …) — the standard `skills/boardwalk/` layout loads anywhere the Agent Skills format is supported.

## Logos

The logo is **off-chain, metadata-only** (`logo_url` in the signed metadata; a launch is valid without one). Provide it as a **file path** (`--logo ./logo.png` / `uploadLogo(bytes, { mime })`), **base64 / data URL** (`--logo-data` / `uploadLogo(dataUrl)` — e.g. an agent-generated image), or an **already-hosted URL** (`--logo-url`). Constraints: ≤ 1 MB (backend cap; compress larger images first) and a standard image MIME.

> Note for Claude Code: an image **pasted/dropped into the chat** is not exposed to the agent as bytes — save it to a file (or reference an existing path) and use `--logo <path>`.

## Attribution

SDK-built transactions **on Base** carry Boardwalk's ERC-8021 builder code, appended to the calldata so it survives any submit path (including `send_calls`). Base is where the code is registered (base.dev → Builder Codes), so non-Base chains carry no suffix. The code is fixed in [`src/constants.ts`](src/constants.ts) (`BUILDER_CODE`) and is **enforced** for Base — there is intentionally no per-call, CLI, or env override.

> Maintainers: `BUILDER_CODE` is Boardwalk's registered code (from base.dev → Builder Codes); update it there if it ever rotates.

## Chains

Base (`8453`, full feature parity) · Ethereum (`1`) · Fraxtal (`252`) · Katana · Ink · Arbitrum (`42161`). Launch / contribute / claim are multi-chain; **stake-bmx and vote are Base-only** (the SDK errors clearly elsewhere via `assertDeployed`).

## Develop

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup → dist (ESM + CJS + d.ts)
```

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
