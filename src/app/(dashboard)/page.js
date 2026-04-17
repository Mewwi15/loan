"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Coins,
  Bell,
  ArrowRight,
  PieChart,
  Target,
  Loader2,
  ChevronRight,
  Activity,
  Calendar as CalendarIcon,
  X,
  FileText,
} from "lucide-react";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [activeModal, setActiveModal] = useState(null); // 'principal' | 'target' | 'profit' | 'profitMonth' | null
  const [modalData, setModalData] = useState({
    activeLoans: [],
    dailyTargets: [],
    monthlyProfits: [], // เก็บกำไรแต่ละวันในเดือน
  });

  const [stats, setStats] = useState({
    totalPrincipalInMarket: 0,
    expectedToday: 0,
    collectedAmount: 0,
    expectedProfitToday: 0,
    profitToday: 0,
    profitMonth: 0,
    pendingTasks: 0,
    pendingAmount: 0,
    collectionRate: 0,
  });

  // 🌟 ฟังก์ชันสำหรับเรียงวงจากน้อยไปมาก
  const sortLoansAsc = (arr) => {
    return arr.sort((a, b) => {
      const numA = Number(a.loanNumber);
      const numB = Number(b.loanNumber);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.loanNumber || "").localeCompare(
        String(b.loanNumber || ""),
      );
    });
  };

  // 🌟 ฟังก์ชันเช็คว่าชื่อมีวงเล็บหรือไม่ (ใช้เลือกชื่อที่สมบูรณ์ที่สุด)
  const hasParen = (n) => n && typeof n === "string" && n.includes("(");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // แก้บั๊ก Timezone ของประเทศไทย
      const [year, month] = selectedDate.split("-");
      const firstDayOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const lastDayOfMonth = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

      // ===============================================
      // 1. ดึงข้อมูล Loans และยุบรวมวงที่สร้างซ้ำซ้อน
      // ===============================================
      const loansSnap = await getDocs(collection(db, "loans"));
      let totalMarket = 0;
      const loanMap = new Map();
      const activeLoansMap = new Map();

      loansSnap.forEach((d) => {
        const data = d.data();
        if (!data.customerId) return; // ล็อกชั้นที่ 1: ต้องมี ID ลูกค้า

        loanMap.set(d.id, data);

        if (data.status === "active") {
          // สร้าง Key เพื่อเช็คว่าลูกค้าคนนี้ วงที่นี้ นับไปหรือยัง
          const key = `${data.customerId}_${data.loanNumber}`;
          const existing = activeLoansMap.get(key);

          if (!existing) {
            activeLoansMap.set(key, { id: d.id, ...data });
          } else {
            // ถ้าซ้ำ ให้เลือกอันที่มีวงเล็บ
            if (
              !hasParen(existing.customerName) &&
              hasParen(data.customerName)
            ) {
              activeLoansMap.set(key, { id: d.id, ...data });
            }
          }
        }
      });

      const activeLoansList = Array.from(activeLoansMap.values());
      activeLoansList.forEach((loan) => {
        totalMarket += loan.remainingBalance || 0;
      });

      // ===============================================
      // 2. ดึงเป้าเก็บและกำไรรายวัน (พร้อมระบบยุบรวมบิลซ้ำ)
      // ===============================================
      const scheduleQ = query(
        collection(db, "schedules"),
        where("dueDate", "==", selectedDate),
      );
      const scheduleSnap = await getDocs(scheduleQ);

      const dailyTargetsMap = new Map();

      scheduleSnap.forEach((doc) => {
        const data = doc.data();
        const parentLoan = loanMap.get(data.loanId);

        // ล็อกชั้นที่ 2: ต้องมีวงแม่และ ID ลูกค้า
        if (!data.customerId || !parentLoan) return;
        if (data.status === "pending" && parentLoan.status === "closed") return;

        const lNum = data.loanNumber || parentLoan.loanNumber || "-";

        // 🌟 Key กรองบิลซ้ำ: รหัสลูกค้า + เลขวง + งวดที่
        const key = `${data.customerId}_${lNum}_${data.installmentNo}`;
        const existing = dailyTargetsMap.get(key);

        if (!existing) {
          dailyTargetsMap.set(key, { id: doc.id, ...data, loanNumber: lNum });
        } else {
          // ถ้ามีบิลซ้ำ
          if (existing.status !== "paid" && data.status === "paid") {
            dailyTargetsMap.set(key, { id: doc.id, ...data, loanNumber: lNum });
          } else if (existing.status === data.status) {
            if (
              !hasParen(existing.customerName) &&
              hasParen(data.customerName)
            ) {
              dailyTargetsMap.set(key, {
                id: doc.id,
                ...data,
                loanNumber: lNum,
              });
            }
          }
        }
      });

      let dayTotalGoal = 0;
      let expectedProfitToday = 0;
      let tasksCount = 0;
      let tasksAmount = 0;
      let collectedAmount = 0;
      let actualProfitFromSchedules = 0;
      const dailyTargetsList = Array.from(dailyTargetsMap.values());

      // คำนวณจากบิลที่ผ่านการ "ยุบรวมและกรองเรียบร้อยแล้ว"
      dailyTargetsList.forEach((data) => {
        dayTotalGoal += data.amount || 0;
        expectedProfitToday += data.profitShare || 0;

        if (data.status === "pending") {
          tasksCount++;
          tasksAmount += data.amount || 0;
        } else if (data.status === "paid") {
          collectedAmount += data.amount || 0;
          actualProfitFromSchedules += data.profitShare || 0;
        }
      });

      // 3. กำไรจากค่าปรับเฉพาะของวันนี้ (พร้อมกรองบิลซ้ำ)
      const transDayQ = query(
        collection(db, "transactions"),
        where("paymentDate", "==", selectedDate),
      );
      const transDaySnap = await getDocs(transDayQ);

      const transDayMap = new Map();
      transDaySnap.forEach((doc) => {
        const data = doc.data();
        if (!data.customerId || !loanMap.has(data.loanId)) return;
        // ป้องกันแอดมินกดเบิ้ลค่าปรับ
        const key = `${data.customerId}_${data.loanId}_${data.installmentNo}`;
        transDayMap.set(key, data);
      });

      let penaltyToday = 0;
      transDayMap.forEach((data) => (penaltyToday += data.penalty || 0));

      // ===============================================
      // 4. กำไรสะสมของเดือน (พร้อมระบบยุบรวมบิลซ้ำ)
      // ===============================================
      const monthSchedulesQ = query(
        collection(db, "schedules"),
        where("dueDate", ">=", firstDayOfMonth),
        where("dueDate", "<=", lastDayOfMonth),
      );
      const monthSchedulesSnap = await getDocs(monthSchedulesQ);

      const monthSchedulesMap = new Map();

      monthSchedulesSnap.forEach((doc) => {
        const data = doc.data();
        const parentLoan = loanMap.get(data.loanId);

        if (!data.customerId || !parentLoan) return;

        const lNum = data.loanNumber || parentLoan.loanNumber || "-";
        const key = `${data.customerId}_${lNum}_${data.installmentNo}`;

        const existing = monthSchedulesMap.get(key);
        if (!existing) {
          monthSchedulesMap.set(key, data);
        } else {
          if (existing.status !== "paid" && data.status === "paid") {
            monthSchedulesMap.set(key, data);
          } else if (existing.status === data.status) {
            if (
              !hasParen(existing.customerName) &&
              hasParen(data.customerName)
            ) {
              monthSchedulesMap.set(key, data);
            }
          }
        }
      });

      let monthlyProfit = 0;
      const dailyProfitMap = new Map();
      for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${year}-${month}-${String(i).padStart(2, "0")}`;
        dailyProfitMap.set(dateStr, 0);
      }

      monthSchedulesMap.forEach((data) => {
        if (data.status === "paid") {
          const profit = data.profitShare || 0;
          monthlyProfit += profit;
          if (dailyProfitMap.has(data.dueDate)) {
            dailyProfitMap.set(
              data.dueDate,
              dailyProfitMap.get(data.dueDate) + profit,
            );
          }
        }
      });

      // 5. บวก "ค่าปรับ" (Penalty) ของเดือน
      const transMonthQ = query(
        collection(db, "transactions"),
        where("paymentDate", ">=", firstDayOfMonth),
        where("paymentDate", "<=", lastDayOfMonth),
      );
      const transMonthSnap = await getDocs(transMonthQ);

      const transMonthMap = new Map();
      transMonthSnap.forEach((doc) => {
        const data = doc.data();
        if (!data.customerId || !loanMap.has(data.loanId)) return;
        const key = `${data.customerId}_${data.loanId}_${data.installmentNo}`;
        transMonthMap.set(key, data);
      });

      transMonthMap.forEach((data) => {
        const penalty = data.penalty || 0;
        if (penalty > 0) {
          monthlyProfit += penalty;
          const pDate = data.paymentDate;
          if (pDate && dailyProfitMap.has(pDate)) {
            dailyProfitMap.set(pDate, dailyProfitMap.get(pDate) + penalty);
          }
        }
      });

      const monthlyProfitsList = Array.from(dailyProfitMap.entries())
        .map(([date, profitValue]) => ({ date, profitValue }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats({
        totalPrincipalInMarket: totalMarket,
        expectedToday: dayTotalGoal,
        collectedAmount: collectedAmount,
        expectedProfitToday: expectedProfitToday,
        profitToday: actualProfitFromSchedules + penaltyToday,
        profitMonth: monthlyProfit,
        pendingTasks: tasksCount,
        pendingAmount: tasksAmount,
        collectionRate:
          dayTotalGoal > 0
            ? Math.floor((collectedAmount / dayTotalGoal) * 100)
            : 0,
      });

      setModalData({
        activeLoans: sortLoansAsc(activeLoansList),
        dailyTargets: sortLoansAsc(dailyTargetsList),
        monthlyProfits: monthlyProfitsList,
      });
    } catch (error) {
      console.error("Firebase Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDateThai = (dateString) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
    <div className="w-full pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 relative">
      {/* --- Header & Date Picker --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 pt-10">
        <div className="w-full lg:w-auto">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            แผงควบคุมกำไร
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">
            {formatDateThai(selectedDate)}
          </p>
        </div>

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
        {/* 🌟 เงินต้นในตลาด */}
        <div
          onClick={() => setActiveModal("principal")}
          className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all group"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
            เงินต้นในตลาด <FileText className="w-3 h-3 text-gray-300" />
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{stats.totalPrincipalInMarket.toLocaleString()}
          </p>
          <span className="text-[9px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
            คลิกดูรายวง
          </span>
        </div>

        {/* 🌟 เป้าเก็บวันนี้ */}
        <div
          onClick={() => setActiveModal("target")}
          className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-200 transition-all group"
        >
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
            เป้าเก็บวันนี้ <FileText className="w-3 h-3 text-gray-300" />
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{stats.expectedToday.toLocaleString()}
          </p>
          <span className="text-[9px] font-bold text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full">
            คลิกดูยอดต่องวด
          </span>
        </div>

        {/* 🌟 กำไรรวมรายวัน */}
        <div
          onClick={() => setActiveModal("profit")}
          className="bg-white rounded-[2rem] p-8 shadow-sm border border-green-50 flex flex-col items-center text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-green-200 transition-all group"
        >
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Coins className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-[14px] font-black uppercase text-green-600 tracking-widest mb-1 flex items-center gap-1">
            กำไรรวมรายวัน <FileText className="w-3 h-3 text-green-300" />
          </p>
          <p className="text-2xl font-black text-green-600">
            ฿{stats.profitToday.toLocaleString()}
          </p>
          <span className="text-[9px] font-bold text-green-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">
            คลิกดูรายละเอียด
          </span>
        </div>

        {/* 🌟 กำไรรวมรายเดือน */}
        <div
          onClick={() => setActiveModal("profitMonth")}
          className="bg-[#1F2335] rounded-[2rem] p-8 shadow-xl flex flex-col items-center text-center relative overflow-hidden text-white border border-white/5 cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-orange-500/50 transition-all group"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-orange-400" />
          </div>
          <p className="text-[14px] font-black uppercase text-orange-400 tracking-widest mb-1 flex items-center gap-1">
            กำไรรวมรายเดือน <FileText className="w-3 h-3 text-orange-300" />
          </p>
          <p className="text-2xl font-black">
            ฿{stats.profitMonth.toLocaleString()}
          </p>
          <span className="text-[9px] font-bold text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity mt-2 uppercase tracking-widest bg-orange-500/20 px-2 py-0.5 rounded-full">
            คลิกดูยอดแต่ละวัน
          </span>
        </div>
      </div>

      {/* --- ก้อนล่างสุด (ภารกิจ & วิเคราะห์) --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
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

      {/* ======================================================== */}
      {/* 🌟🌟 MODALS: หน้าต่างแสดงรายละเอียด 🌟🌟 */}
      {/* ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          ></div>

          <div className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header Modal */}
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                  {activeModal === "principal" && (
                    <>
                      <Wallet className="w-6 h-6 text-blue-500" /> เงินต้นในตลาด
                    </>
                  )}
                  {activeModal === "target" && (
                    <>
                      <Target className="w-6 h-6 text-orange-500" />{" "}
                      เป้าเก็บรายวัน
                    </>
                  )}
                  {activeModal === "profit" && (
                    <>
                      <Coins className="w-6 h-6 text-green-500" /> เป้ากำไร
                      (ยอดเขียว)
                    </>
                  )}
                  {activeModal === "profitMonth" && (
                    <>
                      <TrendingUp className="w-6 h-6 text-orange-500" />{" "}
                      กำไรแต่ละวัน
                    </>
                  )}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {activeModal === "principal"
                    ? "แสดงเฉพาะวงกู้ที่กำลังดำเนินการ (กรองยอดซ้ำแล้ว)"
                    : activeModal === "profitMonth"
                      ? `สรุปยอดกำไรรายวัน ประจำเดือน ${new Date(selectedDate).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`
                      : `ดึงจากตารางดิว ประจำวันที่ ${formatDateThai(selectedDate)} (กรองยอดซ้ำแล้ว)`}
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2.5 bg-white border border-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Table Content */}
            <div className="overflow-y-auto flex-1 bg-white p-2">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    {activeModal === "profitMonth" ? (
                      <>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4 text-center">วันที่</th>
                        <th className="px-6 py-4 text-right">กำไรที่เก็บได้</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">ชื่อลูกค้า</th>
                        <th className="px-6 py-4 text-center">วงที่</th>
                        <th className="px-6 py-4 text-right">
                          {activeModal === "principal" && "จำนวนเงิน (คงเหลือ)"}
                          {activeModal === "target" && "ยอดเก็บต่องวด"}
                          {activeModal === "profit" && "ยอดเขียว (กำไร)"}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* --- กรณีเงินต้นในตลาด --- */}
                  {activeModal === "principal" &&
                    modalData.activeLoans.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-gray-300">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-black text-gray-700">
                          {item.customerName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-500 text-center">
                          {item.loanNumber || "-"}
                        </td>
                        <td className="px-6 py-4 font-black text-blue-500 text-right">
                          ฿{(item.remainingBalance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                  {/* --- กรณียอดเก็บต่องวด --- */}
                  {activeModal === "target" &&
                    modalData.dailyTargets.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-orange-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-gray-300">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-black text-gray-700">
                          {item.customerName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-500 text-center">
                          {item.loanNumber || "-"}
                        </td>
                        <td className="px-6 py-4 font-black text-orange-500 text-right">
                          ฿{(item.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                  {/* --- กรณีกำไรรายวัน --- */}
                  {activeModal === "profit" &&
                    modalData.dailyTargets.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-green-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-gray-300">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-black text-gray-700">
                          {item.customerName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-500 text-center">
                          {item.loanNumber || "-"}
                        </td>
                        <td className="px-6 py-4 font-black text-green-500 text-right">
                          +฿{(item.profitShare || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                  {/* 🌟 กรณีกำไรรายเดือน (แสดงรายวัน 1-31) */}
                  {activeModal === "profitMonth" &&
                    modalData.monthlyProfits.map((item, idx) => (
                      <tr
                        key={item.date}
                        className={`transition-colors ${item.profitValue > 0 ? "hover:bg-orange-50/50" : "opacity-60 bg-gray-50/30"}`}
                      >
                        <td className="px-6 py-4 text-xs font-bold text-gray-300">
                          {idx + 1}
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-black text-center ${item.profitValue > 0 ? "text-gray-700" : "text-gray-400"}`}
                        >
                          {formatDateThai(item.date)}
                        </td>
                        <td
                          className={`px-6 py-4 font-black text-right ${item.profitValue > 0 ? "text-orange-500" : "text-gray-400"}`}
                        >
                          {item.profitValue > 0
                            ? `+฿${item.profitValue.toLocaleString()}`
                            : "฿0"}
                        </td>
                      </tr>
                    ))}

                  {/* ว่างเปล่า */}
                  {((activeModal === "principal" &&
                    modalData.activeLoans.length === 0) ||
                    (activeModal === "target" &&
                      modalData.dailyTargets.length === 0) ||
                    (activeModal === "profit" &&
                      modalData.dailyTargets.length === 0)) && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-10 text-center text-sm font-bold text-gray-400"
                      >
                        ไม่มีข้อมูลในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 🌟 Footer: สรุปยอดบรรทัดสุดท้าย */}
            <div className="p-6 md:p-8 bg-[#1F2335] text-white flex flex-col md:flex-row md:justify-between items-start md:items-center rounded-b-[2.5rem] gap-4">
              <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  สรุปผลบวกจากตารางด้านบน
                </p>
                {activeModal === "target" && (
                  <p className="text-[10px] font-bold text-gray-400">
                    เก็บได้จริงแล้ววันนี้:{" "}
                    <span className="text-green-400 font-black">
                      ฿{stats.collectedAmount.toLocaleString()}
                    </span>
                  </p>
                )}
                {activeModal === "profit" && (
                  <p className="text-[10px] font-bold text-gray-400">
                    กำไรที่เก็บได้จริงวันนี้:{" "}
                    <span className="text-green-400 font-black">
                      ฿{stats.profitToday.toLocaleString()}
                    </span>
                  </p>
                )}
                {activeModal === "profitMonth" && (
                  <p className="text-[10px] font-bold text-gray-400">
                    รวมข้อมูลจาก:{" "}
                    <span className="text-orange-400 font-black">
                      {modalData.monthlyProfits.length} วัน
                    </span>
                  </p>
                )}
              </div>

              <div className="text-left md:text-right w-full md:w-auto">
                <p
                  className={`text-3xl font-black ${
                    activeModal === "principal"
                      ? "text-blue-400"
                      : activeModal === "target"
                        ? "text-orange-400"
                        : activeModal === "profitMonth"
                          ? "text-orange-500"
                          : "text-green-400"
                  }`}
                >
                  {activeModal === "principal" &&
                    `฿${stats.totalPrincipalInMarket.toLocaleString()}`}
                  {activeModal === "target" &&
                    `฿${stats.expectedToday.toLocaleString()}`}
                  {activeModal === "profit" &&
                    `฿${stats.expectedProfitToday.toLocaleString()}`}
                  {activeModal === "profitMonth" &&
                    `฿${stats.profitMonth.toLocaleString()}`}
                </p>

                {/* 🌟 แจ้งเตือนส่วนที่ขาดเป้า */}
                {activeModal === "target" &&
                  stats.expectedToday - stats.collectedAmount > 0 && (
                    <p className="text-xs font-black text-rose-400 mt-1 uppercase tracking-widest bg-rose-500/20 px-3 py-1.5 rounded-lg inline-block w-full md:w-auto text-center">
                      ขาดอีก ฿
                      {(
                        stats.expectedToday - stats.collectedAmount
                      ).toLocaleString()}
                    </p>
                  )}
                {activeModal === "target" &&
                  stats.expectedToday > 0 &&
                  stats.expectedToday - stats.collectedAmount <= 0 && (
                    <p className="text-xs font-black text-green-400 mt-1 uppercase tracking-widest bg-green-500/20 px-3 py-1.5 rounded-lg inline-block w-full md:w-auto text-center">
                      ✅ เก็บครบเป้าแล้ว
                    </p>
                  )}

                {activeModal === "profit" &&
                  stats.expectedProfitToday - stats.profitToday > 0 && (
                    <p className="text-xs font-black text-rose-400 mt-1 uppercase tracking-widest bg-rose-500/20 px-3 py-1.5 rounded-lg inline-block w-full md:w-auto text-center">
                      ขาดอีก ฿
                      {(
                        stats.expectedProfitToday - stats.profitToday
                      ).toLocaleString()}
                    </p>
                  )}
                {activeModal === "profit" &&
                  stats.expectedProfitToday > 0 &&
                  stats.expectedProfitToday - stats.profitToday <= 0 && (
                    <p className="text-xs font-black text-green-400 mt-1 uppercase tracking-widest bg-green-500/20 px-3 py-1.5 rounded-lg inline-block w-full md:w-auto text-center">
                      ✅ กำไรครบเป้าแล้ว
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
