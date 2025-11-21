"use client";

import { useEffect } from "react";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { HomeTab } from "~/components/ui/tabs"; // chỉ dùng HomeTab
import { useNeynarUser } from "../hooks/useNeynarUser";

// Có thể giữ AppProps nếu sau này muốn truyền title từ ngoài
export interface AppProps {
  title?: string;
}

export default function App({ title = "Farcaster TANKA Drop" }: AppProps) {
  const { isSDKLoaded, context } = useMiniApp();

  const { user: neynarUser } = useNeynarUser(context || undefined);

  // Nếu cần làm gì đó khi SDK load xong thì để đây, hiện tại không bắt buộc
  useEffect(() => {
    // no-op
  }, []);

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p>Loading SDK...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >

      {/* Không còn Footer + Tabs, chỉ render HomeTab full screen */}
      <div className="w-full">
        <HomeTab />
      </div>
    </div>
  );
}
