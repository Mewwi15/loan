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
  Users,
  ChevronDown,
} from "lucide-react";

export default function WarRoomPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState({ items: [], isLoaded: false });
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [expandedGroups, setExpandedGroups] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "loans"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // 🌟 1. ดักจับและลบข้อมูลที่สร้างซ้ำ (Deduplication) ก่อนเลย!
        const uniqueLoansMap = new Map();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();

          // ทำความสะอาดชื่อลูกค้า (ตัดช่องว่างและวงเล็บทิ้งเพื่อเช็คความซ้ำ)
          const safeName = String(data.customerName || "")
            .split("(")[0]
            .replace(/\s+/g, "")
            .toLowerCase();

          const loanNumKey = String(data.loanNumber || doc.id).trim();

          // กุญแจเช็คของซ้ำ: รหัสวง + ชื่อคน (ถ้าคนเดิมอยู่รหัสวงเดิม = ข้อมูลเบิ้ลชัวร์ๆ)
          const uniqueKey = `${loanNumKey}-${safeName}`;

          if (uniqueLoansMap.has(uniqueKey)) {
            const existing = uniqueLoansMap.get(uniqueKey);
            // เลือกว่าจะเก็บอันไหนไว้ (เอาอันที่เป็น Active หรือชื่อสมบูรณ์กว่า)
            if (existing.status === "closed" && data.status === "active") {
              uniqueLoansMap.set(uniqueKey, { id: doc.id, ...data });
            } else if (existing.status === data.status) {
              if (
                !existing.customerName?.includes("(") &&
                data.customerName?.includes("(")
              ) {
                uniqueLoansMap.set(uniqueKey, { id: doc.id, ...data });
              }
            }
          } else {
            uniqueLoansMap.set(uniqueKey, { id: doc.id, ...data });
          }
        });

        // ได้ข้อมูลที่คลีน 100% (ไม่มีแฝด) แล้ว
        const cleanLoans = Array.from(uniqueLoansMap.values());

        // 2. นำข้อมูลมาจัดกลุ่มตามรหัสวง (Slot) เผื่อกรณีที่มีคนกู้กลุ่ม (หลายคนคนละชื่อ แต่อยู่รหัสวงเดียวกัน)
        const groupedLoans = {};

        cleanLoans.forEach((d) => {
          const progress =
            d.totalInstallments > 0
              ? (d.currentInstallment / d.totalInstallments) * 100
              : 0;

          const rawNum = String(d.loanNumber || "999999").trim();
          const loanNumStr = parseInt(rawNum, 10) || 999999;

          if (!groupedLoans[loanNumStr]) {
            groupedLoans[loanNumStr] = [];
          }
          groupedLoans[loanNumStr].push({
            ...d, // d มี id อยู่แล้ว
            progress,
            displayLoanNumber: rawNum,
          });
        });

        const finalLoanList = [];

        // 3. ยุบรวม (Merge)
        for (const num in groupedLoans) {
          const loansInSlot = groupedLoans[num];
          const activeLoans = loansInSlot.filter((l) => l.status !== "closed");

          if (activeLoans.length > 0) {
            const totalRemaining = activeLoans.reduce(
              (sum, l) => sum + (Number(l.remainingBalance) || 0),
              0,
            );
            const baseLoan = activeLoans[0];
            const customerNamesList = activeLoans
              .map((l) => l.customerName)
              .join(", ");

            finalLoanList.push({
              isGroup: activeLoans.length > 1,
              id: activeLoans.length > 1 ? `group-${num}` : baseLoan.id,
              displayLoanNumber: baseLoan.displayLoanNumber,
              loanName: baseLoan.loanName || "วงกู้รวม",
              customerNamesList: customerNamesList,
              memberCount: activeLoans.length,
              remainingBalance: totalRemaining,
              currentInstallment: baseLoan.currentInstallment,
              totalInstallments: baseLoan.totalInstallments,
              progress: baseLoan.progress,
              bankColor: baseLoan.bankColor,
              status: "active",
              originalLoans: activeLoans,
              ...(activeLoans.length === 1 ? baseLoan : {}),
            });
          } else {
            loansInSlot.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            );
            finalLoanList.push({
              isGroup: false,
              id: `closed-${num}`,
              displayLoanNumber: loansInSlot[0].displayLoanNumber,
              loanName: loansInSlot[0].loanName || loansInSlot[0].customerName,
              customerName: loansInSlot[0].customerName,
              status: "closed",
            });
          }
        }

        // 4. เรียงลำดับจาก วงน้อย -> วงมาก
        finalLoanList.sort((a, b) => {
          const numA = parseInt(a.displayLoanNumber, 10) || 999999;
          const numB = parseInt(b.displayLoanNumber, 10) || 999999;
          return numA - numB;
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

  const filteredLoans = useMemo(() => {
    return data.items.filter((loan) => {
      const search = searchTerm.toLowerCase();
      const matchCustomer =
        loan.customerNamesList?.toLowerCase().includes(search) ||
        loan.customerName?.toLowerCase().includes(search);
      const matchLoanName = loan.loanName?.toLowerCase().includes(search);
      const matchLoanNumber = loan.displayLoanNumber
        ?.toString()
        .includes(search);
      return matchCustomer || matchLoanName || matchLoanNumber;
    });
  }, [searchTerm, data.items]);

  const handleCardClick = (loan) => {
    if (loan.isGroup) {
      setExpandedGroups((prev) =>
        prev.includes(loan.id)
          ? prev.filter((id) => id !== loan.id)
          : [...prev, loan.id],
      );
    } else {
      setSelectedLoan(loan);
    }
  };

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
            placeholder="ค้นหาชื่อกลุ่ม หรือ รหัสวง..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:border-orange-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredLoans.length > 0 ? (
          filteredLoans.map((loan, index) => {
            if (loan.status === "closed") {
              return (
                <div
                  key={loan.id}
                  className="bg-gray-50/80 rounded-[1.8rem] border border-gray-100 p-6 md:px-8 md:py-6 flex flex-col sm:flex-row sm:items-center gap-6 opacity-80 transition-all hover:opacity-100"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gray-200 flex items-center justify-center text-lg font-black text-gray-400 shadow-inner">
                      {loan.displayLoanNumber || index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-gray-500 flex items-center gap-2">
                        วง {loan.displayLoanNumber || index + 1}
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

            const isExpanded = expandedGroups.includes(loan.id);

            return (
              <div
                key={loan.id}
                className="bg-white rounded-[1.8rem] border border-gray-50 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 hover:border-orange-200 transition-all group overflow-hidden"
              >
                <div
                  onClick={() => handleCardClick(loan)}
                  className="p-6 md:px-8 md:py-7 cursor-pointer"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                    <div className="md:col-span-4 flex items-center gap-4">
                      <div
                        className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black transition-all shadow-sm relative"
                        style={{
                          backgroundColor: `${loan.bankColor || "#f97316"}15`,
                          color: loan.bankColor || "#f97316",
                          border: `1px solid ${loan.bankColor || "#f97316"}40`,
                        }}
                      >
                        {loan.displayLoanNumber || index + 1}
                        {loan.isGroup && (
                          <div className="absolute -top-2 -right-2 bg-[#1F2335] text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                            {loan.memberCount}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                          วง {loan.displayLoanNumber || index + 1} •{" "}
                          {loan.loanName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                            {loan.isGroup
                              ? `ลูกวง ${loan.memberCount} คน: ${loan.customerNamesList}`
                              : loan.customerNamesList || loan.customerName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                        <span>สถานะการส่ง</span>
                        <span className="text-gray-700">
                          งวด {loan.currentInstallment} /{" "}
                          {loan.totalInstallments}
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
                          {loan.isGroup
                            ? "ยอดคงเหลือรวม"
                            : "คงเหลือที่ต้องเก็บ"}
                        </p>
                        <p className="text-2xl font-black text-gray-800 tracking-tighter">
                          ฿{(loan.remainingBalance || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="w-12 h-12 shrink-0 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-all border border-gray-100 group-hover:border-orange-200 shadow-sm">
                        {loan.isGroup ? (
                          <ChevronDown
                            className={`w-6 h-6 transition-transform ${isExpanded ? "rotate-180 text-orange-500" : ""}`}
                          />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {loan.isGroup && isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 md:px-8 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Users className="w-3 h-3" /> รายชื่อลูกวงทั้งหมด
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {loan.originalLoans.map((member) => (
                        <div
                          key={member.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLoan(member);
                          }}
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all group/member"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-black text-gray-800 group-hover/member:text-orange-500 transition-colors">
                                {member.customerName}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                ยอดคงเหลือ
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-black text-gray-800">
                                ฿
                                {(
                                  member.remainingBalance || 0
                                ).toLocaleString()}
                              </p>
                              <div className="text-[9px] font-bold text-orange-400 mt-1 flex items-center justify-end gap-1">
                                ดูตาราง <ChevronRight className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
}

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
                  วงที่ {loan.displayLoanNumber || loan.loanNumber || "-"}
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
