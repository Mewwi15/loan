"use client";

import { useState, useEffect } from "react";
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
  HandCoins,
  PlusCircle,
  ShieldCheck, // 🌟 เพิ่มไอคอนโล่ความปลอดภัย
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path) => pathname === path;

  // ปิด Sidebar อัตโนมัติเวลากดเปลี่ยนหน้าบนมือถือ
  const handleLinkClick = () => setIsOpen(false);

  // ล็อกการ Scroll ของหน้าจอหลักเวลาเปิดเมนูบนมือถือ
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* 🌟 ปุ่ม Hamburger Menu (โชว์บน iPad และมือถือ) */}
      <button
        onClick={() => setIsOpen(true)}
        className="xl:hidden fixed top-4 left-4 z-40 p-2.5 bg-[#2B3044] text-white rounded-xl shadow-lg hover:bg-gray-800 transition-all active:scale-95"
        aria-label="Open Menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* 🌟 ฉากหลังเบลอเวลาเปิดเมนูบนมือถือ */}
      {isOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 🌟 Sidebar หลัก */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2B3044] text-white flex flex-col h-screen transform transition-transform duration-300 ease-in-out xl:translate-x-0 shadow-2xl xl:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ส่วนหัว Logo (ฟิกซ์ตายตัว) */}
        <div className="p-6 relative shrink-0 flex items-center justify-between">
          <h1 className="text-2xl font-black flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-[0.8rem] shadow-lg shadow-orange-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            LoanTrack
          </h1>

          {/* ปุ่ม X ปิดเมนู (มือถือ) */}
          <button
            onClick={() => setIsOpen(false)}
            className="xl:hidden p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🌟 โซนเมนู (Scroll ได้อิสระ) */}
        <nav className="flex-1 overflow-y-auto px-6 space-y-8 pb-10 custom-scrollbar">
          {/* โซนที่ 1: ทั่วไป */}
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-4">
              Main Menu
            </div>

            <Link
              href="/"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/customers"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/customers")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>ลูกค้าทั้งหมด</span>
            </Link>
          </div>

          {/* โซนที่ 2: ระบบเงินกู้ */}
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-4">
              Loan System
            </div>

            <Link
              href="/loans/new"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/loans/new")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <FileSignature className="w-5 h-5" />
              <span>สร้างสัญญาใหม่</span>
            </Link>

            <Link
              href="/loans/daily-check"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/loans/daily-check")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>บันทึกรายวัน</span>
            </Link>

            <Link
              href="/collections"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/collections")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <PhoneCall className="w-5 h-5" />
              <span>ติดตามทวงถาม</span>
            </Link>

            <Link
              href="/loans/war-room"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/loans/war-room")
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>หน้าวอร์</span>
            </Link>
          </div>

          {/* โซนที่ 3: ระบบวงแชร์ */}
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-4">
              Share System
            </div>

            <Link
              href="/shares"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/shares")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <HandCoins className="w-5 h-5" />
              <span>แผงควบคุมวงแชร์</span>
            </Link>

            <Link
              href="/shares/new"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/shares/new")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>เปิดวงแชร์ใหม่</span>
            </Link>
          </div>

          {/* 🌟 โซนที่ 4: การตั้งค่าระบบ (เพิ่มใหม่) */}
          <div className="space-y-2">
            <div className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-4">
              Settings
            </div>

            <Link
              href="/settings"
              onClick={handleLinkClick}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
                isActive("/settings")
                  ? "bg-gray-700 text-white shadow-lg shadow-gray-900/50 font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5 font-bold"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>ความปลอดภัย</span>
            </Link>
          </div>
        </nav>

        {/* 🌟 โปรไฟล์แอดมิน (ฟิกซ์ติดขอบล่างเสมอ) */}
        <div className="p-6 shrink-0 border-t border-white/5 bg-[#2B3044] mt-auto">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-[1.2rem] p-3 cursor-pointer hover:bg-white/10 transition-all group">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex justify-center items-center font-black text-white shadow-inner group-hover:scale-105 transition-transform shrink-0">
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
