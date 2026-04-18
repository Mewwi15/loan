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
  ChevronDown,
  User,
  HandCoins,
  Coins,
  Calculator,
  Users,
} from "lucide-react";
import Link from "next/link";

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

const getDisbursementDate = (startDate, frequency, type) => {
  if (!startDate) return "-";
  const date = new Date(startDate);
  if (type === "day") {
    date.setDate(date.getDate() - Number(frequency || 1));
  } else if (type === "month") {
    date.setMonth(date.getMonth() - Number(frequency || 1));
  }
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function CustomerDetailPage({ params }) {
  const unwrappedParams = React.use(params);
  const customerId = unwrappedParams.id;

  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🌟 State สำหรับสถิติลูกค้า
  const [customerStats, setCustomerStats] = useState({
    totalProfit: 0,
    yearlyProfit: 0,
    profit2025: 0,
    activeSharesCount: 0,
    netShareBalance: 0,
  });
  const [customerShares, setCustomerShares] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 🌟 State สำหรับฟอร์มแก้ไขกำไร 2568
  const [isEditingProfit2025, setIsEditingProfit2025] = useState(false);
  const [tempProfit2025, setTempProfit2025] = useState("");

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanSchedule, setLoanSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [editContractModalOpen, setEditContractModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [isCustomFreq, setIsCustomFreq] = useState(false);
  const [originalTotalAmount, setOriginalTotalAmount] = useState(0);

  const [earlyPayoffModalOpen, setEarlyPayoffModalOpen] = useState(false);
  const [payoffLoan, setPayoffLoan] = useState(null);
  const [payoffDate, setPayoffDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isProcessingPayoff, setIsProcessingPayoff] = useState(false);

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

        const formattedName =
          customerData.nickname && customerData.name
            ? `${customerData.nickname} (${customerData.name})`
            : customerData.nickname || customerData.name || "";

        const searchNames = [];
        if (customerData.name) searchNames.push(customerData.name);
        if (customerData.nickname) searchNames.push(customerData.nickname);
        if (formattedName && !searchNames.includes(formattedName))
          searchNames.push(formattedName);

        const qById = query(
          collection(db, "loans"),
          where("customerId", "==", customerId),
        );
        const qByName = query(
          collection(db, "loans"),
          where("customerName", "in", searchNames),
        );
        const [snapById, snapByName] = await Promise.all([
          getDocs(qById),
          getDocs(qByName),
        ]);

        const loanMap = new Map();
        snapById.docs.forEach((doc) =>
          loanMap.set(doc.id, { id: doc.id, ...doc.data() }),
        );
        snapByName.docs.forEach((doc) =>
          loanMap.set(doc.id, { id: doc.id, ...doc.data() }),
        );

        const loanList = Array.from(loanMap.values()).sort((a, b) => {
          const numA = Number(a.loanNumber);
          const numB = Number(b.loanNumber);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.loanNumber).localeCompare(String(b.loanNumber));
        });
        setLoans(loanList);

        const currentYear = new Date().getFullYear().toString();
        const transQ = query(
          collection(db, "transactions"),
          where("customerId", "==", customerId),
        );
        const transSnap = await getDocs(transQ);

        let tProfit = 0;
        let yProfit = 0;

        transSnap.forEach((doc) => {
          const data = doc.data();
          const profit = data.profitShare || 0;
          const penalty = data.penalty || 0;
          const totalEarned = profit + penalty;

          tProfit += totalEarned;
          if (data.paymentDate && data.paymentDate.startsWith(currentYear)) {
            yProfit += totalEarned;
          }
        });

        // 🌟 ดึงข้อมูลการเล่นแชร์และคำนวณ Net Balance ตามสูตรเป๊ะๆ
        const sharesQ = query(
          collection(db, "share_hands"),
          where("customerId", "==", customerId),
        );
        const sharesSnap = await getDocs(sharesQ).catch(() => ({ docs: [] }));

        const handsData = sharesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        // กรองเฉพาะมือที่กำลังเล่นอยู่
        const activeHands = handsData.filter(
          (h) => h.status !== "closed" && h.status !== "available",
        );

        let netBalance = 0;

        if (activeHands.length > 0) {
          // ดึงรายละเอียดวงแชร์ (เพื่อเอา Pool Amount)
          const uniqueShareIds = [
            ...new Set(activeHands.map((h) => h.shareId)),
          ];
          const sharesPromises = uniqueShareIds.map((id) =>
            getDoc(doc(db, "shares", id)),
          );
          const sharesSnaps = await Promise.all(sharesPromises);

          const sharesMap = {};
          sharesSnaps.forEach((s) => {
            if (s.exists()) sharesMap[s.id] = s.data();
          });

          let totalAliveSaved = 0;
          let totalDeadDebt = 0;

          activeHands.forEach((h) => {
            const shareData = sharesMap[h.shareId];
            if (!shareData || shareData.status !== "active") return; // ข้ามวงที่พักหรือจบแล้ว

            if (h.status === "alive") {
              totalAliveSaved += h.totalPaid || 0;
            } else if (h.status === "dead") {
              const debt = (shareData.poolAmount || 0) - (h.totalPaid || 0);
              totalDeadDebt += debt > 0 ? debt : 0;
            }
          });

          netBalance = totalAliveSaved - totalDeadDebt;
        }

        setCustomerShares(activeHands); // เก็บรายการมือแชร์สำหรับใช้ใน Modal
        setCustomerStats({
          totalProfit: tProfit,
          yearlyProfit: yProfit,
          profit2025: customerData.manualProfit2025 || 0,
          activeSharesCount: activeHands.length,
          netShareBalance: netBalance,
        });
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🌟 ฟังก์ชันบันทึกกำไรปี 2568
  const handleSaveProfit2025 = async () => {
    try {
      const val = Number(tempProfit2025) || 0;
      await updateDoc(doc(db, "customers", customerId), {
        manualProfit2025: val,
      });
      setCustomerStats((prev) => ({ ...prev, profit2025: val }));
      setIsEditingProfit2025(false);
    } catch (error) {
      console.error("Error saving profit 2025:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const principal = Number(formData.principal) || 0;
  const percent = Number(formData.interestPercent) || 0;
  const count = Math.max(Number(formData.installments) || 1, 1);
  const rawTotalAmount = principal + (principal * percent) / 100;
  const installmentAmount = Math.ceil(rawTotalAmount / count);
  const actualTotalToCollect = installmentAmount * count;
  const totalProfit = Math.max(actualTotalToCollect - principal, 0);
  const profitPerInstallment = Math.ceil(totalProfit / count);
  const selectedBankInfo = BANK_OPTIONS[formData.bankIndex] || BANK_OPTIONS[0];

  const groupedBanks = BANK_OPTIONS.reduce((acc, bank, index) => {
    if (!acc[bank.owner]) acc[bank.owner] = [];
    acc[bank.owner].push({ ...bank, index });
    return acc;
  }, {});

  const openEditContract = (loan) => {
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
    if (type === "number") finalValue = value === "" ? 0 : Number(value);
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const setFreq = (val, type = "day") => {
    setIsCustomFreq(false);
    setFormData((prev) => ({ ...prev, frequency: val, type: type }));
  };

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
      const oldSchedulesQ = query(
        collection(db, "schedules"),
        where("loanId", "==", formData.loanId),
      );
      const oldSchedulesSnap = await getDocs(oldSchedulesQ);
      oldSchedulesSnap.forEach((d) => batch.delete(d.ref));

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
        remainingBalance: actualTotalToCollect,
        totalInstallments: count,
        currentInstallment: 0,
        installmentAmount: installmentAmount,
        totalProfit: totalProfit,
        profitPerInstallment: profitPerInstallment,
        startDate: formData.startDate,
        frequency: formData.frequency,
        frequencyType: formData.type,
      });

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
      const diffDebt = actualTotalToCollect - originalTotalAmount;
      batch.update(doc(db, "customers", customerId), {
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
        "ยืนยันการปิดวงกู้นี้? \n(ระบบจะทำการลบตารางค่างวดที่ยังไม่จ่ายทิ้งทั้งหมด และย้ายวงกู้ไปประวัติที่ปิดแล้ว)",
      )
    )
      return;
    try {
      const batch = writeBatch(db);
      const pendingSchedulesQ = query(
        collection(db, "schedules"),
        where("loanId", "==", loanId),
        where("status", "==", "pending"),
      );
      const pendingSnap = await getDocs(pendingSchedulesQ);
      pendingSnap.forEach((d) => batch.delete(d.ref));
      batch.update(doc(db, "loans", loanId), {
        status: "closed",
        remainingBalance: 0,
      });
      batch.update(doc(db, "customers", customerId), {
        activeLoans: increment(-1),
        totalDebt: increment(-remainingBalance),
      });
      await batch.commit();
      alert("ปิดวงกู้เรียบร้อย!");
      fetchData();
    } catch (error) {
      console.error("Error closing loan:", error);
      alert("เกิดข้อผิดพลาดในการปิดวงกู้");
    }
  };

  const confirmEarlyPayoff = async () => {
    if (!payoffLoan) return;
    if (
      !window.confirm(
        `🚨 ยืนยันการโปะยอดปิดวง ในวันที่: ${payoffDate} ใช่หรือไม่?\n\nกำไรที่เหลือจะถูกโอนไปรวมในเป้าของวันที่ระบุทันที!`,
      )
    )
      return;
    setIsProcessingPayoff(true);
    try {
      const batch = writeBatch(db);
      const pendingQ = query(
        collection(db, "schedules"),
        where("loanId", "==", payoffLoan.id),
        where("status", "==", "pending"),
      );
      const pendingSnap = await getDocs(pendingQ);
      let totalPaidAmount = 0;
      let totalProfit = 0;
      pendingSnap.forEach((d) => {
        const data = d.data();
        totalPaidAmount += data.amount || 0;
        totalProfit += data.profitShare || 0;
        batch.update(d.ref, {
          status: "paid",
          dueDate: payoffDate,
          paidAt: serverTimestamp(),
        });
      });
      batch.update(doc(db, "loans", payoffLoan.id), {
        status: "closed",
        remainingBalance: 0,
        currentInstallment: payoffLoan.totalInstallments,
      });
      batch.update(doc(db, "customers", customerId), {
        activeLoans: increment(-1),
        totalDebt: increment(-totalPaidAmount),
      });
      if (totalPaidAmount > 0) {
        batch.set(doc(collection(db, "transactions")), {
          loanId: payoffLoan.id,
          customerId: customerId,
          customerName: payoffLoan.customerName,
          amountPaid: totalPaidAmount,
          profitShare: totalProfit,
          penalty: 0,
          installmentNo: "Early Payoff",
          paymentDate: payoffDate,
          createdAt: serverTimestamp(),
          note: "ปิดวงล่วงหน้า (โปะยอด)",
        });
      }
      await batch.commit();
      alert(
        `🎉 ปิดวงล่วงหน้าสำเร็จ!\nยอดที่รับ: ฿${totalPaidAmount.toLocaleString()}`,
      );
      setEarlyPayoffModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Early Payoff Error:", error);
      alert("เกิดข้อผิดพลาดในการโปะยอดปิดวง");
    } finally {
      setIsProcessingPayoff(false);
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
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />{" "}
        กำลังโหลดข้อมูลลูกค้า...
      </div>
    );

  if (!customer)
    return <div className="p-20 text-center font-black">ไม่พบข้อมูลลูกค้า</div>;

  const activeLoans = loans.filter((l) => l.status !== "closed");

  return (
    <div className="w-full pb-20 px-4 sm:px-10 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10 pt-10">
        <div className="flex items-start gap-6">
          <Link
            href="/customers"
            className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-orange-50 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              {customer.nickname
                ? `${customer.nickname} (${customer.name})`
                : customer.name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-xs text-orange-500 font-black uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> {customer.phone}
              </p>
              <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                ID: {customerId.slice(0, 5)}
              </span>
            </div>
            <div className="mt-4">
              <Link
                href={`/customers/${customerId}/share`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-sm"
              >
                <HandCoins className="w-4 h-4" /> ดูประวัติการเล่นแชร์
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 การ์ดสถิติ 5 ใบ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" /> กำไรสะสม (ทั้งหมด)
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{customerStats.totalProfit.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-orange-500" /> กำไรสะสม (ปีนี้)
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{customerStats.yearlyProfit.toLocaleString()}
          </p>
        </div>

        {/* การ์ดกำไร 2568 แบบแก้ไขได้ */}
        <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100 shadow-sm flex flex-col justify-center relative">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-500" /> กำไร (ปี 2568)
            </p>
            {!isEditingProfit2025 && (
              <button
                onClick={() => {
                  setIsEditingProfit2025(true);
                  setTempProfit2025(customerStats.profit2025);
                }}
                className="text-purple-300 hover:text-purple-600 transition-colors bg-white p-1 rounded-md"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>

          {isEditingProfit2025 ? (
            <div className="flex items-center gap-2 mt-1 z-10 relative">
              <input
                type="number"
                value={tempProfit2025}
                onChange={(e) => setTempProfit2025(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-sm font-black text-gray-800 outline-none focus:border-purple-500 shadow-inner"
                placeholder="ระบุยอด..."
              />
              <button
                onClick={handleSaveProfit2025}
                className="bg-purple-500 text-white p-2 rounded-xl hover:bg-purple-600 shadow-sm"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-2xl font-black text-purple-800">
              ฿{customerStats.profit2025.toLocaleString()}
            </p>
          )}
        </div>

        {/* การ์ดวงแชร์ที่เล่น */}
        <div
          onClick={() => setIsShareModalOpen(true)}
          className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col justify-center cursor-pointer hover:bg-orange-100 transition-colors group relative"
        >
          <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> วงแชร์ที่กำลังเล่น
          </p>
          <p className="text-2xl font-black text-orange-600 flex items-end gap-2">
            {customerStats.activeSharesCount}{" "}
            <span className="text-sm pb-1">วง</span>
          </p>
          <div className="absolute top-4 right-4 bg-white/50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4 text-orange-500" />
          </div>
        </div>

        {/* 🌟 การ์ดสถานะสุทธิแชร์ (Net Balance) เปลี่ยนสีได้ */}
        <div
          className={`p-6 rounded-[2rem] border shadow-sm flex flex-col justify-center relative overflow-hidden ${
            customerStats.netShareBalance > 0
              ? "bg-green-50 border-green-200"
              : customerStats.netShareBalance < 0
                ? "bg-red-50 border-red-200"
                : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <p
              className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                customerStats.netShareBalance > 0
                  ? "text-green-700"
                  : customerStats.netShareBalance < 0
                    ? "text-red-700"
                    : "text-gray-500"
              }`}
            >
              <Calculator className="w-3 h-3" /> สถานะสุทธิแชร์
            </p>
            {customerStats.netShareBalance !== 0 && (
              <span
                className={`text-[9px] font-bold px-2 py-1 rounded-md ${
                  customerStats.netShareBalance > 0
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {customerStats.netShareBalance > 0
                  ? "เราติดเงิน"
                  : "หนี้ลูกค้า"}
              </span>
            )}
          </div>
          <p
            className={`text-2xl font-black ${
              customerStats.netShareBalance > 0
                ? "text-green-700"
                : customerStats.netShareBalance < 0
                  ? "text-red-700"
                  : "text-gray-800"
            }`}
          >
            {customerStats.netShareBalance > 0 ? "+" : ""} ฿
            {customerStats.netShareBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-3 mt-4">
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
                  className={`absolute top-0 left-0 w-full h-1.5 ${loan.remainingBalance === 0 ? "bg-green-500" : "bg-orange-500"}`}
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
                <div className="mx-6 md:mx-8 mb-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      วันที่ปล่อยยอด
                    </p>
                    <p className="text-sm font-bold text-gray-700">
                      {getDisbursementDate(
                        loan.startDate,
                        loan.frequency,
                        loan.frequencyType,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      ยอดปล่อย (เงินต้น)
                    </p>
                    <p className="text-sm font-black text-gray-800">
                      ฿{(loan.principal || 0).toLocaleString()}
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
                      title="ปิดวงแบบไม่คิดกำไร"
                    >
                      <PowerOff className="w-3 h-3" />{" "}
                      <span className="hidden lg:inline">ลบวงกู้</span>
                    </button>
                    <button
                      onClick={() => openEditContract(loan)}
                      className="text-[12px] md:text-[14px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 md:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />{" "}
                      <span className="hidden lg:inline">แก้ไขสัญญา</span>
                    </button>
                    <button
                      onClick={() => {
                        setPayoffLoan(loan);
                        setPayoffDate(new Date().toISOString().split("T")[0]);
                        setEarlyPayoffModalOpen(true);
                      }}
                      className="text-[12px] md:text-[14px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 md:px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                      title="โปะยอดที่เหลือ (เลือกวันรับเงินได้)"
                    >
                      <Coins className="w-3 h-3" />{" "}
                      <span className="hidden lg:inline">โปะปิดวง</span>
                    </button>
                  </div>
                  <button
                    onClick={() => openSchedule(loan)}
                    className="bg-gray-900 hover:bg-black text-white px-5 md:px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> ตาราง{" "}
                    <span className="hidden md:inline">ค่างวด</span>
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

      {/* 🌟🌟 MODAL: รายชื่อวงแชร์ 🌟🌟 */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsShareModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="font-black text-gray-800 text-xl flex items-center gap-2">
                  <HandCoins className="w-6 h-6 text-orange-500" />{" "}
                  วงแชร์ที่กำลังเล่น
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">
                  {customer.nickname} เล่นอยู่ {customerStats.activeSharesCount}{" "}
                  วง
                </p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh] bg-gray-50">
              {customerShares.length > 0 ? (
                <div className="space-y-3">
                  {customerShares.map((share) => (
                    <Link
                      key={share.id}
                      href={`/shares/${share.shareId || share.id}`}
                      className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex justify-between items-center hover:border-orange-200 transition-colors group"
                    >
                      <div>
                        <h4 className="font-black text-gray-800">
                          {share.shareName || "วงแชร์ไม่ระบุชื่อ"}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          มือที่: {share.handNumber || "-"}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-black text-sm uppercase tracking-widest">
                    ไม่ได้ลงเล่นแชร์ในระบบ
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-white">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal โปะปิดวง, แก้ไขสัญญา, เลือกธนาคาร, ดูตารางงวด */}
      {earlyPayoffModalOpen && payoffLoan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() =>
              !isProcessingPayoff && setEarlyPayoffModalOpen(false)
            }
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-emerald-800 text-lg flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-600" />{" "}
                  โปะปิดวงล่วงหน้า
                </h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1 tracking-widest">
                  วงที่ {payoffLoan.loanNumber || "-"} • ยอดคงเหลือ ฿
                  {payoffLoan.remainingBalance.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                disabled={isProcessingPayoff}
                className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">
                  ระบุวันที่รับเงิน (เพื่อบันทึกกำไรย้อนหลัง)
                </label>
                <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                  <Calendar className="w-5 h-5 text-emerald-500 mr-2" />
                  <input
                    type="date"
                    value={payoffDate}
                    onChange={(e) => setPayoffDate(e.target.value)}
                    className="w-full outline-none bg-transparent font-black text-gray-700 uppercase tracking-widest"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-bold">
                  *ระบบจะนำค่างวดที่เหลือทั้งหมดไปเช็คบิลในวันที่คุณเลือก
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                disabled={isProcessingPayoff}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-gray-500 bg-white border border-gray-200 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmEarlyPayoff}
                disabled={isProcessingPayoff || !payoffDate}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-md flex items-center justify-center gap-2"
              >
                {isProcessingPayoff ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}{" "}
                ยืนยันการรับยอด
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400 block mb-1">
                  บัญชีธนาคารที่ใช้ปล่อยกู้
                </label>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-white border border-transparent rounded-2xl transition-all group text-left shadow-sm hover:shadow-md"
                  style={{ borderColor: `${selectedBankInfo.color}40` }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: `${selectedBankInfo.color}15`,
                        border: `1px solid ${selectedBankInfo.color}30`,
                      }}
                    >
                      <Landmark
                        className="w-6 h-6"
                        style={{ color: selectedBankInfo.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-800">
                        {selectedBankInfo.owner}
                      </p>
                      <p
                        className="text-[11px] font-black uppercase tracking-widest mt-0.5"
                        style={{ color: selectedBankInfo.color }}
                      >
                        ธนาคาร: {selectedBankInfo.bank}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
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
                      className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${!isCustomFreq && formData.frequency === f.val && formData.type === f.type ? "bg-blue-500 border-blue-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"}`}
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
                    className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${isCustomFreq ? "bg-blue-500 border-blue-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"}`}
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
                )}{" "}
                อัปเดตและสร้างตารางใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
            onClick={() => setIsBankModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 md:px-8 py-6 border-b border-gray-50 bg-gray-50/80">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800">
                  เลือกบัญชีโอนออก
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  แหล่งที่มาของเงินต้นสำหรับการปล่อยกู้
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="p-3 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 md:p-8 space-y-10 flex-1">
              {Object.entries(groupedBanks).map(([owner, banks]) => (
                <div key={owner}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <h4 className="text-sm font-black text-gray-700 tracking-wide">
                      {owner}
                    </h4>
                    <div className="flex-1 h-px bg-gray-100 ml-4"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {banks.map((b) => {
                      const isSelected = formData.bankIndex === b.index;
                      return (
                        <button
                          key={b.index}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              bankIndex: b.index,
                            }));
                            setIsBankModalOpen(false);
                          }}
                          className={`relative p-4 md:p-5 rounded-3xl border flex flex-col items-start text-left transition-all duration-300 group ${isSelected ? "shadow-md scale-[1.02]" : "bg-white hover:shadow-lg hover:-translate-y-1"}`}
                          style={
                            isSelected
                              ? {
                                  borderColor: b.color,
                                  backgroundColor: `${b.color}15`,
                                }
                              : { borderColor: "#f3f4f6" }
                          }
                        >
                          <div className="flex justify-between w-full items-center mb-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: isSelected
                                  ? `${b.color}20`
                                  : "#f9fafb",
                              }}
                            >
                              <Landmark
                                className="w-5 h-5 transition-colors"
                                style={{
                                  color:
                                    isSelected || "group-hover"
                                      ? b.color
                                      : "#d1d5db",
                                }}
                              />
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-sm">
                                <CheckCircle2
                                  className="w-4 h-4"
                                  style={{ color: b.color }}
                                />
                              </div>
                            )}
                          </div>
                          <span
                            className="font-black text-base md:text-lg transition-colors mt-1"
                            style={{ color: isSelected ? b.color : "#374151" }}
                          >
                            {b.bank}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
