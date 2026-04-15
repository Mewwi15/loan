import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 🌟 นำเข้า AuthGuard จากโฟลเดอร์ components (เช็ค Path ให้ตรงกับโปรเจกต์คุณนะครับ)
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="m-0 p-0 bg-[#F4F7FE]">
        {/* 🌟 เรียกใช้ AuthGuard ห่อหุ้มเนื้อหาทั้งหมดไว้ข้างใน body */}
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
