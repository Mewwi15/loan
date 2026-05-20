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
  ScanLine,
  X,
  UploadCloud,
  FileCheck2,
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
  // 🌟 State ใหม่สำหรับ Modal รายวง
  // ==========================================
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipStatus, setSlipStatus] = useState("idle");
  const [slipData, setSlipData] = useState(null);
  const [slipError, setSlipError] = useState("");
  const [activeLoanForSlip, setActiveLoanForSlip] = useState(null); // เก็บข้อมูลวงกู้ที่กำลังสแกนสลิป

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
        setTimeout(() => window.open(fullLink, "_blank"), 2500);
      } else window.open(fullLink, "_blank");
    } else window.open(fullLink, "_blank");
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
        if (activeLoansMap.has(data.loanId) && data.dueDate <= selectedDate) {
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
            slipRefNumber: null, // ฟิลด์เก็บข้อมูลสลิป
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

  // ==========================================
  // 🌟 ฟังก์ชันเปิด Modal รับสลิปของแต่ละวง
  // ==========================================
  const openSlipModal = (item) => {
    setActiveLoanForSlip(item);
    setSlipStatus("idle");
    setSlipData(null);
    setSlipError("");
    setShowSlipModal(true);
  };

  // ==========================================
  // 🌟 ฟังก์ชันหลัก: ตรวจสลิปและเปรียบเทียบยอด
  // ==========================================
  const handleSlipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeLoanForSlip) return;

    setSlipStatus("uploading");
    setSlipData(null);
    setSlipError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // ยิงข้อมูลไปที่หลังบ้านของเรา
      const response = await fetch("/api/verify-slip", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.status === 200 && result.data) {
        setSlipStatus("matching");
        const data = result.data;
        const slipAmount = data.amount.amount;
        const expectedAmount = activeLoanForSlip.amount;

        // 🔍 [ตรวจสลิป 1]: เช็คยอดเงินว่าตรงกับวงนี้ไหม?
        if (slipAmount !== expectedAmount) {
          setSlipData(data); // ให้โชว์ข้อมูลด้วยว่ายอดเป็นเท่าไหร่
          setSlipStatus("error");
          setSlipError(
            `🚨 ยอดเงินไม่ตรง! (ต้องจ่าย: ฿${expectedAmount.toLocaleString()} / โอนมา: ฿${slipAmount.toLocaleString()})`,
          );
          return;
        }

        // 🔍 [ตรวจสลิป 2]: เช็คสลิปซ้ำในระบบ
        const txQuery = query(
          collection(db, "transactions"),
          where("slipRefNumber", "==", data.transRef),
        );
        const txSnap = await getDocs(txQuery);

        if (!txSnap.empty) {
          setSlipData(data);
          setSlipStatus("error");
          setSlipError("🚨 สลิปใบนี้เคยถูกใช้งานไปแล้ว (Duplicate Slip)");
          return;
        }

        // ✅ ผ่านทุกเงื่อนไข: ติ๊กถูกให้อัตโนมัติและผูกสลิปเข้ากับวง
        setSlipData(data);
        setDailyQueue((prev) =>
          prev.map((item) => {
            if (item.id === activeLoanForSlip.id) {
              return {
                ...item,
                isChecked: true,
                slipRefNumber: data.transRef,
                slipSender:
                  data.sender.account.name.th ||
                  data.sender.account.name.en ||
                  "ไม่ระบุ",
              };
            }
            return item;
          }),
        );

        setSlipStatus("success");
      } else {
        setSlipStatus("error");
        setSlipError(result.message || "ไม่สามารถอ่านข้อมูล QR บนสลิปได้");
      }
    } catch (err) {
      console.error(err);
      setSlipStatus("error");
      setSlipError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const handleConfirmPayments = async () => {
    const itemsToPay = dailyQueue.filter((item) => item.isChecked);
    if (itemsToPay.length === 0)
      return alert("กรุณาเลือกอย่างน้อย 1 รายการเพื่อบันทึก");
    if (!window.confirm(`ยืนยันการตัดยอดทั้งหมด ${itemsToPay.length} รายการ?`))
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
          batch.update(customerRef, { totalDebt: increment(-item.amount) });
        } else {
          const customerQuery = query(
            collection(db, "customers"),
            where("name", "==", item.customerName),
          );
          const customerSnap = await getDocs(customerQuery);
          if (!customerSnap.empty) {
            const customerRef = doc(db, "customers", customerSnap.docs[0].id);
            batch.update(customerRef, { totalDebt: increment(-item.amount) });
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
          slipRefNumber: item.slipRefNumber || null,
          slipSender: item.slipSender || null,
        });
      }

      await batch.commit();
      alert("✅ ตัดยอดและบันทึกกำไรเรียบร้อยแล้ว");
      fetchDailyJobs();
    } catch (error) {
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
            {/* 📱 1. รูปแบบ Mobile */}
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
                      <div className="pt-1 shrink-0">
                        <button
                          onClick={() => toggleCheck(item.id)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${item.isChecked ? "bg-green-500 text-white shadow-md shadow-green-500/20" : "bg-gray-100 text-gray-300 border border-gray-200"}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
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

                          {/* 🌟 ปุ่มแชท และ ปุ่มสแกนสลิป */}
                          <div className="flex shrink-0 gap-1.5 ml-2">
                            {/* ปุ่มสแกนสลิป */}
                            <button
                              onClick={() => openSlipModal(item)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border transition-all active:scale-95 ${item.slipRefNumber ? "bg-green-50 text-green-500 border-green-200" : "bg-white text-gray-400 hover:text-green-500 border-gray-200"}`}
                              title="สแกนสลิป"
                            >
                              {item.slipRefNumber ? (
                                <FileCheck2 className="w-4 h-4" />
                              ) : (
                                <ScanLine className="w-4 h-4" />
                              )}
                            </button>

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

                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 px-1.5 py-0.5 rounded-md shadow-sm">
                            งวดที่ {item.installmentNo}
                          </span>
                          {item.isOverdue && (
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md shadow-sm animate-pulse">
                              ค้างชำระ
                            </span>
                          )}
                          {item.isChecked && remainingAfter <= 0 && (
                            <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md shadow-sm animate-pulse">
                              เตรียมปิดวง
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100 shadow-inner">
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
                          <div className="col-span-2 pt-2 border-t border-gray-200 flex items-center gap-2">
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
                  </div>
                );
              })}
            </div>

            {/* ========================================= */}
            {/* 💻 2. รูปแบบ Desktop */}
            {/* ========================================= */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left w-full">
                <thead className="bg-gray-50/50 border-b border-gray-50">
                  <tr className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <th className="px-4 py-4 text-center w-20">เช็คจ่าย</th>
                    <th className="px-4 py-4">ข้อมูลวงกู้</th>
                    <th className="px-4 py-4">บัญชีรับโอน</th>
                    <th className="px-4 py-4 text-right">ยอดเก็บ</th>
                    <th className="px-4 py-4 text-right pr-6">
                      <span className="text-orange-500 flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> กำไร
                      </span>
                    </th>
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
                            className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 ${item.isChecked ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-gray-100 text-gray-300 hover:bg-gray-200"}`}
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
                                  {item.isChecked && remainingAfter <= 0 && (
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                                      เตรียมปิดวง
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 truncate">
                                  {item.customerName}
                                </p>
                              </div>
                            </div>

                            {/* 🌟 ปุ่มแชท และ ปุ่มสแกนสลิป */}
                            <div className="flex shrink-0 gap-2 ml-4">
                              <button
                                onClick={() => openSlipModal(item)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-all active:scale-95 ${item.slipRefNumber ? "bg-green-50 text-green-500 border-green-200" : "bg-white text-gray-400 hover:text-green-500 border-gray-200"}`}
                                title="สแกนสลิป"
                              >
                                {item.slipRefNumber ? (
                                  <FileCheck2 className="w-5 h-5" />
                                ) : (
                                  <ScanLine className="w-5 h-5" />
                                )}
                              </button>

                              {item.chatLink ? (
                                <button
                                  onClick={(e) =>
                                    handleOpenMessenger(e, item.chatLink)
                                  }
                                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors shadow-sm active:scale-95"
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
                        <td className="px-4 py-4 text-right font-black text-green-500 text-sm whitespace-nowrap pr-6 align-middle">
                          +฿{(item.profitShare || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          )}{" "}
          ยืนยันการตัดยอดเข้าสู่ระบบ
        </button>
      </div>

      {/* ========================================== */}
      {/* 🌟 3. Modal ตรวจสอบสลิป (รายวง) */}
      {/* ========================================== */}
      {showSlipModal && activeLoanForSlip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#f8f9fa] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            {/* Header (สีเข้ม) */}
            <div className="bg-[#1c2237] px-6 pt-7 pb-6 text-white relative">
              <button
                onClick={() => {
                  setShowSlipModal(false);
                  setSlipStatus("idle");
                  setSlipData(null);
                  setActiveLoanForSlip(null);
                }}
                className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-1.5">
                Slip Verification
              </p>
              <h2 className="text-xl font-black tracking-tight">
                ตรวจสอบสลิป วง {activeLoanForSlip.loanNumber}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                ยอดที่ต้องเก็บ:{" "}
                <span className="font-bold text-white">
                  ฿{activeLoanForSlip.amount.toLocaleString()}
                </span>
              </p>
            </div>

            {/* เส้นประรอยต่อ */}
            <div className="absolute left-0 right-0 h-0 border-t border-dashed border-gray-400/30 -mt-[1px] z-10 flex justify-between items-center px-0">
              <div className="w-3 h-6 bg-gray-900/60 rounded-r-full -ml-4"></div>
              <div className="w-3 h-6 bg-gray-900/60 rounded-l-full -mr-4"></div>
            </div>

            <div className="p-5">
              {/* กล่องสถานะปัจจุบัน */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
                <p className="text-center text-[10px] font-black text-gray-400 mb-4 tracking-widest">
                  สถานะปัจจุบัน
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${slipStatus !== "idle" ? "bg-green-500 text-white shadow-md shadow-green-500/30" : "bg-gray-100 border border-gray-200"}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className={`w-10 h-[3px] rounded-full transition-colors ${slipStatus !== "idle" && slipStatus !== "uploading" ? "bg-green-500" : "bg-gray-100"}`}
                  ></div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${slipStatus === "matching" || slipStatus === "success" || slipStatus === "error" ? (slipStatus === "error" ? "bg-red-500 text-white shadow-md shadow-red-500/30" : "bg-green-500 text-white shadow-md shadow-green-500/30") : "bg-gray-100 border border-gray-200"}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div
                    className={`w-10 h-[3px] rounded-full transition-colors ${slipStatus === "success" ? "bg-green-500" : "bg-gray-100"}`}
                  ></div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${slipStatus === "success" ? "bg-green-500 text-white shadow-md shadow-green-500/30" : "bg-gray-100 border border-gray-200"}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p
                  className={`text-center text-[11px] font-bold mt-3 ${slipStatus === "error" ? "text-red-500" : "text-orange-600"}`}
                >
                  {slipStatus === "idle" && "รออัปโหลดรูปภาพสลิป"}
                  {slipStatus === "uploading" && (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />{" "}
                      กำลังตรวจสอบกับธนาคาร...
                    </span>
                  )}
                  {slipStatus === "matching" && "กำลังตรวจสอบยอดเงิน..."}
                  {slipStatus === "success" && "เอกสารผ่านการตรวจสอบ"}
                  {slipStatus === "error" && slipError}
                </p>
              </div>

              {/* กล่องอัปโหลดรูป (จะหายไปเมื่อตรวจผ่าน/ผิดพลาด) */}
              {slipStatus === "idle" && (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-white hover:bg-gray-50 transition-colors group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-black text-gray-700">
                      คลิกที่นี่เพื่ออัปโหลดสลิป
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">
                      รองรับไฟล์ JPG, PNG
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleSlipUpload}
                    disabled={slipStatus !== "idle"}
                  />
                </label>
              )}

              {/* ข้อมูลสลิป */}
              {(slipData || slipStatus === "error") && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  {slipData && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          รหัสอ้างอิง (REF)
                        </p>
                        <p className="text-xs font-black text-gray-800 mt-1 truncate">
                          {slipData.transRef || "-"}
                        </p>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          วันที่ทำรายการ
                        </p>
                        <p className="text-xs font-black text-gray-800 mt-1 truncate">
                          {slipData.date
                            ? new Date(slipData.date).toLocaleString("th-TH")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  )}

                  {slipData && (
                    <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-3">
                        รายละเอียดในสลิป
                      </p>
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 mb-0.5">
                            ยอดเงินสุทธิ
                          </p>
                          <p
                            className={`text-3xl font-black tracking-tighter ${slipData.amount?.amount !== activeLoanForSlip.amount ? "text-red-500" : "text-gray-800"}`}
                          >
                            ฿{slipData.amount?.amount?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 mb-0.5">
                            ผู้โอน
                          </p>
                          <p className="text-xs font-bold text-gray-700">
                            {slipData.sender?.account?.name?.th ||
                              slipData.sender?.account?.name?.en ||
                              "ไม่ระบุ"}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                            {slipData.sender?.bank?.short || "-"}
                          </p>
                        </div>
                      </div>

                      {/* ประกาศผลแมตช์สำเร็จ */}
                      {slipStatus === "success" && (
                        <div className="mt-3 p-3 bg-[#e8fbf0] border border-[#a6ebd1] rounded-xl flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-green-800 leading-tight">
                              ตรวจสอบข้อมูลถูกต้อง!
                            </p>
                            <p className="text-[10px] font-bold text-green-600/80 mt-0.5">
                              ติ๊กรับชำระวง {activeLoanForSlip.loanNumber}{" "}
                              เรียบร้อยแล้ว
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowSlipModal(false);
                      setSlipStatus("idle");
                      setSlipData(null);
                      setActiveLoanForSlip(null);
                    }}
                    className="w-full bg-[#1F2335] hover:bg-black text-white py-3.5 rounded-[1rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                  >
                    {slipStatus === "success"
                      ? "ตกลงและปิดหน้าต่าง"
                      : "ปิดหน้าต่าง"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
