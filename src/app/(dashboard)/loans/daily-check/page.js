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
  AlertTriangle,
  Save,
  UserCheck,
  Loader2,
  TrendingUp,
  Landmark,
} from "lucide-react";

export default function DailyCheckPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dailyQueue, setDailyQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🌟 ลอจิกใหม่ขั้นสุด: บังคับดึงงวดเก่าสุด + กรองข้อมูลซ้ำซ้อน (Ultimate Deduplication)
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
      const seenSet = new Set(); // 🌟 ถังพักไว้จำข้อมูลที่เคยโหลดแล้ว

      for (const [loanId, schedule] of earliestPendingMap.entries()) {
        const loanData = activeLoansMap.get(loanId);

        // 🌟 กุญแจเช็คข้อมูลซ้ำแบบขั้นสุด (ลบช่องว่าง, ลบวงเล็บ, เช็ค 4 ชั้น)
        // เพื่อป้องกันกรณีชื่อ "แม่น้ำ" กับ "แม่น้ำ " หรือ "แม่น้ำ (Mami)"
        const cleanName = String(loanData.customerName || "")
          .split("(")[0] // ตัดข้อความในวงเล็บทิ้ง
          .replace(/\s+/g, "") // ลบช่องว่างทั้งหมด
          .toLowerCase();

        const cleanLoanNum = String(loanData.loanNumber || "")
          .replace(/\s+/g, "")
          .toLowerCase();

        const instNo = Number(schedule.installmentNo);
        const amount = Number(schedule.amount);

        // Unique Key = ชื่อ + เลขวง + งวดที่ + ยอดเงิน
        const uniqueKey = `${cleanName}-${cleanLoanNum}-${instNo}-${amount}`;

        if (!seenSet.has(uniqueKey)) {
          seenSet.add(uniqueKey); // จดจำไว้ว่าคนนี้/บิลนี้ โชว์ไปแล้วนะ ห้ามเอามาซ้ำอีก!

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

  const updatePenalty = (id, value) => {
    setDailyQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, penalty: Number(value) } : item,
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
        // 1. อัปเดตตารางค่างวด
        const scheduleRef = doc(db, "schedules", item.id);
        batch.update(scheduleRef, {
          status: "paid",
          paidAt: serverTimestamp(),
          appliedPenalty: item.penalty,
        });

        // 2. อัปเดตข้อมูลวงกู้หลัก + 🌟 ลอจิก Auto-Close
        const loanRef = doc(db, "loans", item.loanId);
        const newBalance = item.remainingBefore - item.amount; // คำนวณยอดเงินที่จะเหลือหลังจ่าย

        const loanUpdateData = {
          remainingBalance: increment(-item.amount),
          currentInstallment: increment(1),
        };

        // ถ้าจ่ายงวดนี้แล้วยอดเหลือ 0 บาท หรือติดลบ ให้เตะเข้าประวัติทันที!
        if (newBalance <= 0) {
          loanUpdateData.status = "closed";
          loanUpdateData.closedAt = new Date().toISOString();
        }

        batch.update(loanRef, loanUpdateData);

        // 3. หักหนี้ออกจากโปรไฟล์ลูกค้า
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

        // 4. สร้างบิล (Transaction) เก็บไว้เป็นหลักฐาน
        const transRef = doc(collection(db, "transactions"));
        batch.set(transRef, {
          loanId: item.loanId,
          customerId: item.customerId || null,
          customerName: item.customerName,
          amountPaid: item.amount,
          profitShare: item.profitShare || 0,
          penalty: item.penalty || 0,
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
    <div className="w-full pb-20 px-4 md:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
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
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[700px] xl:min-w-full">
              <thead className="bg-gray-50/50 border-b border-gray-50">
                <tr className="text-[10px] md:text-[12px] font-black text-gray-400 uppercase tracking-[0.1em] md:tracking-[0.2em]">
                  <th className="px-3 md:px-4 py-4 text-center w-16">
                    เช็คจ่าย
                  </th>
                  <th className="px-3 md:px-4 py-4">ข้อมูลวงกู้</th>
                  <th className="px-3 md:px-4 py-4">บัญชีรับโอน</th>
                  <th className="px-3 md:px-4 py-4 text-right">ยอดเก็บ</th>
                  <th className="px-3 md:px-4 py-4 text-right">
                    <span className="text-orange-500 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" /> กำไร
                    </span>
                  </th>
                  <th className="px-3 md:px-4 py-4 text-center w-28">
                    บวกค่าปรับ
                  </th>
                  <th className="px-3 md:px-4 py-4 text-right pr-6">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQueue.map((item) => {
                  const remainingAfter = item.isChecked
                    ? item.remainingBefore - item.amount
                    : item.remainingBefore;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-all duration-300 ${item.isChecked ? "bg-green-50/30" : "hover:bg-gray-50/30"}`}
                    >
                      <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                        <button
                          onClick={() => toggleCheck(item.id)}
                          className={`w-7 h-7 md:w-8 md:h-8 mx-auto rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                            item.isChecked
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                              : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div
                            className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-xs md:text-sm shrink-0"
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
                            <p className="text-xs md:text-sm font-black text-gray-800 truncate">
                              วง {item.loanNumber} • {item.loanName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-0.5">
                              <span className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-100 shadow-sm px-1.5 md:px-2 py-0.5 rounded-md">
                                งวดที่ {item.installmentNo}
                              </span>
                              {item.isOverdue && (
                                <span className="text-[8px] md:text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-1.5 md:px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                                  ค้างชำระ
                                </span>
                              )}
                              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 truncate max-w-[80px] md:max-w-[120px] ml-1">
                                {item.customerName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                            style={{ backgroundColor: `${item.bankColor}15` }}
                          >
                            <Landmark
                              className="w-3 h-3 md:w-3.5 md:h-3.5"
                              style={{ color: item.bankColor }}
                            />
                          </div>
                          <div>
                            <p className="text-[12px] md:text-[14px] font-black text-gray-800 whitespace-nowrap">
                              {item.bankName}
                            </p>
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 truncate max-w-[80px] md:max-w-[100px]">
                              {item.bankOwner}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-right font-black text-gray-800 text-xs md:text-sm whitespace-nowrap">
                        ฿{item.amount.toLocaleString()}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-right font-black text-green-500 text-xs md:text-sm whitespace-nowrap">
                        +฿{(item.profitShare || 0).toLocaleString()}
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                        <div className="flex justify-center">
                          <div
                            className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-gray-50 rounded-xl border border-gray-100 ${item.penalty > 0 ? "border-orange-200 bg-orange-50" : ""}`}
                          >
                            <AlertTriangle
                              className={`w-3 h-3 ${item.penalty > 0 ? "text-orange-500" : "text-gray-300"}`}
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.penalty === 0 ? "" : item.penalty}
                              placeholder="0"
                              onChange={(e) =>
                                updatePenalty(item.id, e.target.value)
                              }
                              className="w-10 md:w-14 bg-transparent outline-none text-center font-black text-gray-700 text-xs md:text-sm"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-3 md:py-4 text-right pr-6">
                        <p
                          className={`text-sm md:text-lg font-black tracking-tight transition-colors whitespace-nowrap ${item.isChecked ? "text-orange-600" : "text-gray-400"}`}
                        >
                          ฿{remainingAfter.toLocaleString()}
                        </p>
                        {item.isChecked && (
                          <p className="text-[8px] md:text-[9px] font-bold text-green-500 uppercase whitespace-nowrap">
                            ตัดหนี้ -฿{item.amount.toLocaleString()}
                          </p>
                        )}
                        {/* 🌟 แสดงป้ายเตือนปิดวงเมื่อติ๊กแล้วยอดเป็น 0 */}
                        {item.isChecked && remainingAfter <= 0 && (
                          <p className="text-[8px] md:text-[9px] font-bold text-orange-500 uppercase whitespace-nowrap mt-0.5 animate-pulse">
                            📦 เตรียมปิดวงอัตโนมัติ
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center text-gray-400">
            <p className="font-black text-xs uppercase tracking-[0.3em]">
              ไม่มีรายการรอชำระของวันที่ {selectedDate}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleConfirmPayments}
          disabled={
            isSaving || dailyQueue.filter((i) => i.isChecked).length === 0
          }
          className="bg-[#1F2335] hover:bg-black text-white px-8 md:px-12 py-3 md:py-4 rounded-[1.5rem] font-black shadow-xl transition-all active:scale-95 flex items-center gap-2 md:gap-3 text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
          )}
          ยืนยันการตัดยอดเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
