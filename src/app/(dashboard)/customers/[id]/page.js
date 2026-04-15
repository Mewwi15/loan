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
  writeBatch,
  serverTimestamp,
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
  PowerOff,
  Edit,
  Landmark,
  Save,
} from "lucide-react";
import Link from "next/link";

// --- รายชื่อธนาคารแบบเดียวกับหน้า New Loan ---
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

export default function CustomerDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const customerId = unwrappedParams.id;

  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal ตารางงวด (พรีวิวเฉยๆ)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // 🌟 State สำหรับฟอร์ม "แก้ไขสัญญาเต็มรูปแบบ"
  const [editContractModalOpen, setEditContractModalOpen] = useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [isCustomFreq, setIsCustomFreq] = useState(false);
  const [originalTotalAmount, setOriginalTotalAmount] = useState(0);

  const [formData, setFormData] = useState({
    loanId: "",
    loanName: "",
    loanNumber: "1",
    bankIndex: 0,
    principal: 0,
    interestPercent: 10,
    installments: 20,
    startDate: new Date().toISOString().split("T")[0],
    frequency: 1,
    type: "day",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const customerDoc = await getDoc(doc(db, "customers", customerId));
      if (customerDoc.exists()) {
        const customerData = customerDoc.data();
        setCustomer(customerData);

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

  // ฟังก์ชันคำนวณตัวเลขสำหรับฟอร์มแก้ไข
  const principal = Number(formData.principal) || 0;
  const percent = Number(formData.interestPercent) || 0;
  const count = Math.max(Number(formData.installments) || 1, 1);
  const rawTotalAmount = principal + (principal * percent) / 100;
  const installmentAmount = Math.ceil(rawTotalAmount / count);
  const actualTotalToCollect = installmentAmount * count;
  const totalProfit = Math.max(actualTotalToCollect - principal, 0);
  const profitPerInstallment = Math.ceil(totalProfit / count);

  const selectedBankInfo = BANK_OPTIONS[formData.bankIndex] || BANK_OPTIONS[0];

  // 🌟 เปิดฟอร์มแก้ไขสัญญา
  const openEditContract = (loan) => {
    // หา Bank Index จากข้อมูลเดิม
    const bIndex = BANK_OPTIONS.findIndex((b) => b.acc === loan.bankAccount);

    setOriginalTotalAmount(loan.totalAmount || 0);
    setFormData({
      loanId: loan.id,
      loanName: loan.loanName || loan.customerName,
      loanNumber: loan.loanNumber || "1",
      bankIndex: bIndex >= 0 ? bIndex : 0,
      principal: loan.principal || 0,
      interestPercent: loan.interestRate || 0,
      installments: loan.totalInstallments || 20,
      startDate: loan.startDate || new Date().toISOString().split("T")[0],
      frequency: loan.frequency || 1,
      type: loan.frequencyType || "day",
    });

    setIsCustomFreq(
      ![1, 5, 7].includes(loan.frequency) && loan.frequencyType === "day",
    );
    setEditContractModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    if (type === "number") {
      finalValue = value === "" ? 0 : Number(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const setFreq = (val, type = "day") => {
    setIsCustomFreq(false);
    setFormData((prev) => ({ ...prev, frequency: val, type: type }));
  };

  // 🌟 บันทึกการแก้ไขสัญญาแบบเต็มระบบ (โละตารางเก่า สร้างตารางใหม่)
  const handleUpdateContract = async () => {
    if (
      !window.confirm(
        "⚠️ ยืนยันการแก้ไขสัญญา?\n(ระบบจะทำการลบตารางค่างวดเดิมทั้งหมด และสร้างใหม่ตามเงื่อนไขนี้)",
      )
    )
      return;

    setIsSavingContract(true);
    const batch = writeBatch(db);

    try {
      // 1. ลบตารางงวดเดิมของวงนี้ทั้งหมด
      const oldSchedulesQ = query(
        collection(db, "schedules"),
        where("loanId", "==", formData.loanId),
      );
      const oldSchedulesSnap = await getDocs(oldSchedulesQ);
      oldSchedulesSnap.forEach((d) => {
        batch.delete(d.ref);
      });

      // 2. อัปเดตข้อมูลวงกู้ใหม่
      const loanRef = doc(db, "loans", formData.loanId);
      batch.update(loanRef, {
        loanName: formData.loanName,
        loanNumber: formData.loanNumber,
        bankOwner: selectedBankInfo.owner,
        bankName: selectedBankInfo.bank,
        bankAccount: selectedBankInfo.acc,
        bankColor: selectedBankInfo.color,
        principal: principal,
        interestRate: percent,
        totalAmount: actualTotalToCollect,
        remainingBalance: actualTotalToCollect, // รีเซ็ตยอดคงเหลือ
        totalInstallments: count,
        currentInstallment: 0, // รีเซ็ตงวดปัจจุบัน
        installmentAmount: installmentAmount,
        totalProfit: totalProfit,
        profitPerInstallment: profitPerInstallment,
        startDate: formData.startDate,
        frequency: formData.frequency,
        frequencyType: formData.type,
      });

      // 3. สร้างตารางค่างวดใหม่
      for (let i = 0; i < count; i++) {
        let dueDate = new Date(formData.startDate);
        if (formData.type === "day") {
          dueDate.setDate(
            dueDate.getDate() + i * Number(formData.frequency || 1),
          );
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        const scheduleRef = doc(collection(db, "schedules"));
        batch.set(scheduleRef, {
          loanId: formData.loanId,
          customerId: customerId,
          customerName: customer.nickname || customer.name,
          loanName: formData.loanName,
          loanNumber: formData.loanNumber,
          installmentNo: i + 1,
          dueDate: dueDate.toISOString().split("T")[0],
          amount: installmentAmount,
          profitShare: profitPerInstallment,
          status: "pending",
        });
      }

      // 4. หักลบกลบหนี้ในข้อมูลลูกค้า (เอาหนี้เก่าออก เอาหนี้ใหม่ใส่)
      const diffDebt = actualTotalToCollect - originalTotalAmount;
      const customerRef = doc(db, "customers", customerId);
      batch.update(customerRef, {
        totalDebt: increment(diffDebt),
      });

      await batch.commit();
      alert("✅ อัปเดตข้อมูลสัญญาเรียบร้อยแล้ว!");

      setEditContractModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating contract:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขสัญญา");
    } finally {
      setIsSavingContract(false);
    }
  };

  const handleCloseLoan = async (loanId, remainingBalance) => {
    if (
      !window.confirm(
        "ยืนยันการปิดวงกู้นี้? \n(วงกู้จะหายไปจากหน้านี้ และขึ้นสล็อต 'ว่าง' ในหน้าวอร์รูม)",
      )
    )
      return;

    try {
      await updateDoc(doc(db, "loans", loanId), {
        status: "closed",
        remainingBalance: 0,
      });

      await updateDoc(doc(db, "customers", customerId), {
        activeLoans: increment(-1),
        totalDebt: increment(-remainingBalance),
      });

      alert("ปิดวงกู้สำเร็จ!");
      fetchData();
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

                <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-start">
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
                    <p className="text-2xl md:text-3xl font-black text-orange-500">
                      ฿{loan.installmentAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-gray-50/30 grid grid-cols-2 gap-6">
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

                <div className="p-4 md:p-6 bg-white border-t border-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleCloseLoan(loan.id, loan.remainingBalance)
                      }
                      className="text-[12px] md:text-[14px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 md:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <PowerOff className="w-3 h-3" />{" "}
                      <span className="hidden sm:inline">ปิดวงกู้</span>
                    </button>

                    {/* 🌟 ปุ่มแก้ไขสัญญาแบบเต็มรูปแบบ */}
                    <button
                      onClick={() => openEditContract(loan)}
                      className="text-[12px] md:text-[14px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 md:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />{" "}
                      <span className="hidden sm:inline">แก้ไขสัญญา</span>
                    </button>
                  </div>

                  <button
                    onClick={() => openSchedule(loan)}
                    className="bg-gray-900 hover:bg-black text-white px-6 md:px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
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

      {/* 🌟 1. MODAL: ฟอร์มแก้ไขสัญญาแบบเต็ม (เหมือนหน้า New Loan) */}
      {editContractModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => !isSavingContract && setEditContractModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                  <Edit className="w-6 h-6 text-blue-500" /> แก้ไขข้อมูลสัญญา
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  ปรับปรุงเงื่อนไข และสร้างตารางค่างวดใหม่
                </p>
              </div>
              <button
                onClick={() => setEditContractModalOpen(false)}
                disabled={isSavingContract}
                className="p-2.5 bg-white border border-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 md:p-8 flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ชื่อวงกู้ / กลุ่มแชร์
                  </label>
                  <input
                    name="loanName"
                    type="text"
                    value={formData.loanName}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ลำดับวงกู้
                  </label>
                  <input
                    name="loanNumber"
                    type="text"
                    value={formData.loanNumber}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black transition-all text-gray-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ยอดปล่อยกู้
                  </label>
                  <input
                    name="principal"
                    type="number"
                    value={formData.principal === 0 ? "" : formData.principal}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-xl text-gray-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ดอกเบี้ย (%)
                  </label>
                  <input
                    name="interestPercent"
                    type="number"
                    step="0.01"
                    value={
                      formData.interestPercent === 0
                        ? ""
                        : formData.interestPercent
                    }
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-xl text-green-600 transition-all"
                  />
                </div>
              </div>

              <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Clock className="w-3 h-3 text-blue-500" /> รอบการส่งเงิน
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "รายวัน", val: 1, type: "day" },
                    { label: "5 วัน", val: 5, type: "day" },
                    { label: "7 วัน", val: 7, type: "day" },
                    { label: "รายเดือน", val: 1, type: "month" },
                  ].map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setFreq(f.val, f.type)}
                      className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                        !isCustomFreq &&
                        formData.frequency === f.val &&
                        formData.type === f.type
                          ? "bg-blue-500 border-blue-500 text-white shadow-md"
                          : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFreq(true);
                      setFormData((p) => ({ ...p, type: "day" }));
                    }}
                    className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                      isCustomFreq
                        ? "bg-blue-500 border-blue-500 text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"
                    }`}
                  >
                    กำหนดเอง
                  </button>
                </div>
                {isCustomFreq && (
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      ส่งทุกๆ
                    </span>
                    <input
                      type="number"
                      name="frequency"
                      value={formData.frequency === 0 ? "" : formData.frequency}
                      onChange={handleFormChange}
                      className="w-20 px-3 py-2 text-center bg-white border border-gray-200 rounded-xl outline-none font-black text-blue-500 focus:border-blue-500 transition-all"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      วัน
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    จำนวนงวด
                  </label>
                  <input
                    name="installments"
                    type="number"
                    value={
                      formData.installments === 0 ? "" : formData.installments
                    }
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-gray-700 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    วันที่เริ่ม
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-gray-700 transition-all"
                  />
                </div>
              </div>

              {/* Preview สรุปตัวเลข */}
              <div className="bg-[#1F2335] p-6 rounded-[2rem] text-white shadow-xl grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    ยอดส่ง / งวด
                  </span>
                  <span className="font-black text-2xl text-blue-400">
                    ฿{installmentAmount.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    กำไร / งวด
                  </span>
                  <span className="font-black text-2xl text-green-400">
                    ฿{profitPerInstallment.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 border-t border-white/10 pt-4 mt-2 flex justify-between">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      รับจริงทั้งหมด
                    </span>
                    <span className="font-black text-lg">
                      ฿{actualTotalToCollect.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">
                      กำไรสุทธิ
                    </span>
                    <span className="font-black text-lg text-blue-500">
                      ฿{totalProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-white rounded-b-[2.5rem] flex justify-end gap-3">
              <button
                onClick={() => setEditContractModalOpen(false)}
                disabled={isSavingContract}
                className="px-8 py-3.5 rounded-2xl text-[10px] font-black text-gray-500 bg-gray-100 hover:bg-gray-200 uppercase tracking-widest"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateContract}
                disabled={isSavingContract}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingContract ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                อัปเดตและสร้างตารางใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 2. POP-UP MODAL: ตารางงวด (เอาไว้ดูเฉยๆ) */}
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
