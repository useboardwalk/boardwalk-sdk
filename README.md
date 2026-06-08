# @boardwalk/sdk

Framework-agnostic builders for **unsigned** [Boardwalk](https://www.useboardwalk.com) transactions, plus a `boardwalk` CLI. Lets an agent (or any app) launch a token, contribute to an auction, claim, stake BMX, and vote — by producing `{to, data, value, chainId}` calldata that the caller's own wallet signs and submits.

> **Non-custodial by design.** This package never requests, stores, or accepts a private key. It only emits unsigned calldata and EIP-712 payloads. Your wallet signs and submits.

## Install

```bash
npm install @boardwalk/sdk        # library
npx @boardwalk/cli --help         # CLI
```

Requires Node ≥ 18 (uses global `fetch`/`Blob`/`FormData`).

## CLI

Every tx command prints JSON `{ calls: [{ id, label, to, data, value, chainId }], ...meta }`. `calls` is ordered — a conditional ERC-20 `approve` comes first when needed; submit the whole array as one batch.

```bash
# Build a contribution (approve + contribute) — nothing is signed or sent
boardwalk contribute --token 0xLaunch... --amount 0.1 --chain base --wallet 0xYou...

# Flagship launch (approve BMX + createLaunch)
boardwalk launch --chain base --wallet 0xYou... \
  --name "My Token" --ticker MYT --category meme-culture --path express --issuer-fee 0xYou...

# Read-only
boardwalk status --token 0xLaunch... --chain base
boardwalk launch-cost --chain base --wallet 0xYou...
```

| Command                               | Builds                                               | Chain    |
| ------------------------------------- | ---------------------------------------------------- | -------- |
| `launch`                              | approve BMX → `createLaunch`                         | multi    |
| `launch-metadata` / `submit-metadata` | logo upload + EIP-712 metadata payload → signed POST | multi    |
| `contribute`                          | approve raise token → `contribute`                   | multi    |
| `claim`                               | `claimTokens`                                        | multi    |
| `stake-bmx`                           | approve BMX → `stakeBmx`                             | **Base** |
| `vote`                                | (approve BMX) → `vote`                               | **Base** |

Submit the `calls` with any wallet — e.g. Base MCP `send_calls`, viem `sendTransaction`, or wagmi.

## SDK

Each builder takes a viem `PublicClient` (for live reads like allowance/burn cost) and returns `TxStep[]`; `encodeSteps` turns them into ready-to-submit calldata.

```ts
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { buildContributeSteps, encodeSteps, getLaunch } from "@boardwalk/sdk";

const client = createPublicClient({ chain: base, transport: http() });
const launch = await getLaunch("0xLaunch...", base.id); // → { presaleManager, status, raiseToken, ... }

const steps = await buildContributeSteps({
  client,
  account: "0xYou...",
  chainId: base.id,
  presale: launch.presaleManager!,
  amount: 10n ** 17n, // 0.1 raise token (wei)
});

const calls = encodeSteps(steps, base.id); // [{ to, data, value, chainId }, ...] — sign + submit these
```

The launch metadata leg (`buildLaunchMetadataTypedData` → your wallet signs → `postSignedMetadata`) and `uploadLogo` are exported too.

## Attribution

Agent-driven volume can carry an [ERC-8021](https://github.com/base/builder-codes) builder code so it's attributable even when submitted through an arbitrary wallet. Set `BOARDWALK_BUILDER_CODE` (or pass `--builder-code` / `{ builderCode }`); the SDK appends the suffix to `data`.

## Chains

Base (`8453`, full feature parity) · Ethereum (`1`) · Fraxtal (`252`) · Katana · Ink. Launch/contribute/claim are multi-chain; **stake-bmx and vote are Base-only** (the SDK errors clearly elsewhere).

## Provenance

The transaction-building logic is lifted from the Boardwalk frontend (`token-launcher`), where it already lived as a framework-agnostic `TxRequest` model. Each module names its source in a header comment. The frontend is expected to consume this SDK over time so there is a single source of truth.

## Develop

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup → dist (ESM + CJS + d.ts)
```
