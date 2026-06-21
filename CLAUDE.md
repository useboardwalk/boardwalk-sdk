# CLAUDE.md

Guidance for Claude Code when working in **boardwalk-sdk** — a framework-agnostic TypeScript SDK + `boardwalk` CLI that builds **unsigned** Boardwalk transactions for agents to sign and submit.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit (strict)
npm test            # vitest
npm run build       # tsup → dist (ESM + CJS + .d.ts + CLI bin)
npm run cli -- <args>   # run the CLI from source (tsx), e.g. npm run cli -- status --token 0x… --chain base
```

Node ≥ 18 (uses global `fetch`/`Blob`/`FormData`). If the shell defaults to an older Node, use the repo's required version (e.g. via nvm) before running.

## What this is (and isn't)

- **Is:** pure `build*Steps()` functions returning `TxRequest[]` → `encodeSteps()` → `{to,data,value,chainId}` calldata. A thin CLI over those. Read helpers over the public API + viem RPC.
- **Is NOT:** a signer or sender. It is **non-custodial** — never request, store, or accept a private key; only ever emit unsigned calldata and EIP-712 payloads. The caller's wallet signs and submits.

## Architecture

```
src/
  constants.ts        ← ALL constants live here (builder code, API URL, ToS, logo limits, MIME map, RPC defaults)
  types.ts            ← ALL public interfaces / type aliases live here
  registry/           ← addresses + ABIs + chains (mirror the deployed Boardwalk contracts; do not hand-edit ABIs)
    contracts.ts        getContracts / assertDeployed (throws on placeholder/undeployed)
    chains.ts           SUPPORTED_CHAINS (viem chain objects — never hardcode chain ids)
    abis/               *.ts ABI consts (core 4 verbatim; the rest are minimal fragments)
  flow/               ← TxRequest execution primitives
    encode.ts           encodeStep/encodeSteps + BUILDER_CODE_SUFFIX (the ERC-8021 suffix, Base-only)
    erc20.ts            buildConditionalApproveStep (viem PublicClient)
  builders/           ← the 5 v1 actions: launch, contribute, claim, stake-bmx, vote
  launch/             ← launch support: build-launch-config, member-discount, token-identity, description
  metadata/           ← EIP-712 message, isomorphic logo upload, signed POST
  read/               ← public-API client + getLaunch
  cli.ts              ← commander CLI over the builders
  index.ts            ← barrel: re-exports everything public
```

## Conventions (important)

- **Constants → `src/constants.ts`. Public types → `src/types.ts`.** Don't scatter either. Internal helper types (e.g. `ApproveParams`) may stay co-located.
- **Attribution.** Boardwalk's ERC-8021 builder code (`BUILDER_CODE` in `constants.ts`) is appended to calldata in `flow/encode.ts` **on Base only** — that's where the code is registered (base.dev Builder Codes); other chains carry no suffix. Do **not** add a per-call / CLI / env override — that is intentional.
- **Registry fidelity.** The address registry and contract ABIs must match the deployed Boardwalk contracts. The four core ABIs (LaunchFactory, PresaleManager, RewardRouter, GovernanceVoter) are full; ABIs added for additional builders are **minimal hand-authored fragments** holding only the entries the SDK calls/reads (the full source ABIs are large). Keep all of them in sync with the on-chain contracts (see the `boardwalk-contracts` repo); never hand-edit them to diverge from what's deployed.
- **Reads.** Builders take a viem `PublicClient`. Public RPCs rate-limit, so minimize adjacent round-trips: batch independent reads with `client.multicall({ multicallAddress: MULTICALL3_ADDRESS, allowFailure: false, contracts: [...] })` (not `Promise.all` of single `readContract` calls) — see `readLaunchCost`. Pass a pre-fetched `currentAllowance` to `buildConditionalApproveStep` to skip its allowance read when you've already batched it.
- **Chain scope.** Launch/contribute/claim are multi-chain; stake-bmx and vote are Base-only. Guard chain-specific contracts with `assertDeployed(chainId, key)` so undeployed chains fail loudly.
- **No keys, no signing, no broadcasting** anywhere in this package.

## Adding an action

1. Add the param + result interfaces to `src/types.ts`.
2. Add `buildXSteps(params): Promise<TxStep[]>` in `src/builders/` (conditional approve + the action; `assertDeployed` for chain-gated contracts).
3. Export it from `src/index.ts`.
4. Add a CLI command in `src/cli.ts` (clear `--help`; print via `emitCalls`).
5. Test in `test/` — assert the step ids/order and that encoded `data` equals `encodeFunctionData(...)` + `BUILDER_CODE_SUFFIX` (see `test/builders.test.ts`; mock the client by `functionName`).

## Verification

`npm run typecheck && npm test && npm run build`, then a live smoke test against Base (`node dist/cli.js launch-cost --chain base --wallet 0x… --rpc <url>`; build a contribute/vote/launch and confirm the calldata). Reads against a public RPC may rate-limit — pass `--rpc`.

## Version update

A user-facing change ships a version bump in the same PR — don't defer it to "release time". Bump all four in lockstep so the tag, npm package, CLI `--version`, and docs never drift:

- `package.json` `version` (the npm package version)
- `src/cli.ts` `.version("…")` (the CLI `--version` output)
- the `v…` reference in `skills/boardwalk/SKILL.md` and `skills/boardwalk/plugins/boardwalk.md`

Use the tag you intend to release (e.g. a new chain / action is a minor bump). After merge, `npm publish` publishes whatever `package.json` says — so if it wasn't bumped, the release is hollow (tag says X, code says X-1).