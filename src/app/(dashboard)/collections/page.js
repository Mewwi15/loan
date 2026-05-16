"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import {
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  MessageCircle,
  Megaphone, // เปลี่ยนไอคอน Header ให้ดูเข้ากับการทวงถาม
} from "lucide-react";

export default function CollectionsPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "schedules"),
        where("dueDate", "==", selectedDate),
        where("status", "==", "pending"),
      );

      const querySnapshot = await getDocs(q);
      const list = [];

      for (const docSnap of querySnapshot.docs) {
        const scheduleData = docSnap.data();
        const loanRef = doc(db, "loans", scheduleData.loanId);
        const loanSnap = await getDoc(loanRef);

        if (loanSnap.exists() && loanSnap.data().status !== "closed") {
          const loanData = loanSnap.data();
          list.push({
            id: docSnap.id,
            ...scheduleData,
            phone: loanData.customerPhone || "ไม่มีเบอร์โทร",
            chatLink: loanData.chatLink || "",
            loanNumber: loanData.loanNumber || "-",
            loanName: loanData.loanName || loanData.customerName,
            bankColor: loanData.bankColor || "#cbd5e1",
            callStatus: scheduleData.callStatus || "pending",
          });
        }
      }

      list.sort((a, b) => {
        const strA = String(a.loanNumber || "999999");
        const strB = String(b.loanNumber || "999999");
        return strA.localeCompare(strB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

      setCollections(list);
    } catch (error) {
      console.error("Error fetching collections:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const toggleCallStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "pending" ? "contacted" : "pending";

    setCollections((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, callStatus: newStatus } : item,
      ),
    );

    try {
      const docRef = doc(db, "schedules", id);
      await updateDoc(docRef, {
        callStatus: newStatus,
        lastContactedAt:
          newStatus === "contacted" ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("ไม่สามารถบันทึกสถานะได้ ระบบจะรีเซ็ตค่าเดิม");
      setCollections((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, callStatus: currentStatus } : item,
        ),
      );
    }
  };

  const filteredCollections = collections.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(searchLower) ||
      item.loanName.toLowerCase().includes(searchLower) ||
      item.loanNumber.toString().includes(searchLower)
    );
  });

  const totalToCall = collections.length;
  const contactedCount = collections.filter(
    (i) => i.callStatus === "contacted",
  ).length;

  return (
    <div className="w-full pb-20 px-4 md:px-8 max-w-5xl mx-auto font-sans animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 pt-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-500" /> รายการติดตามทวงถาม
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            เช็คยอดและติดตามลูกค้าประจำวัน
          </p>
        </div>

        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 w-full md:w-auto">
          <CalendarIcon className="w-5 h-5 text-orange-500 ml-2 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent outline-none cursor-pointer text-gray-700 font-semibold text-sm w-full p-1"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-900 p-4 rounded-2xl shadow-md flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium text-orange-400 mb-1">
              ยอดคิวทั้งหมด
            </p>
            <p className="text-2xl font-bold text-white">
              {totalToCall}{" "}
              <span className="text-sm font-normal opacity-70">ราย</span>
            </p>
          </div>
          <Clock className="absolute right-[-10px] bottom-[-10px] w-16 h-16 text-white opacity-10" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium text-gray-500 mb-1">ทวงแล้ว</p>
            <p className="text-2xl font-bold text-emerald-600">
              {contactedCount}{" "}
              <span className="text-sm font-normal text-gray-400">ราย</span>
            </p>
          </div>
          <CheckCircle2 className="absolute right-[-10px] bottom-[-10px] w-16 h-16 text-emerald-500 opacity-10" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, ชื่อวง หรือ รหัสวง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none font-medium text-gray-700 text-sm"
          />
        </div>
      </div>

      {/* Collections List - Redesigned for Clarity */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-500 font-medium text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredCollections.length > 0 ? (
          filteredCollections.map((item) => (
            <div
              key={item.id}
              className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row gap-4 justify-between ${
                item.callStatus === "contacted"
                  ? "bg-gray-50 border-gray-200 opacity-70 grayscale-[30%]"
                  : "bg-white border-gray-200 shadow-sm hover:border-orange-200 hover:shadow-md"
              }`}
            >
              {/* ข้อมูลลูกค้า และ ยอดเงิน (Mobile-First Layout) */}
              <div className="flex flex-col gap-3 w-full md:w-auto md:flex-1">
                {/* แถวบน: รูปโปรไฟล์ + ชื่อ */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
                      style={{
                        backgroundColor:
                          item.callStatus === "contacted"
                            ? "#f3f4f6"
                            : `${item.bankColor}15`,
                        color:
                          item.callStatus === "contacted"
                            ? "#9ca3af"
                            : item.bankColor,
                      }}
                    >
                      {item.loanNumber}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">
                        {item.customerName}
                      </h3>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">
                        วง {item.loanName} • {item.phone}
                      </p>
                    </div>
                  </div>

                  {/* แถวบนขวา: ยอดเงิน (แสดงเฉพาะบน Desktop, ซ่อนในมือถือ) */}
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      ยอดเก็บงวดนี้
                    </p>
                    <p className="text-xl font-bold text-orange-600">
                      ฿{item.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* กล่องยอดเงินสำหรับ Mobile (ซ่อนใน Desktop) */}
                <div className="md:hidden bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex justify-between items-center mt-1">
                  <span className="text-xs font-semibold text-gray-600">
                    ยอดเก็บงวดนี้
                  </span>
                  <span className="text-lg font-bold text-orange-600">
                    ฿{item.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* โซนปุ่มกด (วางเรียงกันแนวนอนบนมือถือ, และขวาบน Desktop) */}
              <div className="flex flex-row gap-2 w-full md:w-[280px] shrink-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0">
                {/* ปุ่มแชท Facebook */}
                {item.chatLink ? (
                  <a
                    href={item.chatLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none md:w-[48px] flex justify-center items-center py-2.5 md:py-0 bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] hover:bg-[#dbeafe] rounded-xl transition-colors"
                    title="ทักแชท Messenger"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="ml-2 text-sm font-semibold md:hidden">
                      แชท
                    </span>
                  </a>
                ) : (
                  <div
                    className="flex-1 md:flex-none md:w-[48px] flex justify-center items-center py-2.5 md:py-0 bg-gray-50 text-gray-300 border border-gray-200 rounded-xl cursor-not-allowed"
                    title="ไม่มีลิงก์แชท"
                  >
                    <MessageCircle className="w-5 h-5 opacity-50" />
                    <span className="ml-2 text-sm font-semibold md:hidden">
                      ไม่มีแชท
                    </span>
                  </div>
                )}

                {/* ปุ่มยืนยันสถานะ (ปุ่มใหญ่ เห็นชัดเจน) */}
                <button
                  onClick={() => toggleCallStatus(item.id, item.callStatus)}
                  className={`flex-[2] md:flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 transition-all ${
                    item.callStatus === "contacted"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                  }`}
                >
                  {item.callStatus === "contacted" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ทวงแล้ว</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                      <span>รอทวง</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-semibold text-gray-500">
              ไม่มีคิวงานค้างในวันนี้
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
