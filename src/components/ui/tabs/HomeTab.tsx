"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { base } from "wagmi/chains";
import { encodeAbiParameters } from "viem";
import { ConnectWalletButton } from "~/components/ConnectWalletButton";

const ZORA_1155_CONTRACT =
  "0xB51EB1a3FA71Ad0fEfDCC8A1A17821016bc4fc68" as const;
const ZORA_TOKEN_ID = 1n;

// Minter strategy: Zora Timed Sale Strategy Proxy (Boss vừa tìm)
const ZORA_TIMED_SALE_MINTER =
  "0x777777722D078c97c6ad07d9f36801e653E356Ae" as const;

// ABI tối thiểu của Zora1155: balanceOf, getTokenInfo, mintFee, mint(...)
const ZORA_1155_ABI = [
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getTokenInfo",
    outputs: [
      {
        components: [
          { internalType: "string", name: "uri", type: "string" },
          { internalType: "uint256", name: "maxSupply", type: "uint256" },
          { internalType: "uint256", name: "totalMinted", type: "uint256" },
        ],
        internalType: "struct IZoraCreator1155TypesV1.TokenData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mintFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    // mint(IMinter1155 minter, uint256 tokenId, uint256 quantity, address[] rewardsRecipients, bytes minterArguments) payable
    inputs: [
      { internalType: "address", name: "minter", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint256", name: "quantity", type: "uint256" },
      {
        internalType: "address[]",
        name: "rewardsRecipients",
        type: "address[]",
      },
      { internalType: "bytes", name: "minterArguments", type: "bytes" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// ABI tối thiểu của Zora Timed Sale Strategy: sale()
const ZORA_TIMED_SALE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "mediaContract", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "sale",
    outputs: [
      {
        components: [
          { internalType: "uint96", name: "price", type: "uint96" },
          { internalType: "uint32", name: "saleStart", type: "uint32" },
          { internalType: "uint32", name: "saleEnd", type: "uint32" },
          { internalType: "uint32", name: "maxPerAddress", type: "uint32" },
          { internalType: "address", name: "fundsRecipient", type: "address" },
        ],
        internalType: "struct TimedSale.Sale",
        name: "",
        type: "tuple",
      },
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

  // Thông tin token: uri, maxSupply, totalMinted
  const { data: tokenInfo, isLoading: isLoadingTokenInfo } = useReadContract({
    abi: ZORA_1155_ABI,
    address: ZORA_1155_CONTRACT,
    functionName: "getTokenInfo",
    args: [ZORA_TOKEN_ID],
    chainId: base.id,
  });

  // Số NFT user đang sở hữu
  const { data: userBalance } = useReadContract({
    abi: ZORA_1155_ABI,
    address: ZORA_1155_CONTRACT,
    functionName: "balanceOf",
    args: address ? [address, ZORA_TOKEN_ID] : undefined,
    chainId: base.id,
  });

  // mintFee (protocol fee)
  const { data: mintFeeData } = useReadContract({
    abi: ZORA_1155_ABI,
    address: ZORA_1155_CONTRACT,
    functionName: "mintFee",
    chainId: base.id,
  });

  // Sale config từ Timed Sale Strategy
  const { data: saleData } = useReadContract({
    abi: ZORA_TIMED_SALE_ABI,
    address: ZORA_TIMED_SALE_MINTER,
    functionName: "sale",
    args: [ZORA_1155_CONTRACT, ZORA_TOKEN_ID],
    chainId: base.id,
  });

  // Parse token info
  let maxSupply: bigint | undefined;
  let totalMinted: bigint | undefined;

  if (tokenInfo) {
    const t = tokenInfo as any;
    maxSupply = t.maxSupply ?? t[1];
    totalMinted = t.totalMinted ?? t[2];
  }

  const owned =
    typeof userBalance === "bigint"
      ? userBalance
      : userBalance
      ? BigInt(userBalance as any)
      : 0n;

  const mintFee =
    typeof mintFeeData === "bigint"
      ? mintFeeData
      : mintFeeData
      ? BigInt(mintFeeData as any)
      : 0n;

  let pricePerToken = 0n;
  if (saleData) {
    const s = saleData as any;
    // struct TimedSale.Sale: (price, saleStart, saleEnd, maxPerAddress, fundsRecipient)
    pricePerToken =
      typeof s.price === "bigint" ? s.price : s.price ? BigInt(s.price) : 0n;
  }

  // progress bar
  let progressPercent: number | null = null;
  if (maxSupply !== undefined && maxSupply > 0n && totalMinted !== undefined) {
    progressPercent = (Number(totalMinted) / Number(maxSupply)) * 100;
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

    if (!mintFeeData || !saleData) {
      setError("Mint configuration not ready. Please try again in a moment.");
      setStatus(null);
      return;
    }

    setStatus("Preparing mint transaction...");
    setError(null);
    setTxHash(null);

    try {
      const quantity = 1n;

      // Tổng value = (mintFee + pricePerToken) * quantity
      const totalCost = (mintFee + pricePerToken) * quantity;

      // rewardsRecipients: [mintReferral, platformReferral] – có thể để user + 0x0
      const rewardsRecipients: `0x${string}`[] = [
        address as `0x${string}`,
        "0x0000000000000000000000000000000000000000",
      ];

      // Timed Sale: minterArguments = abi.encode(address mintTo)
      const minterArguments = encodeAbiParameters(
        [{ type: "address" }],
        [address as `0x${string}`]
      );

      setStatus("Sending mint transaction...");

      const hash = await writeContractAsync({
        abi: ZORA_1155_ABI,
        address: ZORA_1155_CONTRACT,
        functionName: "mint",
        args: [
          ZORA_TIMED_SALE_MINTER,
          ZORA_TOKEN_ID,
          quantity,
          rewardsRecipients,
          minterArguments,
        ],
        chainId: base.id,
        value: totalCost,
      });

      setStatus("Successfully minted the NFT");
      setTxHash(hash);
    } catch (err: any) {
      console.error("Mint error:", err);
      setStatus(null);

      const raw = String(err?.shortMessage || err?.message || "");
      let msg =
        "Mint failed. An error occurred, please try again.";

      const lower = raw.toLowerCase();
      if (lower.includes("user rejected")) {
        msg = "You rejected the transaction in your wallet.";
      } else if (raw.includes("INSUFFICIENT_FUNDS")) {
        msg =
          "Insufficient funds on Base to pay gas and protocol fee.";
      } else if (lower.includes("salestartedafter")) {
        msg = "Sale has not started yet.";
      } else if (lower.includes("saleended")) {
        msg = "Sale has ended.";
      } else if (lower.includes("maxperaddress")) {
        msg = "You reached the mint limit for this drop.";
      }

      setError(`${msg}\n\nDebug: ${raw}`);
    }
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
              src="https://ipfs.io/ipfs/bafybeicnbzidfbfp4f3pwadhj74dl3s2i75dez2nrklfwr4qzfljqztidu/nft-farcaster.png"
              alt="Farcaster TANKA NFT"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-purple-900/60 px-4 py-3 space-y-2 border-t border-white/5">
            <ul className="text-[11px] space-y-1 text-purple-100">
              <li>• Mint Price: Free mint + protocol fee</li>
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

          {address && (
            <p className="text-[11px] text-purple-100 text-center">
              You currently own: {owned.toString()} NFT(s) of this drop.
            </p>
          )}

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
            <div className="rounded-xl border border-red-300/40 bg-red-900/30 px-3 py-2 text-[11px] text-red-100 whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
