import { mainnet, base, fraxtal, katana, ink } from "viem/chains";

/**
 * Single source of truth for all chain data.
 * String slugs are used in the launch form (Redux state, URL params).
 * Numeric IDs are used by wagmi/viem for on-chain operations.
 */
export const SUPPORTED_CHAINS = [
  {
    slug: "ethereum",
    numericId: mainnet.id,
    chain: mainnet,
    label: "Ethereum",
    image: "/images/chains/eth.png",
  },
  {
    slug: "katana",
    numericId: katana.id,
    chain: katana,
    label: "Katana",
    image: "/images/chains/katana.png",
  },
  {
    slug: "fraxtal",
    numericId: fraxtal.id,
    chain: fraxtal,
    label: "Fraxtal",
    image: "/images/chains/fraxtal.png",
  },
  {
    slug: "base",
    numericId: base.id,
    chain: base,
    label: "Base",
    image: "/images/chains/base.png",
  },
  {
    slug: "ink",
    numericId: ink.id,
    chain: ink,
    label: "Ink",
    image: "/images/chains/ink.png",
  },
] as const;

export type ChainSlug = (typeof SUPPORTED_CHAINS)[number]["slug"];

/** Wagmi chain objects array — used by wagmi config and WalletInfoPopup */
export const supportedWagmiChains = SUPPORTED_CHAINS.map((c) => c.chain);

/** Numeric chain ID → logo image path */
export const chainLogos: Record<number, string> = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [c.numericId, c.image]),
);

/** String slug → numeric chain ID */
export function toNumericChainId(slug: string): number | undefined {
  return SUPPORTED_CHAINS.find((c) => c.slug === slug)?.numericId;
}

/** Numeric chain ID → string slug */
export function toChainSlug(numericId: number): ChainSlug | undefined {
  return SUPPORTED_CHAINS.find((c) => c.numericId === numericId)?.slug;
}

/** String slug → human-readable label */
export function getChainLabel(slug: string | undefined): string {
  if (!slug) return "";
  return SUPPORTED_CHAINS.find((c) => c.slug === slug)?.label ?? slug;
}

/** String slug → chain image path and short symbol for badges */
export function getChainBadge(slug: string | undefined): {
  image: string;
  symbol: string;
  label: string;
} {
  const chain = slug
    ? SUPPORTED_CHAINS.find((c) => c.slug === slug)
    : undefined;
  return {
    image: chain?.image ?? "/images/chains/eth.png",
    symbol: chain?.label?.charAt(0) ?? "E",
    label: chain?.label ?? "Ethereum",
  };
}

/** Block explorer URL for an address on a supported chain, if configured. */
export function getBlockExplorerAddressUrl(
  chainId: number | undefined,
  address: string,
): string | undefined {
  if (chainId == null || !address) return undefined;
  const chain = SUPPORTED_CHAINS.find((c) => c.numericId === chainId)?.chain;
  const baseUrl = chain?.blockExplorers?.default?.url;
  if (!baseUrl) return undefined;
  return `${baseUrl}/address/${address}`;
}

/** Block explorer URL for a transaction hash on a supported chain, if configured. */
export function getBlockExplorerTxUrl(
  chainId: number | undefined,
  txHash: string,
): string | undefined {
  if (chainId == null || !txHash) return undefined;
  const chain = SUPPORTED_CHAINS.find((c) => c.numericId === chainId)?.chain;
  const baseUrl = chain?.blockExplorers?.default?.url;
  if (!baseUrl) return undefined;
  return `${baseUrl}/tx/${txHash}`;
}
