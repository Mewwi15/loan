"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
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
  Edit3,
  Landmark,
  Save,
  Settings2,
  Clock,
  Package,
} from "lucide-react";

// --- รายชื่อธนาคารสำหรับเลือกตอนแก้ไข ---
const BANK_OPTIONS = [
  { owner: "พงศกร ศรีษเกตุ", bank: "TTB", acc: "9219175719", color: "#f6821f" },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "9809449482",
    color: "#1E4598",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821566310",
    color: "#F0A500",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "6070572475",
    color: "#00AEEF",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020337297038",
    color: "#EB008B",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "ไทยพาณิชย์",
    acc: "6152349291",
    color: "#4E2A84",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "6070572467",
    color: "#00AEEF",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821527017",
    color: "#F0A500",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กสิกร",
    acc: "0141543237",
    color: "#00A950",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "TTB",
    acc: "6952049879",
    color: "#f6821f",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020296778762",
    color: "#EB008B",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "9774355938",
    color: "#1E4598",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821527025",
    color: "#F0A500",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020425621834",
    color: "#EB008B",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "6590164049",
    color: "#1E4598",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ธกส.",
    acc: "020233790285",
    color: "#00572F",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กสิกร",
    acc: "2782464313",
    color: "#00A950",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "1153038803",
    color: "#00AEEF",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ไทยพาณิชย์",
    acc: "7332395238",
    color: "#4E2A84",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "เกียรตินาคิน",
    acc: "2031489700",
    color: "#7C2367",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "อาคารสงเคราะห์",
    acc: "001910308777",
    color: "#F37021",
  },
  {
    owner: "นันทินี ทองสุด",
    bank: "กสิกร",
    acc: "1972871156",
    color: "#00A950",
  },
];

