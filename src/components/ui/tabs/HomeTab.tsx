"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { ConnectWalletButton } from "~/components/ConnectWalletButton";

const ZORA_1155_CONTRACT =
  "0xb587dd0dbab77e59c7b7a146aedb8a4ef1cefe8c" as const;
const ZORA_TOKEN_ID = 1n;

// ABI tối thiểu: hàm mint + getTokenInfo
const ZORA_1155_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint256", name: "quantity", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "getTokenInfo",
    outputs: [
      { internalType: "string", name: "uri", type: "string" },
      { internalType: "uint256", name: "maxSupply", type: "uint256" },
      { internalType: "uint256", name: "totalMinted", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function HomeTab() {
  const { address, chainId } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Đọc thông tin token: uri, maxSupply, totalMinted
  const { data: tokenInfo, isLoading: isLoadingTokenInfo } = useReadContract({
    abi: ZORA_1155_ABI,
    address: ZORA_1155_CONTRACT,
    functionName: "getTokenInfo",
    args: [ZORA_TOKEN_ID],
  });

  const maxSupply = tokenInfo ? (tokenInfo as any)[1] as bigint : undefined;
  const totalMinted = tokenInfo ? (tokenInfo as any)[2] as bigint : undefined;

  // Tính % nếu có maxSupply > 0
  let progressPercent: number | null = null;
  if (maxSupply && maxSupply > 0n && totalMinted !== undefined) {
    progressPercent =
      (Number(totalMinted) / Number(maxSupply)) * 100;
  }

  const handleMint = async () => {
    if (!address) {
      setError("Please connect your wallet before minting.");
      setStatus(null);
      return;
    }

    if (chainId && chainId !== base.id) {
      setError("Please switch your wallet to Base network.");
      setStatus(null);
      return;
    }

    setStatus("Sending mint transaction...");
    setError(null);
    setTxHash(null);

    try {
      const hash = await writeContractAsync({
        abi: ZORA_1155_ABI,
        address: ZORA_1155_CONTRACT,
        functionName: "mint",
        args: [address, ZORA_TOKEN_ID, 1n],
      });

      setStatus("Successfully minted the NFT 🎉");
      setTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setStatus(null);

      const raw = String(err?.message || "");
      let msg =
        "Mint failed. An unknown error occurred, please try again.";

      if (raw.includes("user rejected") || raw.includes("User rejected")) {
        msg = "You rejected the transaction in your wallet.";
      }

      setError(msg);
    }
  };

  const handleShareToFarcaster = () => {
    if (!txHash || typeof window === "undefined") return;

    const appUrl =
      process.env.NEXT_PUBLIC_URL || "https://your-miniapp-url.xyz";
    const txUrl = `https://basescan.org/tx/${txHash}`;

    const text = encodeURIComponent(
      "I just minted a Farcaster NFT on Base! Try this mini app:"
    );

    const composeUrl = `https://warpcast.com/~/compose?text=${text}%20${encodeURIComponent(
      appUrl
    )}&embeds[]=${encodeURIComponent(txUrl)}`;

    window.open(composeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-160px)] w-full bg-gradient-to-b from-[#3b1c63] via-[#43206d] to-[#1a082e] text-white flex justify-center px-4 py-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Farcaster NFT Drop</h1>
            <p className="text-[11px] text-purple-200">
              by tanka420.base.eth
            </p>
          </div>

          <ConnectWalletButton />
        </div>

        {/* Row pill + nút nhỏ */}
        <div className="flex items-center justify-between text-[11px] mt-1">
          <div className="px-2 py-1 rounded-full bg-black/30 border border-white/10">
            <span className="text-purple-100">Farcaster TANKA Pass</span>
          </div>

          <div className="flex gap-2">
            <a
              href="https://opensea.io" // TODO: đặt link thật khi có
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-full bg-purple-600 text-xs font-medium"
            >
              OpenSea
            </a>
            <a
              href="#"
              className="px-3 py-1 rounded-full bg-purple-800/70 text-xs font-medium border border-purple-400/60"
            >
              Mint Info
            </a>
          </div>
        </div>

        {/* Card NFT */}
        <div className="mt-2 rounded-3xl overflow-hidden bg-black/20 border border-white/10 shadow-xl">
          <div className="aspect-square w-full bg-black/40">
            <img
              src="https://ipfs.io/ipfs/QmdLubv1jydCx8hAkPtP1NCddvs3aHP9pSzm472PXHHTcj/0.png"
              alt="Farcaster TANKA NFT"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-purple-900/60 px-4 py-3 space-y-2 border-t border-white/5">
            <ul className="text-[11px] space-y-1 text-purple-100">
              <li>• Mint Price: Free mint</li>
              <li>• Mint Limit: 1 per wallet (soft rule)</li>
              <li>• Mint Method: FCFS (first come, first served)</li>
              <li>• Chain: Base Mainnet</li>
            </ul>

            <div className="mt-2">
              {isLoadingTokenInfo ? (
                <p className="text-[11px] text-purple-100">
                  Loading mint stats...
                </p>
              ) : maxSupply !== undefined && totalMinted !== undefined ? (
                maxSupply === 0n ? (
                  // Open edition: chỉ hiển thị tổng minted
                  <p className="text-[11px] text-purple-100">
                    Minted: {totalMinted.toString()} (open edition).
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-purple-100 mb-1">
                      Minted: {totalMinted.toString()} /{" "}
                      {maxSupply.toString()}
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden">
                      <div
                        className="h-full bg-purple-400"
                        style={{
                          width: `${(progressPercent || 0).toFixed(1)}%`,
                        }}
                      />
                    </div>
                  </>
                )
              ) : (
                <p className="text-[11px] text-purple-100">
                  Mint stats unavailable.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mint + status */}
        <div className="mt-2 space-y-2">
          <button
            onClick={handleMint}
            disabled={!address || isPending}
            className="w-full py-3 rounded-full bg-purple-500 hover:bg-purple-400 text-sm font-semibold disabled:opacity-50 disabled:hover:bg-purple-500"
          >
            {isPending
              ? "Minting..."
              : address
              ? "Mint"
              : "Connect wallet to mint"}
          </button>

          {status && (
            <div className="rounded-xl border border-green-300/40 bg-green-900/30 px-3 py-2 text-[11px] text-green-100">
              <p>{status}</p>
              {txHash && (
                <p className="mt-1">
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    View transaction on BaseScan
                  </a>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-300/40 bg-red-900/30 px-3 py-2 text-[11px] text-red-100">
              {error}
            </div>
          )}

          {txHash && (
            <button
              onClick={handleShareToFarcaster}
              className="w-full py-2 rounded-full bg-transparent border border-purple-400/80 text-[11px] font-medium text-purple-100 hover:bg-purple-900/40"
            >
              Share this transaction to Farcaster
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
