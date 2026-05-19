"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  CheckCircle2,
  Calendar,
  Search,
  Save,
  UserCheck,
  Loader2,
  TrendingUp,
  Landmark,
  MessageCircle,
} from "lucide-react";

export default function DailyCheckPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dailyQueue, setDailyQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // 🌟 ฟังก์ชันบังคับเปิดแอป Messenger
  // ==========================================
  const handleOpenMessenger = (e, fullLink) => {
    e.preventDefault();
    e.stopPropagation();

    if (!fullLink) return;

    const cleanLink = fullLink.split("?")[0].replace(/\/$/, "");
    const match = cleanLink.match(/\d+$/);
    const chatID = match ? match[0] : null;

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    if (chatID) {
      if (isAndroid) {
        window.location.href = `intent://messages/t/${chatID}#Intent;package=com.facebook.orca;scheme=https;end;`;
      } else if (isIOS) {
        window.location.href = `fb-messenger://user-thread/${chatID}`;
        setTimeout(() => {
          window.open(fullLink, "_blank");
        }, 2500);
      } else {
        window.open(fullLink, "_blank");
      }
    } else {
      window.open(fullLink, "_blank");
    }
  };

  const fetchDailyJobs = useCallback(async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const loansQ = query(
        collection(db, "loans"),
        where("status", "==", "active"),
      );
      const loansSnap = await getDocs(loansQ);
      const activeLoansMap = new Map();
      loansSnap.forEach((docSnap) =>
        activeLoansMap.set(docSnap.id, docSnap.data()),
      );

      const schedulesQ = query(
        collection(db, "schedules"),
        where("status", "==", "pending"),
      );
      const schedulesSnap = await getDocs(schedulesQ);

      const earliestPendingMap = new Map();

      schedulesSnap.forEach((docSnap) => {
        const data = docSnap.data();

        if (activeLoansMap.has(data.loanId)) {
          if (data.dueDate <= selectedDate) {
            const currentEarliest = earliestPendingMap.get(data.loanId);

            const currentInstNo = Number(data.installmentNo);
            const earliestInstNo = currentEarliest
              ? Number(currentEarliest.installmentNo)
              : null;

            if (!currentEarliest || currentInstNo < earliestInstNo) {
              earliestPendingMap.set(data.loanId, {
                id: docSnap.id,
                ...data,
                installmentNo: currentInstNo,
              });
            }
          }
        }
      });

      const jobs = [];
      const seenSet = new Set();

      for (const [loanId, schedule] of earliestPendingMap.entries()) {
        const loanData = activeLoansMap.get(loanId);

        const cleanName = String(loanData.customerName || "")
          .split("(")[0]
          .replace(/\s+/g, "")
          .toLowerCase();

        const cleanLoanNum = String(loanData.loanNumber || "")
          .replace(/\s+/g, "")
          .toLowerCase();

        const instNo = Number(schedule.installmentNo);
        const amount = Number(schedule.amount);

        const uniqueKey = `${cleanName}-${cleanLoanNum}-${instNo}-${amount}`;

        if (!seenSet.has(uniqueKey)) {
          seenSet.add(uniqueKey);

          jobs.push({
            id: schedule.id,
            loanId: loanId,
            ...schedule,
            customerId: schedule.customerId || loanData.customerId || null,
            remainingBefore: loanData.remainingBalance,
            loanNumber: loanData.loanNumber || "-",
            loanName: loanData.loanName || loanData.customerName,
            bankName: loanData.bankName || "ไม่ระบุ",
            bankOwner: loanData.bankOwner || "ไม่ระบุ",
            bankColor: loanData.bankColor || "#cbd5e1",
            isChecked: false,
            penalty: 0,
            isOverdue: schedule.dueDate < selectedDate,
            chatLink: loanData.chatLink || null,
          });
        }
      }

      jobs.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;

        const numA =
          parseInt(String(a.loanNumber || "999999").trim(), 10) || 999999;
        const numB =
          parseInt(String(b.loanNumber || "999999").trim(), 10) || 999999;
        return numA - numB;
      });

      setDailyQueue(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      alert("ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDailyJobs();
  }, [fetchDailyJobs]);

  const toggleCheck = (id) => {
    setDailyQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item,
      ),
    );
  };

  const filteredQueue = dailyQueue.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(searchLower) ||
      item.loanName.toLowerCase().includes(searchLower) ||
      item.loanNumber.toString().includes(searchLower)
    );
  });

  const handleConfirmPayments = async () => {
    const itemsToPay = dailyQueue.filter((item) => item.isChecked);
    if (itemsToPay.length === 0)
      return alert("กรุณาเลือกอย่างน้อย 1 รายการเพื่อบันทึก");

    if (
      !window.confirm(
        `ยืนยันการตัดยอดทั้งหมด ${itemsToPay.length} รายการ? (ระบบจะบันทึกกำไรอัตโนมัติ)`,
      )
    )
      return;

    setIsSaving(true);
    const batch = writeBatch(db);

    try {
      for (const item of itemsToPay) {
        const scheduleRef = doc(db, "schedules", item.id);
        batch.update(scheduleRef, {
          status: "paid",
          paidAt: serverTimestamp(),
          appliedPenalty: 0,
        });

        const loanRef = doc(db, "loans", item.loanId);
        const newBalance = item.remainingBefore - item.amount;

        const loanUpdateData = {
          remainingBalance: increment(-item.amount),
          currentInstallment: increment(1),
        };

        if (newBalance <= 0) {
          loanUpdateData.status = "closed";
          loanUpdateData.closedAt = new Date().toISOString();
        }

        batch.update(loanRef, loanUpdateData);

        if (item.customerId) {
          const customerRef = doc(db, "customers", item.customerId);
          batch.update(customerRef, {
            totalDebt: increment(-item.amount),
          });
        } else {
          const customerQuery = query(
            collection(db, "customers"),
            where("name", "==", item.customerName),
          );
          const customerSnap = await getDocs(customerQuery);
          if (!customerSnap.empty) {
            const customerRef = doc(db, "customers", customerSnap.docs[0].id);
            batch.update(customerRef, {
              totalDebt: increment(-item.amount),
            });
          }
        }

        const transRef = doc(collection(db, "transactions"));
        batch.set(transRef, {
          loanId: item.loanId,
          customerId: item.customerId || null,
          customerName: item.customerName,
          amountPaid: item.amount,
          profitShare: item.profitShare || 0,
          penalty: 0,
          installmentNo: item.installmentNo,
          paymentDate: selectedDate,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      alert("✅ ตัดยอดและบันทึกกำไรเรียบร้อยแล้ว");
      fetchDailyJobs();
    } catch (error) {
      console.error("Error saving payments:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full pb-24 px-4 md:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
      {/* 🌟 Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 pt-6 md:pt-10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
            <UserCheck className="w-6 h-6 md:w-7 md:h-7 text-orange-500" />
            บันทึกรับชำระ
          </h1>
          <div className="mt-2 flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-fit group">
            <Calendar className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none font-black text-xs md:text-sm text-gray-700 uppercase tracking-widest cursor-pointer"
            />
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสวงกู้..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm shadow-sm focus:border-orange-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="font-black text-[10px] uppercase tracking-[0.2em]">
              กำลังเตรียมคิวงาน...
            </p>
          </div>
        ) : filteredQueue.length > 0 ? (
          <div className="w-full">
            {/* ========================================= */}
            {/* 📱 1. รูปแบบ Mobile (ซ่อนเมื่ออยู่บนจอคอม) */}
            {/* ========================================= */}
            <div className="md:hidden flex flex-col divide-y divide-gray-100">
              {filteredQueue.map((item) => {
                const remainingAfter = item.isChecked
                  ? item.remainingBefore - item.amount
                  : item.remainingBefore;

                return (
                  <div
                    key={`mobile-${item.id}`}
                    className={`p-4 transition-colors duration-300 ${item.isChecked ? "bg-green-50/50" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex gap-3">
                      {/* Checkbox (ซ้ายสุด) */}
                      <div className="pt-1 shrink-0">
                        <button
                          onClick={() => toggleCheck(item.id)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                            item.isChecked
                              ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                              : "bg-gray-100 text-gray-300 border border-gray-200"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* รายละเอียด (ขวา) */}
                      <div className="flex-1 min-w-0">
                        {/* ส่วนหัว: ข้อมูลวงกู้ + แชท */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm"
                              style={{
                                backgroundColor: item.isChecked
                                  ? "#f3f4f6"
                                  : `${item.bankColor}15`,
                                color: item.isChecked
                                  ? "#9ca3af"
                                  : item.bankColor,
                              }}
                            >
                              {item.loanNumber}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-800 truncate leading-tight">
                                วง {item.loanNumber} • {item.loanName}
                              </p>
                              <p className="text-[11px] font-bold text-gray-500 mt-0.5 truncate">
                                {item.customerName}
                              </p>
                            </div>
                          </div>

                          {/* ปุ่มแชท (มุมขวาบนของการ์ด) */}
                          <div className="shrink-0 ml-2">
                            {item.chatLink ? (
                              <button
                                onClick={(e) =>
                                  handleOpenMessenger(e, item.chatLink)
                                }
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-500 shadow-sm border border-blue-100 active:scale-95"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-300 border border-gray-100">
                                <MessageCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ป้ายสถานะ */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 px-1.5 py-0.5 rounded-md shadow-sm">
                            งวดที่ {item.installmentNo}
                          </span>
                          {item.isOverdue && (
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md shadow-sm animate-pulse">
                              ค้างชำระ
                            </span>
                          )}
                        </div>

                        {/* 🌟 กล่องสรุปยอด (ระบุข้อมูลชัดเจนด้านล่าง) */}
                        <div className="grid grid-cols-2 gap-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100 mb-3 shadow-inner">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                              ยอดเก็บ
                            </p>
                            <p className="text-sm font-black text-gray-800">
                              ฿{item.amount.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                              กำไร
                            </p>
                            <p className="text-sm font-black text-green-500">
                              +฿{(item.profitShare || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-end">
                            <div>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                ยอดคงเหลือ
                              </p>
                              <p
                                className={`text-base font-black leading-none ${item.isChecked ? "text-orange-600" : "text-gray-800"}`}
                              >
                                ฿{remainingAfter.toLocaleString()}
                              </p>
                            </div>
                            {item.isChecked && (
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-green-500">
                                  ตัดหนี้ -฿{item.amount.toLocaleString()}
                                </p>
                                {remainingAfter <= 0 && (
                                  <p className="text-[9px] font-bold text-orange-500 mt-0.5 animate-pulse">
                                    📦 เตรียมปิดวง
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ข้อมูลธนาคาร (ล่างสุด) */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 shadow-sm bg-white">
                            <Landmark
                              className="w-3.5 h-3.5"
                              style={{ color: item.bankColor }}
                            />
                          </div>
                          <p className="text-[11px] font-black text-gray-800 truncate">
                            {item.bankName}{" "}
                            <span className="text-gray-400 font-bold ml-1">
                              ({item.bankOwner})
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ========================================= */}
            {/* 💻 2. รูปแบบ Desktop (ตารางเดิม ซ่อนบนมือถือ) */}
            {/* ========================================= */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left w-full">
                <thead className="bg-gray-50/50 border-b border-gray-50">
                  <tr className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <th className="px-4 py-4 text-center w-20">เช็คจ่าย</th>
                    <th className="px-4 py-4">ข้อมูลวงกู้</th>
                    <th className="px-4 py-4">บัญชีรับโอน</th>
                    <th className="px-4 py-4 text-right">ยอดเก็บ</th>
                    <th className="px-4 py-4 text-right">
                      <span className="text-orange-500 flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> กำไร
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right pr-6">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredQueue.map((item) => {
                    const remainingAfter = item.isChecked
                      ? item.remainingBefore - item.amount
                      : item.remainingBefore;

                    return (
                      <tr
                        key={`desktop-${item.id}`}
                        className={`transition-all duration-300 ${item.isChecked ? "bg-green-50/30" : "hover:bg-gray-50/30"}`}
                      >
                        <td className="px-4 py-4 text-center align-middle">
                          <button
                            onClick={() => toggleCheck(item.id)}
                            className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                              item.isChecked
                                ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                                : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                            }`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                                style={{
                                  backgroundColor: item.isChecked
                                    ? "#f3f4f6"
                                    : `${item.bankColor}15`,
                                  color: item.isChecked
                                    ? "#9ca3af"
                                    : item.bankColor,
                                }}
                              >
                                {item.loanNumber}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-800 truncate leading-tight">
                                  วง {item.loanNumber} • {item.loanName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 shadow-sm px-2 py-0.5 rounded-md">
                                    งวดที่ {item.installmentNo}
                                  </span>
                                  {item.isOverdue && (
                                    <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                                      ค้างชำระ
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 truncate">
                                  {item.customerName}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 ml-4">
                              {item.chatLink ? (
                                <button
                                  onClick={(e) =>
                                    handleOpenMessenger(e, item.chatLink)
                                  }
                                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors shadow-sm active:scale-95"
                                  title="เปิดแชท Messenger"
                                >
                                  <MessageCircle className="w-5 h-5" />
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed">
                                  <MessageCircle className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                              style={{ backgroundColor: `${item.bankColor}15` }}
                            >
                              <Landmark
                                className="w-3.5 h-3.5"
                                style={{ color: item.bankColor }}
                              />
                            </div>
                            <div>
                              <p className="text-[14px] font-black text-gray-800 whitespace-nowrap">
                                {item.bankName}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 truncate max-w-[100px]">
                                {item.bankOwner}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-gray-800 text-sm whitespace-nowrap align-middle">
                          ฿{item.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right font-black text-green-500 text-sm whitespace-nowrap align-middle">
                          +฿{(item.profitShare || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right pr-6 align-middle">
                          <div>
                            <p
                              className={`text-lg font-black tracking-tight transition-colors whitespace-nowrap ${item.isChecked ? "text-orange-600" : "text-gray-400"}`}
                            >
                              ฿{remainingAfter.toLocaleString()}
                            </p>
                            {item.isChecked && (
                              <p className="text-[9px] font-bold text-green-500 uppercase whitespace-nowrap mt-0.5">
                                ตัดหนี้ -฿{item.amount.toLocaleString()}
                              </p>
                            )}
                            {item.isChecked && remainingAfter <= 0 && (
                              <p className="text-[9px] font-bold text-orange-500 uppercase whitespace-nowrap mt-0.5 animate-pulse">
                                📦 เตรียมปิดวงอัตโนมัติ
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* สิ้นสุด Desktop Layout */}
          </div>
        ) : (
          <div className="py-24 text-center text-gray-400">
            <p className="font-black text-xs uppercase tracking-[0.3em]">
              ไม่มีรายการรอชำระของวันที่ {selectedDate}
            </p>
          </div>
        )}
      </div>

      <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 mt-0 md:mt-8 bg-white/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-gray-100 md:border-0 z-40 flex justify-end">
        <button
          onClick={handleConfirmPayments}
          disabled={
            isSaving || dailyQueue.filter((i) => i.isChecked).length === 0
          }
          className="w-full md:w-auto bg-[#1F2335] hover:bg-black text-white px-8 md:px-12 py-4 md:py-4 rounded-[1.5rem] font-black shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 md:gap-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5 text-orange-500" />
          )}
          ยืนยันการตัดยอดเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
