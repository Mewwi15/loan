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
  limit,
} from "firebase/firestore";
import {
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Trash2,
  Search,
  RotateCcw,
  Calendar,
  Eraser,
} from "lucide-react";

export default function AdminToolsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState([]);

  const [deleteLoanNo, setDeleteLoanNo] = useState("");
  const [bulkDate, setBulkDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // ===============================================
  // 🌟 1. ตัดยอดรายวันอัตโนมัติ (ปลอดภัย)
  // ===============================================
  const handleSafeBulkPay = async () => {
    if (
      !window.confirm(
        `ยืนยันการตัดยอดอัตโนมัติ?\nระบบจะทำการเปลี่ยนสถานะค่างวดของวันที่ ${bulkDate} ทุกรายการที่ 'ยังไม่จ่าย' ให้กลายเป็น 'จ่ายแล้ว'`,
      )
    )
      return;

    setLoading(true);
    setResult("");
    setLogs([]);
    let count = 0;
    let totalAmount = 0;

    try {
      const q = query(
        collection(db, "schedules"),
        where("status", "==", "pending"),
        where("dueDate", "==", bulkDate),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult(`✅ ไม่มีรายการค้างชำระของวันที่ ${bulkDate} ครับ`);
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
          paymentDate: bulkDate,
          createdAt: serverTimestamp(),
        });

        count++;
        totalAmount += item.amount;
        setLogs((prev) => [
          ...prev,
          `✅ ตัดยอดวง ${item.loanNumber} | งวดที่ ${item.installmentNo} | ฿${item.amount}`,
        ]);
      }

      setResult(
        `🎉 ตัดยอดวันที่ ${bulkDate} สำเร็จ ${count} รายการ (รวม ฿${totalAmount.toLocaleString()})`,
      );
    } catch (err) {
      console.error("Bulk Pay Error:", err);
      setResult(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoSafeBulkPay = async () => {
    if (
      !window.confirm(
        `🚨 ยืนยันการกู้คืนข้อมูลของวันที่ ${bulkDate} ใช่หรือไม่?\nรายการที่ถูกกดรับเงินไปแล้วในวันนี้ จะเด้งกลับไปเป็น 'ยังไม่จ่าย' และคืนยอดหนี้กลับเข้าหน้าวอร์รูม!`,
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
        where("status", "==", "paid"),
        where("dueDate", "==", bulkDate),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult(`✅ ไม่มีรายการที่ต้องกู้คืนในวันที่ ${bulkDate} ครับ`);
        setLoading(false);
        return;
      }

      for (const document of snap.docs) {
        const item = { id: document.id, ...document.data() };

        await updateDoc(doc(db, "schedules", item.id), {
          status: "pending",
          paidAt: null,
          appliedPenalty: 0,
        });

        await updateDoc(doc(db, "loans", item.loanId), {
          remainingBalance: increment(item.amount),
          currentInstallment: increment(-1),
        });

        if (item.customerId) {
          await updateDoc(doc(db, "customers", item.customerId), {
            totalDebt: increment(item.amount),
          });
        }

        const transQ = query(
          collection(db, "transactions"),
          where("loanId", "==", item.loanId),
          where("installmentNo", "==", item.installmentNo),
          limit(1),
        );
        const transSnap = await getDocs(transQ);
        for (const tDoc of transSnap.docs) {
          await deleteDoc(doc(db, "transactions", tDoc.id));
        }

        count++;
        setLogs((prev) => [
          ...prev,
          `🔄 กู้คืนวง ${item.loanNumber} | งวดที่ ${item.installmentNo} | คืนหนี้: +฿${item.amount}`,
        ]);
      }

      setResult(`✨ กู้คืนยอดของวันที่ ${bulkDate} สำเร็จ ${count} รายการ!`);
    } catch (err) {
      console.error("Undo Bulk Pay Error:", err);
      setResult(`❌ เกิดข้อผิดพลาดในการกู้คืน: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // 🌟 2. ลบวงกู้ตามเลขที่ระบุ
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
        setResult(`✅ ไม่พบข้อมูล 'วง ${targetNumber}' ในระบบครับ`);
        setLoading(false);
        return;
      }

      let deletedCount = 0;

      for (const loanDoc of loansSnap.docs) {
        const loanData = loanDoc.data();
        const loanId = loanDoc.id;

        const schQ = query(
          collection(db, "schedules"),
          where("loanId", "==", loanId),
        );
        const schSnap = await getDocs(schQ);
        for (const sDoc of schSnap.docs) {
          await deleteDoc(doc(db, "schedules", sDoc.id));
        }

        const transQ = query(
          collection(db, "transactions"),
          where("loanId", "==", loanId),
        );
        const transSnap = await getDocs(transQ);
        for (const tDoc of transSnap.docs) {
          await deleteDoc(doc(db, "transactions", tDoc.id));
        }

        if (loanData.customerId) {
          const customerRef = doc(db, "customers", loanData.customerId);
          await updateDoc(customerRef, {
            activeLoans: increment(-1),
            totalDebt: increment(-(loanData.remainingBalance || 0)),
          });
        }

        await deleteDoc(doc(db, "loans", loanId));

        deletedCount++;
        setLogs((prev) => [
          ...prev,
          `ลบวง ${targetNumber} เรียบร้อย คืนหนี้ ฿${loanData.remainingBalance || 0}`,
        ]);
      }

      setResult(
        `🗑️ ลบข้อมูล 'วง ${targetNumber}' สำเร็จ ${deletedCount} รายการ!`,
      );
      setDeleteLoanNo("");
    } catch (err) {
      console.error(`Error deleting loan ${targetNumber}:`, err);
      setResult(`❌ เกิดข้อผิดพลาดในการลบ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // 🌟 3. กวาดล้างบิลผี (Clean Ghost Transactions) 🌟
  // ===============================================
  const handleCleanGhostTransactions = async () => {
    if (
      !window.confirm(
        "🚨 ยืนยันการล้างบิลผีใช่หรือไม่?\n\nระบบจะทำการค้นหา 'บิลใบเสร็จที่ถูกสร้างผิดพลาด' (เช่น บิลเกิดจากการกดเทสต์ หรือตารางกลับไปเป็นค้างจ่ายแล้ว) และลบทิ้งให้ทั้งหมด เพื่อให้ยอดกำไรกลับมาถูกต้อง!",
      )
    )
      return;

    setLoading(true);
    setResult("");
    setLogs([]);
    let count = 0;
    let deletedProfit = 0;

    try {
      // ดึงบิล transactions ทั้งหมดมาตรวจสอบ
      const transSnap = await getDocs(collection(db, "transactions"));

      for (const tDoc of transSnap.docs) {
        const tData = tDoc.data();

        // ไปเช็คตารางค่างวด (Schedules) ของบิลใบนี้
        const schQ = query(
          collection(db, "schedules"),
          where("loanId", "==", tData.loanId),
          where("installmentNo", "==", tData.installmentNo),
          limit(1),
        );
        const schSnap = await getDocs(schQ);

        // ถ้าตารางค่างวดยังเป็น "pending" (หรือโดนลบวงทิ้งไปแล้ว) แสดงว่าบิลนี้คือบิลผี! ให้ลบทิ้ง
        if (schSnap.empty || schSnap.docs[0].data().status === "pending") {
          await deleteDoc(doc(db, "transactions", tDoc.id));
          count++;
          deletedProfit += tData.profitShare || 0;
          setLogs((prev) => [
            ...prev,
            `🧹 ลบบิลผีวง ${tData.loanNumber || tData.loanId} | งวดที่ ${tData.installmentNo} | ดึงกำไรกลับ ฿${tData.profitShare || 0}`,
          ]);
        }
      }

      setResult(
        `✨ กวาดล้างบิลผีสำเร็จ ${count} รายการ (ดึงยอดกำไรที่เกินกลับมา ฿${deletedProfit.toLocaleString()})`,
      );
    } catch (err) {
      console.error("Clean Ghost Error:", err);
      setResult(`❌ เกิดข้อผิดพลาด: ${err.message}`);
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
              Admin Tools
            </h1>
            <p className="text-sm font-bold text-gray-500">
              สคริปต์จัดการฐานข้อมูล
            </p>
          </div>
        </div>

        {/* 🌟 ส่วนกวาดล้างบิลผี (ใหม่ล่าสุด) */}
        <div className="bg-emerald-50 border border-emerald-200 p-6 md:p-8 rounded-2xl mb-8">
          <h3 className="font-black text-emerald-800 mb-2 flex items-center gap-2 text-lg">
            <Eraser className="w-5 h-5" /> ระบบเคลียร์กำไรหลอน (ล้างบิลผี)
          </h3>
          <p className="text-sm font-bold text-emerald-700/80 mb-6">
            หากพบว่ายอดกำไรรายวันหรือรายเดือนใน Dashboard มีตัวเลขพุ่งสูงผิดปกติ
            ให้กดปุ่มนี้เพื่อล้างบิลที่ตกค้างในระบบทิ้ง
          </p>
          <button
            onClick={handleCleanGhostTransactions}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Eraser className="w-5 h-5" />
            )}
            คลิกเพื่อกวาดล้างบิลผีและปรับกำไรให้ถูกต้อง
          </button>
        </div>

        {/* ส่วนที่ 1: ตัดยอดอัตโนมัติ */}
        <div className="bg-blue-50 p-6 md:p-8 rounded-2xl mb-8 border border-blue-100">
          <h3 className="font-black text-blue-800 mb-2 text-lg">
            ตัดยอดรายวันอัตโนมัติ (Daily Bulk Pay)
          </h3>
          <p className="text-sm font-bold text-blue-600/80 mb-6">
            เลือกวันที่ต้องการตัดยอด
            ระบบจะค้นหาตารางของวันที่เลือกและเปลี่ยนเป็น จ่ายแล้ว
            ทั้งหมดในคลิกเดียว!
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border border-blue-200 gap-3 px-4 flex-1">
              <Calendar className="w-5 h-5 text-blue-500" />
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full bg-transparent outline-none font-black text-blue-700 text-sm cursor-pointer uppercase tracking-widest"
              />
            </div>

            <button
              onClick={handleSafeBulkPay}
              disabled={loading}
              className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-black px-8 py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              ตัดยอดของวันที่ {bulkDate.slice(-2)}
            </button>
          </div>

          <div className="pt-4 border-t border-blue-200/50 mt-2">
            <button
              onClick={handleUndoSafeBulkPay}
              disabled={loading}
              className="w-full bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-black py-3 rounded-xl shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              กู้คืนข้อมูล (UNDO การตัดยอดของวันที่ {bulkDate.slice(-2)})
            </button>
          </div>
        </div>

        {/* ส่วนที่ 2: ลบวงกู้ตามเลขที่ระบุ */}
        <div className="bg-orange-50 border border-orange-200 p-6 md:p-8 rounded-2xl mb-8">
          <h3 className="font-black text-orange-800 mb-2 flex items-center gap-2 text-lg">
            <Trash2 className="w-5 h-5" /> ล้างข้อมูลวงเทสต์ (ระบุเลขวง)
          </h3>
          <p className="text-sm font-bold text-orange-700/80 mb-6">
            พิมพ์เลขวงที่ต้องการลบทิ้งถาวร
            คืนค่ายอดหนี้ให้ลูกค้ากลับไปเป็นเหมือนเดิม
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
