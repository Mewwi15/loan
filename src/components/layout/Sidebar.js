"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSignature,
  Wallet,
  Menu,
  X,
  PhoneCall,
  Activity,
  CheckSquare,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path) => pathname === path;

  // ปิด Sidebar อัตโนมัติเวลากดเปลี่ยนหน้า
  const handleLinkClick = () => setIsOpen(false);

  return (
    <>
      {/* 🌟 ปุ่ม Hamburger Menu (โชว์บน iPad และมือถือ) */}
      <button
        onClick={() => setIsOpen(true)}
        className="xl:hidden fixed top-4 left-4 z-40 p-2.5 bg-[#2B3044] text-white rounded-xl shadow-lg hover:bg-gray-800 transition-all active:scale-95"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* 🌟 ฉากหลังเบลอ */}
      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🌟 Sidebar หลัก */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2B3044] text-white flex flex-col justify-between h-screen transform transition-transform duration-300 ease-in-out xl:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 relative">
          {/* ปุ่ม X ปิดเมนู */}
          <button
            onClick={() => setIsOpen(false)}
            className="xl:hidden absolute top-6 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h1 className="text-2xl font-black mb-10 flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-[0.8rem] shadow-lg shadow-orange-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            LoanTrack
          </h1>

          <nav className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-4">
              Main Menu
            </div>

            <Link
              href="/"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/customers"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/customers") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <Users className="w-5 h-5" />
              <span>ลูกค้า</span>
            </Link>

            <Link
              href="/loans/new"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/loans/new") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <FileSignature className="w-5 h-5" />
              <span>สร้างสัญญาใหม่</span>
            </Link>

            <Link
              href="/loans/daily-check"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/daily-check") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>บันทึกรายวัน</span>
            </Link>

            <Link
              href="/collections"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/collections") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <PhoneCall className="w-5 h-5" />
              <span>ติดตามทวงถาม</span>
            </Link>

            <Link
              href="/loans/war-room"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive("/loans/war-room") ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 font-black" : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"}`}
            >
              <Activity className="w-5 h-5" />
              <span>หน้าวอ</span>
            </Link>
          </nav>
        </div>

        {/* โปรไฟล์แอดมิน */}
        <div className="p-6">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[1.2rem] p-3 cursor-pointer hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex justify-center items-center font-black text-white shadow-inner group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate tracking-tight">
                ผู้ดูแลระบบ
              </p>
              <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">
                Admin Mode
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
