# AGENTS.md

Guidance for Codex when working in boardwalk-sdk, the `@useboardwalk/sdk` package: a framework-agnostic TypeScript SDK and `boardwalk` CLI that builds unsigned Boardwalk transactions (and EIP-712 metadata payloads) for agents to sign and submit. It decouples the onchain Boardwalk action layer from the `token-launcher` frontend; both target the same deployed Boardwalk contracts, so constants, validation, and addresses must stay in sync with that repo and `boardwalk-contracts`.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit (strict)
npm test            # vitest run
npm run build       # tsup → dist (ESM + CJS + .d.ts + CLI bin)
npm run cli -- <args>   # run the CLI from source (tsx), e.g. npm run cli -- status --token 0x… --chain base
npm run smoke       # run every CLI command against live Base (BOARDWALK_RPC=<url> to avoid public-RPC rate limits)
```

Node >= 18 (uses global `fetch`/`Blob`/`FormData`). If the shell defaults to an older Node, switch to the required version (e.g. via nvm) before running.

The repo ships an Agent Skill at `skills/boardwalk/SKILL.md` (plus `skills/boardwalk/plugins/boardwalk.md`) that teaches an agent to drive the CLI or fall back to a prefilled launch link. `README.md` documents the public API for SDK consumers. Keep both in sync with code changes.

## What this is (and isn't)

- Is: pure `build*Steps()` functions returning `TxStep[]` → `encodeSteps()` → `{to,data,value,chainId}` calldata. A thin CLI over those. Read helpers over the public API plus viem RPC. Covers the full onchain surface: launch, contribute, claim, refund, presale seed, BMX stake/unstake, governance vote, fee/vesting/participation claims, Boardwalk LP add/remove/stake/withdraw, swap, and visibility (boost/deboost). 26 CLI commands.
- Is not: a signer or sender. It is non-custodial: never request, store, or accept a private key; only emit unsigned calldata and EIP-712 payloads. The caller's wallet signs and submits.
- No-shell fallback: when an agent can't run the CLI, `buildLaunchLink` (CLI: `launch-link`) returns a prefilled `/launch?path=…&prefill=…` URL the user opens in the Boardwalk UI. See `skills/boardwalk/SKILL.md`.

## Architecture

```
src/
  constants.ts        ← constants live here (builder code, API URL, ToS, logo limits, MIME map, RPC defaults)
  types.ts            ← public interfaces / type aliases live here
  cli.ts              ← commander CLI over the builders
  cli-error.ts        ← CLI error formatting/exit handling
  index.ts            ← barrel: re-exports everything public
  registry/           ← addresses + ABIs + chains + launch config (mirror the deployed Boardwalk contracts; do not hand-edit ABIs)
    contracts.ts        getContracts / assertDeployed (throws on placeholder/undeployed)
    chains.ts           SUPPORTED_CHAINS: Ethereum, Katana, Fraxtal, Base, Ink, Arbitrum (viem chain objects — never hardcode chain ids)
    launch-config.ts    getLaunchConfig (per-chain raise token, durations, graduation thresholds)
    abis/               *.ts ABI consts (core 4 full; the rest are minimal fragments)
  flow/               ← TxStep execution primitives
    encode.ts           encodeStep/encodeSteps + BUILDER_CODE_SUFFIX (the ERC-8021 suffix, Base-only)
    erc20.ts            buildConditionalApproveStep / readAllowance (viem PublicClient)
  builders/           ← 21 action builder files (launch, contribute, claim, stake/vote, refund, seed-liquidity,
                        fee/vesting/participation claims, cast-visibility, LP add/remove/stake/withdraw, swap)
  launch/             ← launch support: build-launch-config, build-launch-link, member-discount, token-identity, description
  metadata/           ← EIP-712 message, isomorphic logo upload, signed POST
  read/               ← public-API client + getLaunch / getLaunchAddresses / getAuctionUrl
```

## Conventions

- Constants go in `src/constants.ts`. Public types go in `src/types.ts`. Don't scatter either. Internal helper types (e.g. `ApproveParams`) may stay co-located.
- Attribution. Boardwalk's ERC-8021 builder code (`BUILDER_CODE` in `constants.ts`) is appended to calldata in `flow/encode.ts` on Base only, where the code is registered (base.dev Builder Codes); other chains carry no suffix. There is no per-call, CLI, or env override, and that is intentional.
- Registry fidelity. The address registry and contract ABIs must match the deployed Boardwalk contracts. The four core ABIs (LaunchFactory, PresaleManager, RewardRouter, GovernanceVoter) are full; ABIs added for additional builders are minimal hand-authored fragments holding only the entries the SDK calls or reads (the full source ABIs are large). Keep them in sync with the on-chain contracts (see the `boardwalk-contracts` repo); never hand-edit them to diverge from what's deployed.
- Reads. Builders take a viem `PublicClient`. Public RPCs rate-limit, so minimize adjacent round-trips: batch independent reads with `client.multicall({ multicallAddress: MULTICALL3_ADDRESS, allowFailure: false, contracts: [...] })` rather than `Promise.all` of single `readContract` calls (see `readLaunchCost` in `src/builders/launch.ts`). Pass a pre-fetched `currentAllowance` to `buildConditionalApproveStep` to skip its allowance read when you've already batched it.
- Chain scope. Launch/contribute/claim/refund, visibility, and LP work across all six chains; governance vote, BMX stake/unstake, reward handling, and participation claims are Base-only (contracts are placeholder elsewhere). Guard chain-specific contracts with `assertDeployed(chainId, key)` so undeployed chains fail loudly.
- No keys, no signing, no broadcasting anywhere in this package.

## Adding an action

1. Add the param and result interfaces to `src/types.ts`.
2. Add `buildXSteps(params): TxStep[]` (or `Promise<TxStep[]>` if it reads) in `src/builders/` (conditional approve plus the action; `assertDeployed` for chain-gated contracts).
3. Export it from `src/index.ts`.
4. Add a CLI command in `src/cli.ts` (clear `--help`; print via `emitCalls`).
5. Test in `test/`: assert the step ids/order and that encoded `data` equals `encodeFunctionData(...)` plus `BUILDER_CODE_SUFFIX` (see `test/builders.test.ts`; mock the client by `functionName`).

## Verification

Run `npm run typecheck && npm test && npm run build`, then `npm run smoke` to exercise every CLI command against live Base (`scripts/smoke.mjs` checks each emits valid calldata or a read, or fails with the gating error expected for the launch's state; non-mutating). Public RPCs rate-limit, so pass a private RPC via `BOARDWALK_RPC=<url>` for smoke or `--rpc` for one-off CLI calls.

## Version update

A user-facing change ships a version bump in the same PR; don't defer it to release time. Bump all four in lockstep so the tag, npm package, CLI `--version`, and docs never drift:

- `package.json` `version` (the npm package version)
- `src/cli.ts` `.version("…")` (the CLI `--version` output)
- the version references in `skills/boardwalk/SKILL.md` and `skills/boardwalk/plugins/boardwalk.md`

Use the tag you intend to release (e.g. a new chain or action is a minor bump). After merge, `npm publish` publishes whatever `package.json` says, so if it wasn't bumped the tag and the published code drift apart.
