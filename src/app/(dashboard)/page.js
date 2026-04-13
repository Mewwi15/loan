"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Coins,
  CalendarDays,
  Bell,
  ArrowRight,
  PieChart,
  Target,
  Loader2,
  ChevronRight,
  Activity,
  Calendar as CalendarIcon, // เพิ่มไอคอนปฏิทิน
} from "lucide-react";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  // --- 1. เพิ่ม State สำหรับเลือกวันที่ (Default เป็นวันนี้) ---
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [stats, setStats] = useState({
    totalPrincipalInMarket: 0,
    expectedToday: 0,
    profitToday: 0,
    profitMonth: 0,
    pendingTasks: 0,
    pendingAmount: 0,
    collectionRate: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // คำนวณช่วงของเดือนตามวันที่เลือก (สำหรับกำไรรายเดือน)
      const dateObj = new Date(selectedDate);
      const firstDayOfMonth = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        1,
      )
        .toISOString()
        .split("T")[0];
      const lastDayOfMonth = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        0,
      )
        .toISOString()
        .split("T")[0];

      // 1. เงินต้นในตลาด (นับถึงปัจจุบัน)
      const loansSnap = await getDocs(collection(db, "loans"));
      let totalMarket = 0;
      loansSnap.forEach((d) => {
        const data = d.data();
        if (data.status === "active") totalMarket += data.remainingBalance || 0;
      });

      // 2. เป้าเก็บของวันที่เลือก
      const scheduleQ = query(
        collection(db, "schedules"),
        where("dueDate", "==", selectedDate),
      );
      const scheduleSnap = await getDocs(scheduleQ);
      let dayTotalGoal = 0;
      let tasksCount = 0;
      let tasksAmount = 0;
      let collectedAmount = 0;

      scheduleSnap.forEach((doc) => {
        const data = doc.data();
        dayTotalGoal += data.amount;
        if (data.status === "pending") {
          tasksCount++;
          tasksAmount += data.amount;
        } else if (data.status === "paid") {
          collectedAmount += data.amount;
        }
      });

      // 3. กำไรของวันที่เลือก
      const transDayQ = query(
        collection(db, "transactions"),
        where("paymentDate", "==", selectedDate),
      );
      const transDaySnap = await getDocs(transDayQ);
      let dailyProfit = 0;
      transDaySnap.forEach((doc) => {
        const data = doc.data();
        dailyProfit += (data.profitShare || 0) + (data.penalty || 0);
      });

      // 4. กำไรสะสมของเดือนนั้นๆ (ตามวันที่เลือก)
      const transMonthQ = query(
        collection(db, "transactions"),
        where("paymentDate", ">=", firstDayOfMonth),
        where("paymentDate", "<=", lastDayOfMonth),
      );
      const transMonthSnap = await getDocs(transMonthQ);
      let monthlyProfit = 0;
      transMonthSnap.forEach((doc) => {
        const data = doc.data();
        monthlyProfit += (data.profitShare || 0) + (data.penalty || 0);
      });

      setStats({
        totalPrincipalInMarket: totalMarket,
        expectedToday: dayTotalGoal,
        profitToday: dailyProfit,
        profitMonth: monthlyProfit,
        pendingTasks: tasksCount,
        pendingAmount: tasksAmount,
        collectionRate:
          dayTotalGoal > 0
            ? Math.floor((collectedAmount / dayTotalGoal) * 100)
            : 0,
      });
    } catch (error) {
      console.error("Firebase Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // ให้ดึงข้อมูลใหม่ทุกครั้งที่ selectedDate เปลี่ยน

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="font-black text-[10px] uppercase tracking-[0.3em]">
          กำลังโหลดข้อมูลวันที่ {selectedDate}...
        </p>
      </div>
    );

  return (
    <div className="w-full pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500">
      {/* --- Header & Date Picker --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 pt-10">
        <div className="w-full lg:w-auto">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            แผงควบคุมกำไร
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
            {new Date(selectedDate).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* ช่องเลือกวันที่แบบสวยๆ */}
        <div className="w-full lg:w-auto flex items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 gap-3 px-4">
          <CalendarIcon className="w-5 h-5 text-orange-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent outline-none font-black text-gray-700 text-sm cursor-pointer uppercase tracking-widest"
          />
        </div>
      </div>

      {/* --- Top Cards Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-gray-400 tracking-widest mb-1">
            เงินต้นในตลาด
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{stats.totalPrincipalInMarket.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-gray-400 tracking-widest mb-1">
            เป้าเก็บวันนี้
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{stats.expectedToday.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-green-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
            <Coins className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-green-600 tracking-widest mb-1">
            กำไรรวมรายวัน
          </p>
          <p className="text-2xl font-black text-green-600">
            ฿{stats.profitToday.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#1F2335] rounded-[2rem] p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden text-white border border-white/5">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-[14px] font-black uppercase text-orange-400 tracking-widest mb-1">
            กำไรรวมรายเดือน
          </p>
          <p className="text-2xl font-black">
            ฿{stats.profitMonth.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* ปุ่มแจ้งเตือนทวงหนี้ (Debt Follow-up Alert) */}
          <div
            className={`bg-white rounded-[2.5rem] shadow-sm border p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-all ${stats.pendingTasks > 0 ? "border-rose-100" : "border-gray-100 opacity-60"}`}
          >
            {stats.pendingTasks > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-rose-500"></div>
            )}
            <div className="flex items-center gap-6">
              <div
                className={`w-14 h-14 rounded-3xl flex items-center justify-center ${stats.pendingTasks > 0 ? "bg-rose-50 text-rose-500" : "bg-gray-50 text-gray-300"}`}
              >
                <Bell className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800 mb-1">
                  {stats.pendingTasks > 0
                    ? "ภารกิจติดตามหนี้ด่วน!"
                    : "เรียบร้อยดี!"}
                </h3>
                <p className="text-sm font-bold text-gray-500">
                  {stats.pendingTasks > 0
                    ? `วันที่ ${selectedDate} มีลูกค้าต้องตามอีก ${stats.pendingTasks} ราย ยอด ฿${stats.pendingAmount.toLocaleString()}`
                    : `ข้อมูลของวันที่ ${selectedDate} จัดการครบหมดแล้วครับ`}
                </p>
              </div>
            </div>
            {stats.pendingTasks > 0 && (
              <Link
                href="/collections"
                className="w-full md:w-auto bg-rose-500 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3"
              >
                เริ่มทวงหนี้ <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* ประสิทธิภาพการจัดเก็บ */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 p-8 flex flex-col">
            <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-500" />{" "}
              วิเคราะห์การจัดเก็บ
            </h3>
            <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
              <div className="flex justify-between items-end mb-4">
                <p className="text-sm font-black text-gray-500">
                  อัตราจัดเก็บสำเร็จของวันนี้
                </p>
                <p className="text-4xl font-black text-green-500">
                  {stats.collectionRate}%
                </p>
              </div>
              <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all duration-1000"
                  style={{ width: `${stats.collectionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ระบบวิเคราะห์ด้านข้าง --- */}
        <div className="bg-[#1F2335] rounded-[2.5rem] shadow-2xl p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[450px]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 opacity-20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-[0.3em] text-orange-400 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> ระบบวิเคราะห์
            </h3>
            <p className="text-[10px] font-black text-white/30 uppercase mb-10 tracking-widest">
              ข้อมูลเปรียบเทียบเชิงลึก
            </p>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  กำไรรายวัน (Date Selected)
                </p>
                <h2 className="text-5xl font-black text-white tracking-tighter">
                  ฿{stats.profitToday.toLocaleString()}
                </h2>
              </div>
              <div className="w-full h-px bg-white/10"></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  กำไรสะสมของเดือนนี้
                </p>
                <h2 className="text-3xl font-black text-orange-400 tracking-tighter">
                  ฿{stats.profitMonth.toLocaleString()}
                </h2>
              </div>
            </div>
          </div>

          <Link
            href="/loans/war-room"
            className="mt-10 bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-white/10 flex justify-between items-center transition-all group"
          >
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              เปิดหน้าวอติดตามยอด
            </span>
            <ChevronRight className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
