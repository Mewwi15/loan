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
  PhoneCall,
  CheckCircle2,
  Clock,
  Check,
  Loader2,
  Landmark,
  TrendingUp,
  AlertCircle,
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

        // 🌟 ไฮไลท์การแก้ปัญหา: เช็คด้วยว่าวงกู้หลักต้องไม่ถูก "ปิด" (status !== "closed")
        if (loanSnap.exists() && loanSnap.data().status !== "closed") {
          const loanData = loanSnap.data();
          list.push({
            id: docSnap.id,
            ...scheduleData,
            phone: loanData.customerPhone || "ไม่มีเบอร์โทร",
            loanNumber: loanData.loanNumber || "-",
            loanName: loanData.loanName || loanData.customerName,
            bankName: loanData.bankName || "ไม่ระบุ",
            bankOwner: loanData.bankOwner || "ไม่ระบุ",
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
    <div className="w-full pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 pt-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <PhoneCall className="w-7 h-7 text-orange-500" /> คิวติดตามทวงถาม
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
            Daily Follow-up List
          </p>
        </div>

        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 px-4 font-black text-gray-700">
          <CalendarIcon className="w-4 h-4 text-orange-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent outline-none cursor-pointer uppercase tracking-widest text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#1F2335] p-6 rounded-[1.5rem] shadow-lg flex items-center justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
              คิวที่ต้องตามวันนี้
            </p>
            <p className="text-3xl font-black">
              {totalToCall}{" "}
              <span className="text-sm opacity-50 font-bold tracking-normal">
                ราย
              </span>
            </p>
          </div>
          <Clock className="w-10 h-10 text-orange-400 opacity-30" />
        </div>

        <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              ทวงเรียบร้อยแล้ว
            </p>
            <p className="text-3xl font-black text-green-600">
              {contactedCount}{" "}
              <span className="text-sm text-gray-300 font-bold tracking-normal">
                ราย
              </span>
            </p>
          </div>
          <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20" />
        </div>
      </div>

      <div className="bg-white p-2 rounded-[1.2rem] shadow-sm border border-gray-100 mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, ชื่อวง หรือ รหัสวง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-bold text-gray-700 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            กำลังโหลดข้อมูลคิวงาน...
          </div>
        ) : filteredCollections.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {filteredCollections.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col xl:flex-row items-start xl:items-center justify-between p-6 gap-6 transition-all duration-300 ${
                  item.callStatus === "contacted"
                    ? "opacity-50 bg-gray-50/50 grayscale-[30%]"
                    : "hover:bg-orange-50/5"
                }`}
              >
                <div className="flex items-center gap-4 w-full xl:w-auto xl:min-w-[250px]">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shrink-0 shadow-sm"
                    style={{
                      backgroundColor:
                        item.callStatus === "contacted"
                          ? "#f3f4f6"
                          : `${item.bankColor}15`,
                      color:
                        item.callStatus === "contacted"
                          ? "#9ca3af"
                          : item.bankColor,
                      border: `1px solid ${item.callStatus === "contacted" ? "transparent" : `${item.bankColor}30`}`,
                    }}
                  >
                    {item.loanNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-800">
                      วง {item.loanNumber} • {item.customerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-400 tracking-widest">
                        {item.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 w-full xl:w-auto xl:flex-1 xl:justify-end">
                  <div className="min-w-[100px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      กำไร
                    </p>
                    <p className="text-sm font-black text-green-500 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" /> +฿
                      {(item.profitShare || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="min-w-[180px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      บัญชีรับโอน
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${item.bankColor}15` }}
                      >
                        <Landmark
                          className="w-3.5 h-3.5"
                          style={{ color: item.bankColor }}
                        />
                      </div>
                      <p className="text-base font-black text-gray-700">
                        {item.bankName}{" "}
                        <span className="text-[14px] text-gray-400 font-bold ml-1">
                          ({item.bankOwner})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right min-w-[120px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      ยอดเก็บงวดนี้
                    </p>
                    <p className="text-xl font-black text-gray-800 tracking-tight">
                      ฿{item.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end border-t xl:border-t-0 border-gray-100 pt-4 xl:pt-0 xl:pl-6 xl:border-l">
                  <a
                    href={`tel:${item.phone}`}
                    className="p-3 bg-white shadow-sm border border-gray-100 hover:shadow-md text-gray-400 hover:text-orange-500 rounded-2xl transition-all"
                    title="โทรหาลูกค้า"
                  >
                    <PhoneCall className="w-5 h-5" />
                  </a>

                  <button
                    onClick={() => toggleCallStatus(item.id, item.callStatus)}
                    className={`relative w-[120px] h-[48px] rounded-[1.5rem] p-1.5 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner flex items-center ${
                      item.callStatus === "contacted"
                        ? "bg-green-100"
                        : "bg-rose-50"
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${item.callStatus === "contacted" ? "opacity-100 text-green-900" : "opacity-0"}`}
                      >
                        ทวงแล้ว
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${item.callStatus === "pending" ? "opacity-100 text-rose-900" : "opacity-0"}`}
                      >
                        รอทวง
                      </span>
                    </div>

                    <div
                      className={`w-9 h-9 bg-white rounded-xl shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center z-10 ${
                        item.callStatus === "contacted"
                          ? "translate-x-[72px]"
                          : "translate-x-0"
                      }`}
                    >
                      {item.callStatus === "contacted" ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center opacity-40">
            <CheckCircle2 className="w-16 h-16 text-gray-300 mb-4" />
            <p className="font-black text-xs uppercase tracking-[0.4em]">
              เคลียร์คิวงานวันนี้หมดแล้ว
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