export default function WarRoomPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState({ items: [], isLoaded: false });
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);

  const [expandedGroups, setExpandedGroups] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "loans"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // 🌟 1. Deduplication (ลบวงซ้ำแบบละเอียดขึ้น)
        const uniqueLoansMap = new Map();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const safeName = String(data.customerName || "")
            .split("(")[0]
            .replace(/\s+/g, "")
            .toLowerCase();
          const loanNumKey = String(data.loanNumber || doc.id)
            .trim()
            .toUpperCase();
          const principalStr = String(data.principal || 0);

          // ล็อกเป้าหมายให้แน่นขึ้น: เช็คทั้ง เลขวง + ชื่อคน + เงินต้น
          const uniqueKey = `${loanNumKey}-${safeName}-${data.category || "normal"}-${principalStr}`;

          if (uniqueLoansMap.has(uniqueKey)) {
            const existing = uniqueLoansMap.get(uniqueKey);
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

        const cleanLoans = Array.from(uniqueLoansMap.values());
        const groupedLoans = {};

        // 🌟 2. Grouping แบบ Exact Match (เลขวงต้องเหมือนกันเป๊ะๆ)
        cleanLoans.forEach((d) => {
          const progress =
            d.totalInstallments > 0
              ? (d.currentInstallment / d.totalInstallments) * 100
              : 0;
          const rawNum = String(d.loanNumber || "999999").trim();
          const groupKey = rawNum.toUpperCase(); // จัดกลุ่มด้วยอักษรเป๊ะๆ ไม่ใช้ parseInt แล้ว

          if (!groupedLoans[groupKey]) {
            groupedLoans[groupKey] = [];
          }
          groupedLoans[groupKey].push({
            ...d,
            progress,
            displayLoanNumber: rawNum,
          });
        });

        const finalLoanList = [];
        for (const key in groupedLoans) {
          const loansInSlot = groupedLoans[key];
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
              id: activeLoans.length > 1 ? `group-${key}` : baseLoan.id,
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
              ...(activeLoans.length === 1
                ? baseLoan
                : {
                    principal: baseLoan.principal,
                    interestRate: baseLoan.interestRate,
                    startDate: baseLoan.startDate,
                    frequency: baseLoan.frequency,
                    frequencyType: baseLoan.frequencyType,
                    category: baseLoan.category,
                    bankAccount: baseLoan.bankAccount,
                  }),
            });
          } else {
            loansInSlot.sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            );
            finalLoanList.push({
              isGroup: false,
              id: `closed-${key}`,
              displayLoanNumber: loansInSlot[0].displayLoanNumber,
              loanName: loansInSlot[0].loanName || loansInSlot[0].customerName,
              customerName: loansInSlot[0].customerName,
              status: "closed",
            });
          }
        }

        // 3. เรียงลำดับ ตัวเลขขึ้นก่อน แล้วตามด้วยตัวอักษร
        finalLoanList.sort((a, b) => {
          const strA = String(a.displayLoanNumber);
          const strB = String(b.displayLoanNumber);
          const numA = parseFloat(strA);
          const numB = parseFloat(strB);

          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB;
          }
          return strA.localeCompare(strB, "th");
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
        .toLowerCase()
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:border-orange-500 shadow-sm transition-all placeholder:text-gray-400"
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
                  className="bg-gray-50/80 rounded-[1.8rem] border border-gray-100 p-6 opacity-80 flex items-center gap-6"
                >
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

                    <div className="md:col-span-3 flex flex-col gap-2.5">
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

                    <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-5">
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

                      {/* 🌟 ปุ่มแก้ไขสัญญา */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLoan(loan);
                        }}
                        className="w-10 h-10 shrink-0 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm border border-blue-100"
                        title={
                          loan.isGroup
                            ? "แก้ไขรายละเอียดทั้งกลุ่ม (ทุกคน)"
                            : "แก้ไขรายละเอียดสัญญา"
                        }
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>

                      <div className="w-10 h-10 shrink-0 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-all border border-gray-100 shadow-sm">
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
                          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-500 hover:shadow-md cursor-pointer transition-all group/member flex justify-between items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-gray-800 group-hover/member:text-orange-500 transition-colors truncate">
                              {member.customerName}
                            </p>
                            <p className="text-[11px] font-black text-orange-600 mt-0.5">
                              ฿{(member.remainingBalance || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLoan(member);
                              }}
                              className="w-8 h-8 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg flex items-center justify-center transition-all"
                              title="แก้ไขรายละเอียดเฉพาะคนนี้"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <div className="w-8 h-8 flex items-center justify-center text-gray-300 group-hover/member:text-orange-400">
                              <ChevronRight className="w-4 h-4" />
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

      {/* --- Modals --- */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}
      {editingLoan && (
        <EditLoanModal
          loan={editingLoan}
          onClose={() => setEditingLoan(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 🌟 Component Modal แก้ไขรายละเอียดสัญญา
// ==========================================
function EditLoanModal({ loan, onClose }) {
  const [isSaving, setIsSaving] = useState(false);

  const bIndexInitial = BANK_OPTIONS.findIndex(
    (b) => b.acc === loan.bankAccount,
  );
  const [formData, setFormData] = useState({
    loanName: loan.loanName || loan.customerName || "",
    loanNumber: loan.loanNumber || loan.displayLoanNumber || "1",
    bankIndex: bIndexInitial >= 0 ? bIndexInitial : 0,
    principal: loan.principal || 0,
    interestPercent: loan.interestRate || 10,
    installments: loan.totalInstallments || 20,
    startDate: loan.startDate || new Date().toISOString().split("T")[0],
    frequency: loan.frequency || 1,
    type: loan.frequencyType || "day",
    category: loan.category || "normal",
  });

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }));
  };

  const selectedBank = BANK_OPTIONS[formData.bankIndex];
  const principalVal = formData.principal;
  const rawTotal =
    principalVal + (principalVal * formData.interestPercent) / 100;
  const installmentAmount = Math.ceil(rawTotal / formData.installments);
  const actualTotal = installmentAmount * formData.installments;
  const totalProfit = Math.max(actualTotal - principalVal, 0);
  const profitPerInstallment = Math.ceil(totalProfit / formData.installments);

  const handleSaveUpdate = async () => {
    setIsSaving(true);
    const batch = writeBatch(db);
    try {
      const loansToUpdate = loan.isGroup ? loan.originalLoans : [loan];

      for (const targetLoan of loansToUpdate) {
        const oldSchedulesQ = query(
          collection(db, "schedules"),
          where("loanId", "==", targetLoan.id),
        );
        const oldSchedulesSnap = await getDocs(oldSchedulesQ);

        const paidHistoryMap = {};
        oldSchedulesSnap.forEach((d) => {
          const data = d.data();
          if (data.status === "paid") {
            paidHistoryMap[data.installmentNo] = data;
          }
          batch.delete(d.ref);
        });

        let newRemainingBalance = actualTotal;
        let newCurrentInstallment = 0;

        for (let i = 0; i < formData.installments; i++) {
          let dueDate = new Date(formData.startDate);
          if (formData.type === "day") {
            dueDate.setDate(dueDate.getDate() + i * formData.frequency);
          } else {
            dueDate.setMonth(dueDate.getMonth() + i);
          }

          const instNo = i + 1;
          const isPaid = !!paidHistoryMap[instNo];

          if (isPaid) {
            newRemainingBalance -= installmentAmount;
            newCurrentInstallment++;
          }

          const schRef = doc(collection(db, "schedules"));
          batch.set(schRef, {
            loanId: targetLoan.id,
            customerId: targetLoan.customerId || null,
            customerName: targetLoan.customerName,
            loanName: formData.loanName,
            loanNumber: formData.loanNumber,
            installmentNo: instNo,
            dueDate: dueDate.toISOString().split("T")[0],
            amount: installmentAmount,
            profitShare: profitPerInstallment,
            status: isPaid ? "paid" : "pending",
            paidAt: isPaid ? paidHistoryMap[instNo].paidAt : null,
            category: formData.category,
          });
        }

        batch.update(doc(db, "loans", targetLoan.id), {
          loanName: formData.loanName,
          loanNumber: formData.loanNumber,
          bankName: selectedBank.bank,
          bankAccount: selectedBank.acc,
          bankOwner: selectedBank.owner,
          bankColor: selectedBank.color,
          principal: principalVal,
          interestRate: formData.interestPercent,
          totalAmount: actualTotal,
          remainingBalance: Math.max(0, newRemainingBalance),
          totalInstallments: formData.installments,
          currentInstallment: newCurrentInstallment,
          installmentAmount: installmentAmount,
          totalProfit: totalProfit,
          profitPerInstallment: profitPerInstallment,
          startDate: formData.startDate,
          frequency: formData.frequency,
          frequencyType: formData.type,
          category: formData.category,
        });
      }

      await batch.commit();
      alert(
        `✅ อัปเดตรายละเอียดสัญญา${loan.isGroup ? "ทั้งกลุ่ม" : ""}สำเร็จ!`,
      );
      onClose();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Settings2 />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">
                แก้ไขข้อมูลวงกู้
              </h2>
              {loan.isGroup && (
                <p className="text-[10px] font-bold text-orange-500 uppercase mt-0.5 tracking-widest">
                  ⚠️ กำลังแก้ไขข้อมูลพร้อมกันทั้งกลุ่ม
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                ชื่อวง
              </label>
              <input
                name="loanName"
                value={formData.loanName}
                onChange={handleFormChange}
                placeholder="ระบุชื่อวง..."
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-bold placeholder:text-gray-400 placeholder:font-bold text-gray-700"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                เลขวง
              </label>
              <input
                name="loanNumber"
                value={formData.loanNumber}
                onChange={handleFormChange}
                placeholder="ระบุเลขวง..."
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-black placeholder:text-gray-400 placeholder:font-bold text-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
              บัญชีธนาคาร
            </label>
            <select
              name="bankIndex"
              value={formData.bankIndex}
              onChange={handleFormChange}
              className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-bold text-gray-700 cursor-pointer"
            >
              {BANK_OPTIONS.map((b, i) => (
                <option key={i} value={i}>
                  {b.bank} - {b.owner} ({b.acc})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                เงินต้น {loan.isGroup ? "(ต่อคน)" : ""}
              </label>
              <input
                type="number"
                name="principal"
                value={formData.principal || ""}
                placeholder="0"
                onChange={handleFormChange}
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-black text-blue-600 placeholder:text-gray-400 placeholder:font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                ดอกเบี้ย (%)
              </label>
              <input
                type="number"
                name="interestPercent"
                value={formData.interestPercent || ""}
                placeholder="0"
                onChange={handleFormChange}
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-black text-green-600 placeholder:text-gray-400 placeholder:font-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                จำนวนงวด
              </label>
              <input
                type="number"
                name="installments"
                value={formData.installments || ""}
                placeholder="0"
                onChange={handleFormChange}
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-black text-gray-700 placeholder:text-gray-400 placeholder:font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                ส่งทุกๆ (วัน)
              </label>
              <input
                type="number"
                name="frequency"
                value={formData.frequency || ""}
                placeholder="0"
                onChange={handleFormChange}
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-black text-gray-700 placeholder:text-gray-400 placeholder:font-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                วันที่เริ่ม
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleFormChange}
                className="w-full mt-1 px-4 py-3 bg-gray-50 border rounded-xl font-bold text-gray-700"
              />
            </div>
          </div>

          <div className="bg-[#1F2335] p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                ยอดเก็บต่องวด
              </p>
              <p className="text-2xl font-black text-orange-400">
                ฿{installmentAmount.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                กำไรสุทธิวงนี้
              </p>
              <p className="text-2xl font-black text-green-400">
                ฿{totalProfit.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-gray-500 hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSaveUpdate}
            disabled={isSaving}
            className="flex-[2] py-4 bg-blue-500 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}{" "}
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Detail Modal ---
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
        setError("ไม่สามารถดึงตารางงวดได้");
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
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex justify-between items-center px-8 py-6 bg-gray-50/30 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-[#1F2335] rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">
                สรุปและตารางค่างวด
              </h2>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                วงที่ {loan.displayLoanNumber || loan.loanNumber || "-"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <X />
          </button>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[9px] font-black text-gray-400 uppercase">
                เงินต้น
              </p>
              <p className="text-lg font-black text-gray-800">
                ฿{(loan.principal || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[9px] font-black text-gray-400 uppercase">
                ยอดรับจริง
              </p>
              <p className="text-lg font-black text-gray-800">
                ฿{(loan.totalAmount || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-[9px] font-black text-orange-500 uppercase">
                กำไรสุทธิ
              </p>
              <p className="text-lg font-black text-orange-600">
                ฿{(loan.totalProfit || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-[1.5rem]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase text-gray-400">
                  <th className="p-4">งวด</th>
                  <th className="p-4 text-center">สถานะ</th>
                  <th className="p-4 text-right">ยอด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedule.map((s) => (
                  <tr
                    key={s.id}
                    className={s.status === "paid" ? "bg-green-50/30" : ""}
                  >
                    <td className="p-4 text-xs font-black text-gray-600">
                      {s.installmentNo}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded-md tracking-widest ${s.status === "paid" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-black text-right text-gray-800">
                      ฿{s.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
