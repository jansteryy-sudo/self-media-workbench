import type { Metadata } from "next";
import CreatorDemo from "@/components/creator-demo/studio-v2";
export const metadata: Metadata = {
  title: "自媒体工作台",
  description: "面向小红书、抖音和公众号的自媒体运营工作台交互演示。",
};
export default function StudioPage() {
  return <CreatorDemo />;
}
