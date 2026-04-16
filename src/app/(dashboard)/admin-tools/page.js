"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Trash2,
  Search,
} from "lucide-react";

export default function AdminToolsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState([]);

  // 🌟 State สำหรับพิมพ์เลขวงที่ต้องการลบ
  const [deleteLoanNo, setDeleteLoanNo] = useState("");

  // ===============================================
  // 1. ฟังก์ชันรันสคริปต์เคลียร์ยอดหลัง 16/04/2026
  // ===============================================
  const handleBulkPay = async () => {
    if (
      !window.confirm(
        "คำเตือน: ยืนยันการเปลี่ยนสถานะทุกงวดที่ 'ยังไม่จ่าย' และดิว 'หลัง 16/04/2026' เป็น 'จ่ายแล้ว' หรือไม่?",
      )
    )
      return;

    setLoading(true);
    setResult("");
    setLogs([]);
    let count = 0;

    try {
      const q = query(
        collection(db, "schedules"),
        where("status", "==", "pending"),
        where("dueDate", ">", "2026-04-16"),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult("✅ ไม่พบรายการที่ค้างชำระหลังวันที่ 16/04/2026 ครับ");
        setLoading(false);
        return;
      }

      for (const document of snap.docs) {
        const item = { id: document.id, ...document.data() };

        await updateDoc(doc(db, "schedules", item.id), {
          status: "paid",
          paidAt: serverTimestamp(),
          appliedPenalty: 0,
        });

        await updateDoc(doc(db, "loans", item.loanId), {
          remainingBalance: increment(-item.amount),
          currentInstallment: increment(1),
        });

        if (item.customerId) {
          await updateDoc(doc(db, "customers", item.customerId), {
            totalDebt: increment(-item.amount),
          });
        }

        await addDoc(collection(db, "transactions"), {
          loanId: item.loanId,
          customerId: item.customerId || null,
          customerName: item.customerName,
          amountPaid: item.amount,
          profitShare: item.profitShare || 0,
          penalty: 0,
          installmentNo: item.installmentNo,
          paymentDate: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });

        count++;
        setLogs((prev) => [
          ...prev,
          `ตัดยอดวง ${item.loanNumber} | งวดที่ ${item.installmentNo} | ดิว: ${item.dueDate} | ฿${item.amount}`,
        ]);
      }

      setResult(`🎉 ทำการตัดยอดสำเร็จทั้งหมด ${count} รายการ`);
    } catch (err) {
      console.error("Bulk Pay Error:", err);
      setResult(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // 🌟 2. ฟังก์ชันลบวงกู้แบบระบุเลขวง ทิ้งแบบถอนรากถอนโคน
  // ===============================================
  const handleDeleteSpecificLoan = async () => {
    const targetNumber = deleteLoanNo.trim();
    if (!targetNumber) return alert("กรุณาระบุเลขวงที่ต้องการลบครับ");

    if (
      !window.confirm(
        `🚨 คำเตือนขั้นสุด!\nคุณกำลังจะลบ 'วง ${targetNumber}' ทิ้งถาวร\nระบบจะลบข้อมูลวงนี้, ตารางค่างวด และคืนค่ายอดหนี้ให้ลูกค้ากลับเป็นเหมือนเดิม\n\nยืนยันการลบใช่หรือไม่?`,
      )
    )
      return;

    setLoading(true);
    setResult("");
    setLogs([]);

    try {
      const loansQ = query(
        collection(db, "loans"),
        where("loanNumber", "==", targetNumber),
      );
      const loansSnap = await getDocs(loansQ);

      if (loansSnap.empty) {
        setResult(
          `✅ ไม่พบข้อมูล 'วง ${targetNumber}' ในระบบครับ (อาจจะถูกลบไปแล้ว)`,
        );
        setLoading(false);
        return;
      }

      let deletedCount = 0;

      for (const loanDoc of loansSnap.docs) {
        const loanData = loanDoc.data();
        const loanId = loanDoc.id;

        // 1. ลบ Schedules ของวงนี้
        const schQ = query(
          collection(db, "schedules"),
          where("loanId", "==", loanId),
        );
        const schSnap = await getDocs(schQ);
        for (const sDoc of schSnap.docs) {
          await deleteDoc(doc(db, "schedules", sDoc.id));
        }

        // 2. ลบ Transactions ของวงนี้ (ถ้ามี)
        const transQ = query(
          collection(db, "transactions"),
          where("loanId", "==", loanId),
        );
        const transSnap = await getDocs(transQ);
        for (const tDoc of transSnap.docs) {
          await deleteDoc(doc(db, "transactions", tDoc.id));
        }

        // 3. คืนค่าหนี้ให้ Customer (ลบยอดหนี้ออก และลบจำนวนวงกู้ออก 1 วง)
        if (loanData.customerId) {
          const customerRef = doc(db, "customers", loanData.customerId);
          await updateDoc(customerRef, {
            activeLoans: increment(-1),
            totalDebt: increment(-(loanData.remainingBalance || 0)),
          });
        }

        // 4. ลบ Loan ตัวหลักทิ้ง
        await deleteDoc(doc(db, "loans", loanId));

        deletedCount++;
        setLogs((prev) => [
          ...prev,
          `ลบวง ${targetNumber} ของลูกค้า: ${loanData.customerName} เรียบร้อยแล้ว คืนยอดหนี้ ฿${loanData.remainingBalance || 0}`,
        ]);
      }

      setResult(
        `🗑️ ลบข้อมูล 'วง ${targetNumber}' แบบถอนรากถอนโคนสำเร็จ ${deletedCount} รายการ!`,
      );
      setDeleteLoanNo(""); // เคลียร์ช่องพิมพ์หลังจากลบเสร็จ
    } catch (err) {
      console.error(`Error deleting loan ${targetNumber}:`, err);
      setResult(`❌ เกิดข้อผิดพลาดในการลบ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto animate-in fade-in duration-500 pb-32">
      <div className="bg-white rounded-[2rem] p-10 shadow-xl border border-red-100">
        <div className="flex items-center gap-4 mb-6 text-red-500">
          <ShieldAlert className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">
              Admin Tools (โซนอันตราย)
            </h1>
            <p className="text-sm font-bold text-gray-500">
              สคริปต์แก้ไขฐานข้อมูลแบบกลุ่ม (Bulk Update)
            </p>
          </div>
        </div>

        {/* 🌟 กล่องใหม่สำหรับลบวงกู้ตามเลขที่ระบุ */}
        <div className="bg-orange-50 border border-orange-200 p-6 md:p-8 rounded-2xl mb-8">
          <h3 className="font-black text-orange-800 mb-2 flex items-center gap-2 text-lg">
            <Trash2 className="w-5 h-5" /> ล้างข้อมูลวงเทสต์ (ระบุเลขวง)
          </h3>
          <p className="text-sm font-bold text-orange-700/80 mb-6">
            พิมพ์เลขวงที่ต้องการลบทิ้งถาวร
            ระบบจะลบตารางค่างวดและคืนค่ายอดหนี้ให้ลูกค้าแต่ละคนกลับไปเป็นเหมือนเดิมก่อนสร้างวงนี้
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-300" />
              <input
                type="text"
                value={deleteLoanNo}
                onChange={(e) => setDeleteLoanNo(e.target.value)}
                placeholder="พิมพ์เลขวงที่ต้องการลบ เช่น 76"
                className="w-full pl-12 pr-4 py-4 bg-white border border-orange-200 rounded-xl outline-none focus:border-orange-500 font-black text-orange-600 placeholder:text-orange-300 transition-all"
              />
            </div>
            <button
              onClick={handleDeleteSpecificLoan}
              disabled={loading || !deleteLoanNo.trim()}
              className="md:w-auto w-full bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              ลบวง {deleteLoanNo || "..."} ถาวร
            </button>
          </div>
        </div>

        <div className="bg-red-50 p-6 md:p-8 rounded-2xl mb-8 border border-red-100">
          <h3 className="font-black text-red-800 mb-2 text-lg">
            ตัดยอดอัตโนมัติ (หลัง 16/04/2026)
          </h3>
          <p className="text-sm font-bold text-red-600/80 mb-6">
            ค้นหาตารางงวดที่ ยังไม่จ่าย และดิว หลัง 16 เมษา 2026
            เพื่อเปลี่ยนสถานะเป็นจ่ายแล้ว พร้อมหักลบยอดหนี้
          </p>
          <button
            onClick={handleBulkPay}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            รันสคริปต์ตัดยอดอัตโนมัติ
          </button>
        </div>

        {result && (
          <div
            className={`mt-8 p-6 rounded-2xl font-black text-center text-lg ${result.includes("❌") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}
          >
            {result}
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-8">
            <h4 className="font-black text-gray-500 mb-4 uppercase tracking-widest text-xs">
              บันทึกการทำงาน (Logs)
            </h4>
            <div className="bg-gray-900 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-2">
              {logs.map((log, i) => (
                <div key={i}>
                  {">"} {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
