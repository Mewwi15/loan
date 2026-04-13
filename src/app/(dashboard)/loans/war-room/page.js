"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  Search,
  ChevronRight,
  Activity,
  X,
  Loader2,
  CheckCircle2,
  CircleDashed,
  TrendingUp,
  AlertOctagon,
  Archive,
} from "lucide-react";

export default function WarRoomPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState({ items: [], isLoaded: false });
  const [selectedLoan, setSelectedLoan] = useState(null);

  // --- 1. ดึงข้อมูลวงกู้ทั้งหมดแบบ Real-time ---
  useEffect(() => {
    const q = query(collection(db, "loans"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // 🌟 1. จัดกลุ่มข้อมูลตามรหัสวง (Slot) ก่อน
        const groupedLoans = {};

        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          const progress =
            d.totalInstallments > 0
              ? (d.currentInstallment / d.totalInstallments) * 100
              : 0;
          const loanNum = String(d.loanNumber || "999999");

          if (!groupedLoans[loanNum]) {
            groupedLoans[loanNum] = [];
          }
          groupedLoans[loanNum].push({
            id: doc.id,
            ...d,
            progress,
          });
        });

        const finalLoanList = [];

        // 🌟 2. คัดเลือกเฉพาะ 1 ใบที่ดีที่สุดในแต่ละสล็อตมาแสดง
        for (const num in groupedLoans) {
          const loansInSlot = groupedLoans[num];

          // ตรวจสอบว่าในสล็อตนี้ มีวงที่ "กำลังเดินอยู่ (active)" หรือไม่
          const activeLoan = loansInSlot.find((l) => l.status !== "closed");

          if (activeLoan) {
            // ถ้ามีวงที่กำลังทำงาน ให้เอาวงนั้นมาโชว์ (วงที่ปิดแล้วจะถูกซ่อนอัตโนมัติ)
            finalLoanList.push(activeLoan);
          } else {
            // ถ้าไม่มีวงที่ active เลย แสดงว่าสล็อตนี้ "ว่าง"
            // ให้เอาวงที่เพิ่งปิดล่าสุดมาโชว์เป็นประวัติสีเทา
            loansInSlot.sort((a, b) => {
              const timeA = a.createdAt?.seconds || 0;
              const timeB = b.createdAt?.seconds || 0;
              return timeB - timeA; // เรียงจากเวลาล่าสุดไปเก่า
            });
            finalLoanList.push(loansInSlot[0]);
          }
        }

        // 🌟 3. เรียงลำดับคิวจาก วงน้อย ไป วงมาก (Natural Sort)
        finalLoanList.sort((a, b) => {
          const strA = String(a.loanNumber || "999999");
          const strB = String(b.loanNumber || "999999");
          return strA.localeCompare(strB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

        setData({ items: finalLoanList, isLoaded: true });
      },
      (error) => {
        console.error("Firebase Error:", error);
        setData((prev) => ({ ...prev, isLoaded: true }));
      },
    );

    return () => unsubscribe();
  }, []);

  // --- 2. ระบบค้นหาชื่อลูกค้า หรือ ชื่อวงกู้ ---
  const filteredLoans = useMemo(() => {
    return data.items.filter((loan) => {
      const search = searchTerm.toLowerCase();
      const matchCustomer = loan.customerName?.toLowerCase().includes(search);
      const matchLoanName = loan.loanName?.toLowerCase().includes(search);
      const matchLoanNumber = loan.loanNumber?.toString().includes(search);
      return matchCustomer || matchLoanName || matchLoanNumber;
    });
  }, [searchTerm, data.items]);

  if (!data.isLoaded)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="font-black text-[10px] uppercase tracking-[0.3em]">
          กำลังดึงข้อมูลจากวอร์รูม...
        </p>
      </div>
    );

  return (
    <div className="w-full pb-20 px-4 md:px-10 font-sans animate-in fade-in duration-500">
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 pt-10">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Activity className="w-6 h-6 text-orange-500" />
            หน้าวอติดตามยอดวงกู้
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Real-time Monitoring Dashboard
          </p>
        </div>

        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ รหัสวง..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:border-orange-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- รายการวงกู้ --- */}
      <div className="space-y-4">
        {filteredLoans.length > 0 ? (
          filteredLoans.map((loan, index) => {
            // 🟢 ตรวจสอบสถานะ: ถ้าปิดวงแล้ว ให้แสดงการ์ดสีเทา (วงว่าง)
            if (loan.status === "closed") {
              return (
                <div
                  key={loan.id}
                  className="bg-gray-50/80 rounded-[1.8rem] border border-gray-100 p-6 md:px-8 md:py-6 flex flex-col sm:flex-row sm:items-center gap-6 opacity-80 transition-all hover:opacity-100"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gray-200 flex items-center justify-center text-lg font-black text-gray-400 shadow-inner">
                      {loan.loanNumber || index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-gray-500 flex items-center gap-2">
                        วง {loan.loanNumber || index + 1}
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                          <Archive className="w-3 h-3" /> ว่าง (ปิดวงแล้ว)
                        </span>
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                        ลูกค้าล่าสุด: {loan.customerName}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // 🔴 ถ้าวงยัง Active ให้แสดงการ์ดปกติ
            return (
              <div
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
                className="bg-white rounded-[1.8rem] border border-gray-50 p-6 md:px-8 md:py-7 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 hover:border-orange-200 transition-all group cursor-pointer"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                  <div className="md:col-span-4 flex items-center gap-4">
                    <div
                      className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black transition-all shadow-sm"
                      style={{
                        backgroundColor: `${loan.bankColor || "#f97316"}15`,
                        color: loan.bankColor || "#f97316",
                        border: `1px solid ${loan.bankColor || "#f97316"}40`,
                      }}
                    >
                      {loan.loanNumber || index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                        วง {loan.loanNumber || index + 1} •{" "}
                        {loan.loanName || loan.customerName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                          {loan.customerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                      <span>สถานะการส่ง</span>
                      <span className="text-gray-700">
                        งวด {loan.currentInstallment} / {loan.totalInstallments}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${loan.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">
                        คงเหลือที่ต้องเก็บ
                      </p>
                      <p className="text-2xl font-black text-gray-800 tracking-tighter">
                        ฿{(loan.remainingBalance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 shrink-0 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-all border border-gray-100 group-hover:border-orange-200 shadow-sm">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
            <Activity className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-black text-xs uppercase tracking-[0.4em]">
              ไม่พบข้อมูลวงกู้ในระบบ
            </p>
          </div>
        )}
      </div>

      {/* --- Modal รายละเอียด --- */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}

// --- Component Modal สรุปกำไร ---
function LoanDetailModal({ loan, onClose }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "schedules"),
          where("loanId", "==", loan.id),
          orderBy("installmentNo", "asc"),
        );
        const snap = await getDocs(q);
        setSchedule(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Modal Error:", e);
        if (e.message.includes("index")) {
          setError("กรุณารอสร้าง Index ใน Firebase (ประมาณ 3-5 นาที)");
        } else {
          setError("ไม่สามารถดึงตารางงวดได้");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [loan.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#1F2335] rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">
                สรุปกำไรและตารางค่างวด
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">
                  วงที่ {loan.loanNumber || "-"}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {loan.loanName || loan.customerName}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                ยอดปล่อยกู้
              </p>
              <p className="text-xl font-black text-gray-800">
                ฿{(loan.principal || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                ยอดรับจริง
              </p>
              <p className="text-xl font-black text-gray-800">
                ฿{(loan.totalAmount || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-[#1F2335] p-5 rounded-2xl shadow-xl border border-white/5">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                กำไรสุทธิวงนี้
              </p>
              <p className="text-xl font-black text-white">
                ฿{(loan.totalProfit || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">
                กำไร / งวด
              </p>
              <p className="text-4xl font-black text-orange-600 tracking-tighter">
                ฿{(loan.profitPerInstallment || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center md:text-right bg-white/50 px-6 py-3 rounded-2xl border border-white/20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                ยอดเก็บ / งวด
              </p>
              <p className="text-xl font-black text-gray-800">
                ฿{(loan.installmentAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-y-auto max-h-[300px] rounded-[1.5rem] border border-gray-50 bg-white">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3 text-gray-300 font-black text-[10px] uppercase">
                <Loader2 className="w-6 h-6 animate-spin" />{" "}
                กำลังโหลดตารางงวด...
              </div>
            ) : error ? (
              <div className="py-20 text-center px-8">
                <AlertOctagon className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                <p className="text-xs font-black text-rose-500 uppercase tracking-widest">
                  {error}
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">งวด</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-right">ยอดเก็บ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedule.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/50 transition-colors ${item.status === "paid" ? "bg-green-50/20 opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 text-xs font-black text-gray-400">
                        {item.installmentNo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-[9px] font-black px-2.5 py-1 rounded-md tracking-widest ${item.status === "paid" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-gray-800 text-right">
                        ฿{(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
