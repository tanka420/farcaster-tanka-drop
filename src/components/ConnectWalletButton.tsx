"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

// Hàm rút gọn địa chỉ ví cho đẹp UI
function shorten(address: string) {
  return address.slice(0, 6) + "..." + address.slice(-4);
}

export function ConnectWalletButton() {
  // Lấy thông tin ví qua wagmi (đã được setup sẵn bởi Neynar)
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending: isConnectingWallet } = useConnect();
  const { disconnect } = useDisconnect();

  const [error, setError] = useState<string | null>(null);

  const loading = isConnecting || isConnectingWallet;

  // Hàm connect ví
  const handleConnect = async () => {
    setError(null);

    try {
      // Dùng connector đầu tiên (thường là injected: MetaMask, Rabby, OKX...)
      const connector = connectors[0];
      if (!connector) {
        setError("No wallet connector found. Please install a wallet.");
        return;
      }

      await connect({ connector });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to connect wallet.");
    }
  };

  // Hàm disconnect
  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="flex flex-col items-end space-y-1 text-xs">
      {/* Nếu CHƯA connect ví */}
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:hover:bg-purple-600 text-white font-medium"
        >
          {/* Text hiển thị tiếng Anh */}
          {loading ? "Connecting..." : "Connect wallet"}
        </button>
      ) : (
        // Nếu ĐÃ connect ví
        <div className="flex items-center gap-2">
          {/* Hiển thị địa chỉ ví dạng rút gọn */}
          <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px]">
            {shorten(address!)}
          </div>

          {/* Nút Disconnect */}
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 rounded-full bg-transparent border border-purple-400/70 text-[11px] hover:bg-purple-900/40"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Nếu có lỗi */}
      {error && (
        <span className="text-[10px] text-red-200 max-w-[220px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
