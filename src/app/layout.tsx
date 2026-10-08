import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "小鱼自媒体工作台",
  description: "多平台账号运营、内容制作与知识沉淀的本地工作空间。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('workbench-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch{}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
