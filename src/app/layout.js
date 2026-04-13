import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LoanTrack - ระบบบริหารเงินกู้",
  description: "จัดการบัญชีรายรับรายจ่ายและเงินกู้อัตโนมัติ",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {/* ลบ Sidebar และ flex ต่างๆ ออกให้หมด ปล่อยโล่งๆ แบบนี้ครับ */}
      <body className="m-0 p-0 bg-[#F4F7FE]">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
