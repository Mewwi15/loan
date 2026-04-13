"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  increment,
} from "firebase/firestore";
import {
  ArrowLeft,
  Wallet,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  X,
  CheckCircle2,
  CircleDashed,
  Loader2,
  Phone,
  TrendingUp,
  PowerOff, // ไอคอนปุ่มปิดวง
} from "lucide-react";
import Link from "next/link";

export default function CustomerDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const customerId = unwrappedParams.id;

  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const customerDoc = await getDoc(doc(db, "customers", customerId));
      if (customerDoc.exists()) {
        const customerData = customerDoc.data();
        setCustomer(customerData);

        // ✅ แก้ไขใหม่เป็นแบบนี้ครับ
        const searchNames = [customerData.name];
        if (customerData.nickname) searchNames.push(customerData.nickname);

        const q = query(
          collection(db, "loans"),
          where("customerName", "in", searchNames),
          orderBy("createdAt", "desc"),
        );
        const loanSnapshot = await getDocs(q);
        const loanList = loanSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLoans(loanList);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🟢 ฟังก์ชัน "ปิดวงกู้"
  const handleCloseLoan = async (loanId, remainingBalance) => {
    if (
      !window.confirm(
        "ยืนยันการปิดวงกู้นี้? \n(วงกู้จะหายไปจากหน้านี้ และขึ้นสล็อต 'ว่าง' ในหน้าวอร์รูม)",
      )
    )
      return;

    try {
      // 1. เปลี่ยนสถานะวงกู้เป็น closed
      await updateDoc(doc(db, "loans", loanId), {
        status: "closed",
        remainingBalance: 0,
      });

      // 2. ลดยอด activeLoans และ totalDebt ของลูกค้า
      await updateDoc(doc(db, "customers", customerId), {
        activeLoans: increment(-1),
        totalDebt: increment(-remainingBalance),
      });

      alert("ปิดวงกู้สำเร็จ!");
      fetchData(); // รีเฟรชข้อมูล (การ์ดที่ปิดจะหายไปอัตโนมัติ)
    } catch (error) {
      console.error("Error closing loan:", error);
      alert("เกิดข้อผิดพลาดในการปิดวงกู้");
    }
  };

  const openSchedule = async (loan) => {
    setSelectedLoan(loan);
    setScheduleModalOpen(true);
    setLoadingSchedule(true);

    try {
      const q = query(
        collection(db, "schedules"),
        where("loanId", "==", loan.id),
        orderBy("installmentNo", "asc"),
      );
      const scheduleSnapshot = await getDocs(q);
      const scheduleList = scheduleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLoanSchedule(scheduleList);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        กำลังโหลดข้อมูลลูกค้า...
      </div>
    );

  if (!customer)
    return <div className="p-20 text-center font-black">ไม่พบข้อมูลลูกค้า</div>;

  // 🌟 กรองเอามาแสดงเฉพาะ "วงที่ยัง Active อยู่เท่านั้น" วงไหน closed จะไม่ถูกวาดออกมาเลย
  const activeLoans = loans.filter((l) => l.status !== "closed");

  const totalPrincipal = activeLoans.reduce(
    (sum, l) => sum + (l.principal || 0),
    0,
  );
  const totalExpectedProfit = activeLoans.reduce(
    (sum, l) => sum + (l.totalProfit || 0),
    0,
  );

  return (
    <div className="w-full pb-20 px-4 sm:px-10 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10 pt-10">
        <div className="flex items-center gap-6">
          <Link
            href="/customers"
            className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-orange-50 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {customer.name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-xs text-orange-500 font-black uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> {customer.phone}
              </p>
              <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                ID: {customerId.slice(0, 5)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="bg-orange-500 p-6 rounded-[2rem] text-white shadow-xl flex-1 xl:w-56">
            <p className="text-[14px] font-black uppercase opacity-70 mb-1 tracking-widest">
              เงินต้นรวม
            </p>
            <p className="text-2xl font-black">
              ฿{totalPrincipal.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#1F2335] p-6 rounded-[2rem] text-white shadow-xl flex-1 xl:w-56">
            <p className="text-[14px] font-black uppercase text-orange-400 tracking-widest mb-1">
              กำไรรวม
            </p>
            <p className="text-2xl font-black">
              ฿{totalExpectedProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <Wallet className="w-6 h-6 text-orange-500" />
        <h2 className="text-xl font-black text-gray-800">
          รายการวงกู้ที่กำลังดำเนินการ ({activeLoans.length} วง)
        </h2>
      </div>

      {activeLoans.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {activeLoans.map((loan, index) => {
            return (
              <div
                key={loan.id}
                className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1.5 ${
                    loan.remainingBalance === 0
                      ? "bg-green-500"
                      : "bg-orange-500"
                  }`}
                ></div>

                <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm"
                      style={{
                        backgroundColor: `${loan.bankColor || "#cbd5e1"}15`,
                        color: loan.bankColor || "#9ca3af",
                      }}
                    >
                      {loan.loanNumber || index + 1}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                        วง {loan.loanNumber || index + 1}
                      </h3>
                      <p className="text-[14px] font-black text-gray-500 uppercase tracking-widest mt-1">
                        ชื่อวง: {loan.loanName || loan.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
                      ยอดส่ง / งวด
                    </p>
                    <p className="text-3xl font-black text-orange-500">
                      ฿{loan.installmentAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/30 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> รูปแบบ
                    </p>
                    <p className="font-black text-gray-700">
                      {loan.totalInstallments} งวด •{" "}
                      {loan.frequencyType === "day"
                        ? `ราย ${loan.frequency} วัน`
                        : "รายเดือน"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> ยอดคงเหลือ
                    </p>
                    <p className="font-black text-gray-700">
                      ฿{loan.remainingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-between">
                  {/* ปุ่มปิดวงกู้ */}
                  <button
                    onClick={() =>
                      handleCloseLoan(loan.id, loan.remainingBalance)
                    }
                    className="text-[14px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <PowerOff className="w-3 h-3" /> ปิดวงกู้
                  </button>

                  <button
                    onClick={() => openSchedule(loan)}
                    className="bg-gray-900 hover:bg-black text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> ตารางค่างวด{" "}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-400 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <p className="font-black text-sm uppercase tracking-[0.2em]">
            ไม่มีวงกู้ที่กำลังดำเนินการ
          </p>
        </div>
      )}

      {/* POP-UP MODAL (ตารางงวด) */}
      {scheduleModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setScheduleModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-orange-500" /> ตารางค่างวด
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[14px] font-black text-white bg-orange-500 px-2 py-0.5 rounded uppercase tracking-widest">
                    วง {selectedLoan.loanNumber || "-"}
                  </span>
                  <p className="text-[14px] font-black text-gray-400 uppercase tracking-widest">
                    {selectedLoan.customerName} •{" "}
                    {selectedLoan.totalInstallments} งวด
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
              >
                <X />
              </button>
            </div>

            <div className="overflow-y-auto p-8 bg-gray-50/50 flex-1">
              {loadingSchedule ? (
                <div className="py-20 flex flex-col items-center gap-3 text-gray-300 font-black text-[10px] uppercase">
                  <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลด...
                </div>
              ) : (
                <div className="space-y-3">
                  {loanSchedule.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-5 rounded-[1.5rem] border bg-white transition-all ${item.status === "paid" ? "opacity-50 grayscale" : "border-gray-100 shadow-sm"}`}
                    >
                      <div className="flex items-center gap-4">
                        {item.status === "paid" ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <CircleDashed className="w-6 h-6 text-orange-300" />
                        )}
                        <div>
                          <p className="text-sm font-black text-gray-800">
                            งวดที่ {item.installmentNo}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {item.dueDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-black ${item.status === "paid" ? "text-gray-400" : "text-orange-500"}`}
                        >
                          ฿{item.amount.toLocaleString()}
                        </p>
                        <p
                          className={`text-[9px] font-black uppercase ${item.status === "paid" ? "text-green-600" : "text-green-500"}`}
                        >
                          กำไร: ฿{(item.profitShare || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-gray-100 bg-white rounded-b-[2.5rem] flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  ยอดเก็บต่องวด
                </p>
                <p className="text-xl font-black text-gray-800">
                  ฿{selectedLoan.installmentAmount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
