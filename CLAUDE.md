# CLAUDE.md

Guidance for Claude Code when working in **boardwalk-sdk** — a framework-agnostic TypeScript SDK + `boardwalk` CLI that builds **unsigned** Boardwalk transactions for agents to sign and submit.

## Coding Approach

For any task that writes, reviews, or refactors code here, invoke the `andrej-karpathy-skills:karpathy-guidelines` skill at the start (surgical changes, surface assumptions, verifiable success criteria, avoid overcomplication).

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
  registry/           ← addresses + ABIs + chains (copied verbatim from token-launcher; do not hand-edit ABIs)
    contracts.ts        getContracts / assertDeployed (throws on placeholder/undeployed)
    chains.ts           SUPPORTED_CHAINS (viem chain objects — never hardcode chain ids)
    abis/               *.ts ABI consts (LaunchFactory, PresaleManager, RewardRouter, GovernanceVoter, ERC721)
  flow/               ← TxRequest execution primitives
    encode.ts           encodeStep/encodeSteps + BUILDER_CODE_SUFFIX (the enforced ERC-8021 suffix)
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
- **Attribution is enforced.** Every built tx carries Boardwalk's ERC-8021 builder code (`BUILDER_CODE` in `constants.ts`), appended to calldata in `flow/encode.ts`. Do **not** add a per-call / CLI / env override — that is intentional.
- **Provenance.** Logic is lifted from the sibling `token-launcher` repo (`hooks/contracts/`, `lib/`, `components/transaction-flow/`, `config/`). Each module names its source in a header comment. ABIs and the address registry are **verbatim copies** — keep them in sync; never hand-edit ABI JSON.
- **Reads.** Builders take a viem `PublicClient`. Public RPCs rate-limit, so minimize adjacent round-trips: batch independent reads with `client.multicall({ multicallAddress: MULTICALL3_ADDRESS, allowFailure: false, contracts: [...] })` (not `Promise.all` of single `readContract` calls) — see `readLaunchCost`. Pass a pre-fetched `currentAllowance` to `buildConditionalApproveStep` to skip its allowance read when you've already batched it.
- **Chain scope.** Launch/contribute/claim are multi-chain; stake-bmx and vote are Base-only. Guard chain-specific contracts with `assertDeployed(chainId, key)` so undeployed chains fail loudly.
- **No keys, no signing, no broadcasting** anywhere in this package.

## Adding an action

1. Add the param + result interfaces to `src/types.ts`.
2. Add `buildXSteps(params): Promise<TxStep[]>` in `src/builders/` (conditional approve + the action; `assertDeployed` for chain-gated contracts). Add a header comment naming the token-launcher source.
3. Export it from `src/index.ts`.
4. Add a CLI command in `src/cli.ts` (clear `--help`; print via `emitCalls`).
5. Test in `test/` — assert the step ids/order and that encoded `data` equals `encodeFunctionData(...)` + `BUILDER_CODE_SUFFIX` (see `test/builders.test.ts`; mock the client by `functionName`).

## Verification

`npm run typecheck && npm test && npm run build`, then a live smoke test against Base (`node dist/cli.js launch-cost --chain base --wallet 0x… --rpc <url>`; build a contribute/vote/launch and confirm the calldata). Reads against a public RPC may rate-limit — pass `--rpc`.
