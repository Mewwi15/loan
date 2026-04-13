import Sidebar from "@/components/layout/Sidebar";
import { LogOut } from "lucide-react";

export default function DashboardLayout({ children }) {
  return (
    // เปลี่ยนเป็น overflow-hidden ที่ตัวแม่สุด เพื่อป้องกันหน้าจอหลักเลื่อน
    <div className="flex h-screen bg-[#F4F7FE] font-sans overflow-hidden w-full">
      <Sidebar />

      {/* แก้ไขสำคัญ: 
        1. เปลี่ยน ml-64 เป็น md:ml-64 (มือถือไม่ต้องดันซ้าย, คอมค่อยดัน)
        2. ใส่ w-full เพื่อป้องกันไม่ให้มันโดนบีบ
      */}
      <main className="flex-1 md:ml-64 flex flex-col w-full transition-all duration-300">
        {/* Header - ปรับให้ Responsive */}
        <header className="h-16 md:h-20 bg-white flex items-center justify-between px-4 md:px-8 border-b border-gray-100 shrink-0">
          {/* บนมือถือ ผมใส่ ml-12 เพื่อเว้นที่ให้ปุ่มเมนู Hamburger ไม่ทับตัวหนังสือ */}
          <h2 className="text-lg md:text-xl font-bold text-gray-700 ml-12 md:ml-0">
            ภาพรวมระบบ
          </h2>
        </header>

        {/* พื้นที่เนื้อหาหลัก (Content Area) 
          ส่วนนี้แหละที่จะเลื่อนขึ้นลงได้ (overflow-y-auto)
        */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
