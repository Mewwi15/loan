"use client"; // 🌟 สำคัญมาก ต้องมีบรรทัดนี้เพราะมีการใช้ onClick และ window

import Sidebar from "@/components/layout/Sidebar"; // เช็ค Path ให้ตรงกับที่คุณเก็บไฟล์ Sidebar ไว้นะครับ
import { LogOut } from "lucide-react";

export default function DashboardLayout({ children }) {
  // 🌟 ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      // ล้างข้อมูลเซสชัน
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("loginTimestamp");
      // รีเฟรชหน้าเพื่อให้ AuthGuard ทำงานและเด้งกลับไปหน้าล็อกอิน
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans overflow-hidden w-full relative">
      <Sidebar />

      {/* 🌟 แก้ไขสำคัญ: เปลี่ยนจาก lg:ml-[280px] เป็น xl:ml-64 ให้ตรงกันเป๊ะๆ */}
      <main className="flex-1 xl:ml-64 flex flex-col min-w-0 transition-all duration-300 relative z-10 bg-white/50">
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 border-b border-gray-100 shrink-0 sticky top-0 z-20">
          {/* 🌟 เว้นระยะทางซ้ายหลบปุ่ม Hamburger บน iPad (ml-14) แต่คอมพิวเตอร์ไม่ต้องเว้น (xl:ml-0) */}
          <h2 className="text-lg lg:text-xl font-black text-gray-800 tracking-tight ml-14 xl:ml-0">
            ระบบจัดการวงกู้
          </h2>

          {/* 🌟 เอาปุ่มออกจากระบบมาไว้มุมขวาบนตรงนี้ครับ */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 border border-gray-100 hover:border-rose-200 text-gray-500 hover:text-rose-500 rounded-xl transition-all shadow-sm active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </header>

        {/* พื้นที่เนื้อหาหลัก (Content Area) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
