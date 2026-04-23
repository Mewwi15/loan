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
  Target,
  Archive,
  Award,
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
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [customerStats, setCustomerStats] = useState({
    expectedProfit: 0,
    profit2025: 0,
    activeSharesCount: 0,
    netShareBalance: 0,
  });
  const [customerShares, setCustomerShares] = useState([]);

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

  const [earlyPayoffModalOpen, setEarlyPayoffModalOpen] = useState(false);
  const [payoffLoan, setPayoffLoan] = useState(null);
  const [payoffDate, setPayoffDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isProcessingPayoff, setIsProcessingPayoff] = useState(false);

  const [isClosedLoansModalOpen, setIsClosedLoansModalOpen] = useState(false);

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
        const snapById = await getDocs(qById);

        let snapByName = { docs: [] };
        if (searchNames.length > 0) {
          const qByName = query(
            collection(db, "loans"),
            where("customerName", "in", searchNames.slice(0, 10)),
          );
          snapByName = await getDocs(qByName);
        }

        const loanMap = new Map();
        const processLoan = (docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          const key = String(data.loanNumber || data.id).trim();

          if (loanMap.has(key)) {
            const existing = loanMap.get(key);
            if (existing.status === "closed" && data.status === "active") {
              loanMap.set(key, data);
            } else if (existing.status === data.status) {
              if (
                !existing.customerName?.includes("(") &&
                data.customerName?.includes("(")
              ) {
                loanMap.set(key, data);
              }
            }
          } else {
            loanMap.set(key, data);
          }
        };

        snapById.docs.forEach(processLoan);
        snapByName.docs.forEach(processLoan);

        const loanList = Array.from(loanMap.values()).sort((a, b) => {
          const numA = Number(a.loanNumber);
          const numB = Number(b.loanNumber);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.loanNumber).localeCompare(String(b.loanNumber));
        });

        setLoans(loanList);

        let totalExpectedProfit = 0;
        loanList
          .filter((l) => l.status !== "closed")
          .forEach((loan) => {
            totalExpectedProfit += loan.totalProfit || 0;
          });

        const sharesQ = query(
          collection(db, "share_hands"),
          where("customerId", "==", customerId),
        );
        const sharesSnap = await getDocs(sharesQ).catch(() => ({ docs: [] }));

        const handsData = sharesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const activeHands = handsData.filter(
          (h) => h.status !== "closed" && h.status !== "available",
        );

        let netBalance = 0;
        const enrichedHands = [];

        if (activeHands.length > 0) {
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
            if (!shareData || shareData.status !== "active") return;

            enrichedHands.push({ ...h, shareDetails: shareData });

            if (h.status === "alive") {
              totalAliveSaved += h.totalPaid || 0;
            } else if (h.status === "dead") {
              const debt = (shareData.poolAmount || 0) - (h.totalPaid || 0);
              totalDeadDebt += debt > 0 ? debt : 0;
            }
          });

          enrichedHands.sort((a, b) => {
            if (a.shareName !== b.shareName)
              return a.shareName.localeCompare(b.shareName);
            return a.handNumber - b.handNumber;
          });

          netBalance = totalAliveSaved - totalDeadDebt;
        }

        setCustomerShares(enrichedHands);
        setCustomerStats({
          expectedProfit: totalExpectedProfit,
          profit2025: customerData.manualProfit2025 || 0,
          activeSharesCount: enrichedHands.length,
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

  const syncCustomerData = async () => {
    try {
      const q = query(
        collection(db, "loans"),
        where("customerId", "==", customerId),
        where("status", "==", "active"),
      );
      const snap = await getDocs(q);
      let count = 0;
      let debt = 0;
      snap.forEach((d) => {
        count++;
        debt += d.data().remainingBalance || 0;
      });
      await updateDoc(doc(db, "customers", customerId), {
        activeLoans: count,
        totalDebt: debt,
      });
    } catch (error) {
      console.error("Error syncing customer data:", error);
    }
  };

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

  // 🌟 ฟังก์ชันฮีโร่ใหม่! อัปเดตสัญญาแบบ "จำงวดที่เคยจ่ายแล้ว"
  const handleUpdateContract = async () => {
    setIsSavingContract(true);
    const batch = writeBatch(db);
    try {
      const loanRef = doc(db, "loans", formData.loanId);

      // 1. กวาดข้อมูลตารางค่างวด "เดิม" มาดูก่อนว่างวดไหนจ่ายแล้วบ้าง
      const oldSchedulesQ = query(
        collection(db, "schedules"),
        where("loanId", "==", formData.loanId),
      );
      const oldSchedulesSnap = await getDocs(oldSchedulesQ);

      const paidHistory = {};
      oldSchedulesSnap.forEach((d) => {
        const data = d.data();
        if (data.status === "paid") {
          paidHistory[data.installmentNo] = data; // 🌟 จำประวัติเอาไว้
        }
        batch.delete(d.ref); // ลบของเก่าทิ้งเพื่อเตรียมจัดตารางใหม่
      });

      let newRemainingBalance = actualTotalToCollect;
      let newCurrentInstallment = 0;

      // 2. วนลูปสร้างตารางค่างวด "ใหม่" พร้อมคืนค่าสถานะให้
      for (let i = 0; i < count; i++) {
        let dueDate = new Date(formData.startDate);
        if (formData.type === "day") {
          dueDate.setDate(
            dueDate.getDate() + i * Number(formData.frequency || 1),
          );
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        const installmentNo = i + 1;
        const oldPaidData = paidHistory[installmentNo];
        const isPaid = !!oldPaidData; // เช็คว่าเคยจ่ายไปแล้วใช่ไหม?

        // ถ้างวดนี้เคยจ่ายแล้ว ให้หักยอดเงินคงเหลือลงอัตโนมัติ
        if (isPaid) {
          newRemainingBalance -= installmentAmount;
          newCurrentInstallment++;
        }

        const scheduleRef = doc(collection(db, "schedules"));
        batch.set(scheduleRef, {
          loanId: formData.loanId,
          customerId: customerId,
          customerName: customer.nickname || customer.name,
          loanName: formData.loanName,
          loanNumber: formData.loanNumber,
          installmentNo: installmentNo,
          dueDate: dueDate.toISOString().split("T")[0],
          amount: installmentAmount,
          profitShare: profitPerInstallment,
          status: isPaid ? "paid" : "pending", // 🌟 ถ้างวดเดิมเคยจ่าย ให้เซ็ตเป็น paid คืนทันที
          paidAt: oldPaidData ? oldPaidData.paidAt : null,
          paymentDate: oldPaidData ? oldPaidData.paymentDate || null : null,
        });
      }

      // 3. อัปเดตข้อมูลวงกู้หลัก (หักลบยอดตามที่จ่ายแล้วให้เป๊ะ)
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
        remainingBalance: Math.max(0, newRemainingBalance), // 🌟 ยอดหนี้อัปเดตใหม่
        totalInstallments: count,
        currentInstallment: newCurrentInstallment, // 🌟 จำนวนงวดที่จ่ายแล้ว
        installmentAmount: installmentAmount,
        totalProfit: totalProfit,
        profitPerInstallment: profitPerInstallment,
        startDate: formData.startDate,
        frequency: formData.frequency,
        frequencyType: formData.type,
      });

      await batch.commit();
      await syncCustomerData(); // ซิงค์ยอดสรุปลูกค้าใหม่ให้ตรงกับความจริง

      alert(
        "✅ อัปเดตสัญญาสำเร็จ! (ระบบทำการติ๊กงวดที่เคยจ่ายไว้ให้เหมือนเดิมเรียบร้อยแล้ว)",
      );
      setEditContractModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating contract:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขสัญญา");
    } finally {
      setIsSavingContract(false);
    }
  };

  const handleCloseLoan = async (loanId) => {
    if (
      !window.confirm(
        "ยืนยันการลบวงกู้นี้? \n(ระบบจะทำการลบตารางค่างวดที่ยังไม่จ่ายทิ้งทั้งหมด และย้ายวงกู้ไปประวัติที่ปิดแล้ว)",
      )
    )
      return;
    setIsProcessingAction(true);
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
        closedAt: new Date().toISOString(),
      });
      await batch.commit();

      await syncCustomerData();
      alert("ลบวงกู้เรียบร้อย!");
      fetchData();
    } catch (error) {
      console.error("Error closing loan:", error);
      alert("เกิดข้อผิดพลาดในการลบวงกู้");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const confirmEarlyPayoff = async () => {
    if (!payoffLoan) return;
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
        closedAt: new Date().toISOString(),
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

      await syncCustomerData();

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

  const CUTOFF_DATE = "2026-04-23";
  const closedLoans = loans.filter((l) => {
    if (l.status !== "closed") return false;
    if (!l.closedAt) return false;
    return l.closedAt >= CUTOFF_DATE;
  });

  const closedLoansProfit = closedLoans.reduce(
    (sum, loan) => sum + (loan.totalProfit || 0),
    0,
  );
  const grandTotalAccumulatedProfit =
    customerStats.profit2025 + closedLoansProfit;

  return (
    <div className="w-full pb-20 px-3 sm:px-10 font-sans animate-in fade-in duration-500">
      {/* 👤 ส่วนหัว: ข้อมูลลูกค้า */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6 mb-6 pt-6 sm:pt-10">
        <div className="flex items-start gap-4 sm:gap-6 w-full">
          <Link
            href="/customers"
            className="p-2.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm hover:bg-orange-50 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
              {customer.nickname
                ? `${customer.nickname} (${customer.name})`
                : customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 sm:mt-2">
              <p className="text-[10px] sm:text-xs text-orange-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4" /> {customer.phone}
              </p>
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                ID: {customerId.slice(0, 5)}
              </span>
            </div>
            <div className="mt-3 sm:mt-4">
              <Link
                href={`/customers/${customerId}/share`}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-colors shadow-sm"
              >
                <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> ประวัติแชร์
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🏆 โซนที่ 1: ภาพรวมประวัติกำไร (Top Section) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-[#1F2335] p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-xl flex flex-col justify-center relative overflow-hidden text-white transition-transform hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 rounded-full blur-xl -mr-6 -mt-6"></div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-green-400 tracking-widest mb-1 flex items-center gap-1">
            <Award className="w-3 h-3" /> กำไรสะสมเบ็ดเสร็จ
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white">
            ฿{grandTotalAccumulatedProfit.toLocaleString()}
          </p>
          <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 sm:mt-2 bg-white/10 px-2 py-0.5 rounded-md inline-block w-max">
            (ยอดปี 68 + วงที่ปิดแล้ว)
          </span>
        </div>

        <div className="bg-purple-50 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-purple-100 shadow-sm flex flex-col justify-center relative transition-transform hover:-translate-y-1">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-purple-600 tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-500" /> กำไร (ปี 2568)
            </p>
            {!isEditingProfit2025 && (
              <button
                onClick={() => {
                  setIsEditingProfit2025(true);
                  setTempProfit2025(customerStats.profit2025);
                }}
                className="text-purple-300 hover:text-purple-600 transition-colors bg-white p-1.5 rounded-lg shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          {isEditingProfit2025 ? (
            <div className="flex items-center gap-2 mt-1 z-10 relative">
              <input
                type="number"
                value={tempProfit2025}
                onChange={(e) => setTempProfit2025(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-black text-gray-800 outline-none focus:border-purple-500 shadow-inner"
                placeholder="ระบุยอด..."
              />
              <button
                onClick={handleSaveProfit2025}
                className="bg-purple-500 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-purple-600 shadow-sm"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-black text-purple-800">
              ฿{customerStats.profit2025.toLocaleString()}
            </p>
          )}
        </div>

        <div
          onClick={() => setIsClosedLoansModalOpen(true)}
          className="bg-white hover:bg-green-50 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-gray-100 hover:border-green-200 shadow-sm flex flex-col justify-center relative cursor-pointer group transition-all hover:-translate-y-1"
        >
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 group-hover:text-green-500 tracking-widest mb-1 flex items-center gap-1 transition-colors">
            <Archive className="w-3 h-3" /> วงกู้ที่ปิดแล้ว (
            {closedLoans.length} วง)
          </p>
          <p className="text-xl sm:text-2xl font-black text-gray-800 group-hover:text-green-600 transition-colors">
            ฿{closedLoansProfit.toLocaleString()}
          </p>
          <div className="absolute top-4 right-4 bg-gray-50 group-hover:bg-green-100 p-1.5 rounded-full transition-colors">
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 group-hover:text-green-500" />
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100 mb-8 sm:mb-12"></div>

      {/* ======================================================== */}
      {/* 💼 โซนที่ 2: รายการวงกู้ที่กำลังดำเนินการ (Middle Section) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-3 bg-orange-50 rounded-xl sm:rounded-2xl">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-800">
              วงกู้ที่กำลังดำเนินการ
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              กำลังเดินอยู่ {activeLoans.length} วง
            </p>
          </div>
        </div>

        <div className="bg-blue-50 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-blue-100 shadow-sm w-full md:w-auto">
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-blue-500 tracking-widest mb-0.5 flex items-center gap-1">
            <Target className="w-3 h-3 text-blue-500" /> กำไรคาดหวัง (วงเดิน)
          </p>
          <p className="text-lg sm:text-xl font-black text-blue-600">
            ฿{customerStats.expectedProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {activeLoans.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-10 sm:mb-12">
          {activeLoans.map((loan, index) => {
            return (
              <div
                key={loan.id}
                className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md sm:hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 ${loan.remainingBalance === 0 ? "bg-green-500" : "bg-orange-500"}`}
                ></div>

                <div className="p-4 sm:p-6 border-b border-gray-50 flex justify-between items-start gap-2 mt-1 sm:mt-0">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-sm"
                      style={{
                        backgroundColor: `${loan.bankColor || "#cbd5e1"}15`,
                        color: loan.bankColor || "#9ca3af",
                      }}
                    >
                      {loan.loanNumber || index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight flex items-center gap-1 sm:gap-2">
                        วง {loan.loanNumber || index + 1}
                      </h3>
                      <p className="text-[10px] sm:text-[12px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                        {loan.loanName || loan.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5 sm:mb-1">
                      ยอดส่ง/งวด
                    </p>
                    <p className="text-lg sm:text-2xl font-black text-orange-500 leading-none">
                      ฿{loan.installmentAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 sm:p-6 bg-gray-50/30 grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> รูปแบบ
                    </p>
                    <p className="text-sm sm:text-base font-black text-gray-700">
                      {loan.totalInstallments} งวด •{" "}
                      {loan.frequencyType === "day"
                        ? `ราย ${loan.frequency} วัน`
                        : "รายเดือน"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> ยอดคงเหลือ
                    </p>
                    <p className="text-sm sm:text-base font-black text-gray-700">
                      ฿{loan.remainingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mx-4 sm:mx-6 mb-4 p-3 sm:p-4 bg-blue-50/50 rounded-xl sm:rounded-2xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      วันที่ปล่อย
                    </p>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-700">
                      {getDisbursementDate(
                        loan.startDate,
                        loan.frequency,
                        loan.frequencyType,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                      ปล่อยกู้ (เงินต้น)
                    </p>
                    <p className="text-xs sm:text-sm font-black text-gray-800">
                      ฿{(loan.principal || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-5 bg-white border-t border-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleCloseLoan(loan.id)}
                      disabled={isProcessingAction}
                      className="text-[9px] sm:text-[12px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
                      title="ลบวงกู้"
                    >
                      <PowerOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden min-[400px]:inline">ลบ</span>
                    </button>
                    <button
                      onClick={() => openEditContract(loan)}
                      className="text-[9px] sm:text-[12px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden min-[400px]:inline">แก้</span>
                    </button>
                    <button
                      onClick={() => {
                        setPayoffLoan(loan);
                        setPayoffDate(new Date().toISOString().split("T")[0]);
                        setEarlyPayoffModalOpen(true);
                      }}
                      className="text-[9px] sm:text-[12px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors flex items-center gap-1"
                      title="โปะยอดที่เหลือ"
                    >
                      <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden min-[400px]:inline">โปะ</span>
                    </button>
                  </div>
                  <button
                    onClick={() => openSchedule(loan)}
                    className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1 sm:gap-1.5"
                  >
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> ตาราง
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 sm:py-16 text-center text-gray-400 bg-gray-50/50 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-gray-100 mb-10">
          <p className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">
            ไม่มีวงกู้ที่กำลังดำเนินการ
          </p>
        </div>
      )}

      <div className="w-full h-px bg-gray-100 mb-8 sm:mb-12"></div>

      {/* ======================================================== */}
      {/* 🤝 โซนที่ 3: รายการวงแชร์ที่กำลังดำเนินการ (Bottom Section) */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-3 bg-orange-50 rounded-xl sm:rounded-2xl">
            <HandCoins className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-800">
              วงแชร์ที่กำลังดำเนินการ
            </h2>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
              กำลังเล่นอยู่ {customerShares.length} มือ
            </p>
          </div>
        </div>

        <div
          className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border shadow-sm w-full md:w-auto ${
            customerStats.netShareBalance > 0
              ? "bg-green-50 border-green-200"
              : customerStats.netShareBalance < 0
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-100"
          }`}
        >
          <div className="flex justify-between items-center gap-4 sm:gap-6">
            <p
              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                customerStats.netShareBalance > 0
                  ? "text-green-700"
                  : customerStats.netShareBalance < 0
                    ? "text-red-700"
                    : "text-gray-400"
              }`}
            >
              <Calculator className="w-3 h-3" /> สถานะสุทธิแชร์
              {customerStats.netShareBalance !== 0 && (
                <span
                  className={`ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
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
            </p>
            <p
              className={`text-lg sm:text-xl font-black ${
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
      </div>

      {customerShares.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {customerShares.map((hand) => {
            const shareData = hand.shareDetails;
            const isAlive = hand.status === "alive";
            const displayAmount = isAlive
              ? hand.totalPaid
              : shareData.poolAmount - hand.totalPaid;

            return (
              <div
                key={hand.id}
                className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 sm:h-1.5 ${isAlive ? "bg-blue-500" : "bg-red-500"}`}
                ></div>

                <div className="p-4 sm:p-6 border-b border-gray-50 flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-sm bg-orange-50 text-orange-500 border border-orange-100">
                      {hand.handNumber}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                        มือที่ {hand.handNumber}
                      </h3>
                      <p className="text-[10px] sm:text-[12px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                        {hand.shareName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5 sm:mb-1">
                      ยอดส่ง/งวด
                    </p>
                    <p className="text-lg sm:text-2xl font-black text-orange-500">
                      ฿{(shareData.installmentAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-gray-50/30 grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> รูปแบบแชร์
                    </p>
                    <p className="text-sm sm:text-base font-black text-gray-700">
                      {shareData.totalHands} มือ •{" "}
                      {shareData.frequencyType === "day"
                        ? `ราย ${shareData.frequency} วัน`
                        : "รายเดือน"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> สถานะมือ
                    </p>
                    <p
                      className={`text-sm sm:text-base font-black ${isAlive ? "text-blue-600" : "text-red-600"}`}
                    >
                      {isAlive ? "มือเป็น (รอรับ)" : "มือตาย (เปียแล้ว)"}
                    </p>
                  </div>
                </div>

                <div
                  className={`mx-4 sm:mx-6 mb-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border flex justify-between items-center ${isAlive ? "bg-blue-50/50 border-blue-100" : "bg-red-50/50 border-red-100"}`}
                >
                  <div>
                    <p
                      className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 ${isAlive ? "text-blue-500" : "text-red-500"}`}
                    >
                      {isAlive ? "ยอดออมสะสม" : "ยอดหนี้คงเหลือ"}
                    </p>
                    <p className="text-[10px] sm:text-sm font-bold text-gray-700">
                      ฿{(displayAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 ${isAlive ? "text-blue-500" : "text-red-500"}`}
                    >
                      กองกลาง (บิตแรก)
                    </p>
                    <p className="text-xs sm:text-sm font-black text-gray-800">
                      ฿{(shareData.poolAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-5 bg-white border-t border-gray-50 flex justify-end">
                  <Link
                    href={`/shares/${hand.shareId}`}
                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
                  >
                    <HandCoins className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                    ไปที่หน้าแชร์{" "}
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400 bg-gray-50/50 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-gray-100">
          <p className="font-black text-xs sm:text-sm uppercase tracking-[0.2em]">
            ไม่ได้ลงเล่นแชร์ในระบบ
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🌟🌟 MODALS ทั้งหมด 🌟🌟 */}
      {/* ======================================================== */}

      {/* Modal: ประวัติวงกู้ที่ปิดแล้ว */}
      {isClosedLoansModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsClosedLoansModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="font-black text-gray-800 text-base sm:text-xl flex items-center gap-1.5 sm:gap-2">
                  <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />{" "}
                  ประวัติที่ปิดยอดแล้ว
                </h3>
                <p className="text-[8px] sm:text-[10px] font-bold text-green-600 uppercase mt-1 tracking-widest bg-green-100 px-1.5 sm:px-2 py-0.5 rounded-md inline-block">
                  กำไรที่เก็บได้: ฿{closedLoansProfit.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsClosedLoansModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] bg-gray-50 p-4 sm:p-8">
              {closedLoans.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {closedLoans.map((loan) => (
                    <div
                      key={loan.id}
                      className="bg-white border border-gray-200 p-4 sm:p-5 rounded-xl sm:rounded-[1.5rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-green-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-black text-lg sm:text-xl shrink-0">
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 text-sm sm:text-lg">
                            วง {loan.loanNumber || "-"}
                          </h4>
                          <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {loan.loanName || loan.customerName}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex justify-between sm:justify-end gap-4 sm:gap-6 sm:text-right border border-gray-100">
                        <div>
                          <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 sm:mb-1">
                            จัดเก็บ
                          </p>
                          <p className="font-black text-xs sm:text-base text-gray-700">
                            ฿{(loan.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] sm:text-[10px] font-black text-green-500 uppercase tracking-widest mb-0.5 sm:mb-1">
                            กำไร
                          </p>
                          <p className="font-black text-xs sm:text-base text-green-600">
                            ฿{(loan.totalProfit || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-16 text-gray-400">
                  <Archive className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
                  <p className="font-black text-xs sm:text-sm uppercase tracking-widest">
                    ยังไม่มีประวัติการปิดวง
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 bg-white">
              <button
                onClick={() => setIsClosedLoansModalOpen(false)}
                className="w-full py-3 sm:py-4 bg-gray-900 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-black transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal โปะปิดวง */}
      {earlyPayoffModalOpen && payoffLoan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() =>
              !isProcessingPayoff && setEarlyPayoffModalOpen(false)
            }
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 sm:p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-emerald-800 text-base sm:text-lg flex items-center gap-1.5 sm:gap-2">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />{" "}
                  โปะปิดวงล่วงหน้า
                </h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase mt-1 tracking-widest">
                  วงที่ {payoffLoan.loanNumber || "-"} • คงเหลือ ฿
                  {payoffLoan.remainingBalance.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                disabled={isProcessingPayoff}
                className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl sm:rounded-2xl border border-gray-100">
                <label className="text-[9px] sm:text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">
                  ระบุวันที่รับเงิน (เพื่อบันทึกกำไร)
                </label>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg sm:rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mr-2" />
                  <input
                    type="date"
                    value={payoffDate}
                    onChange={(e) => setPayoffDate(e.target.value)}
                    className="w-full outline-none bg-transparent font-black text-sm sm:text-base text-gray-700 uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2 sm:gap-3">
              <button
                onClick={() => setEarlyPayoffModalOpen(false)}
                disabled={isProcessingPayoff}
                className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-gray-500 bg-white border border-gray-200 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmEarlyPayoff}
                disabled={isProcessingPayoff || !payoffDate}
                className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-md flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {isProcessingPayoff ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}{" "}
                ยืนยันรับยอด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แก้ไขสัญญา */}
      {editContractModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => !isSavingContract && setEditContractModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-800 flex items-center gap-2 sm:gap-3">
                  <Edit className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />{" "}
                  แก้ไขข้อมูลสัญญา
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  ปรับปรุงเงื่อนไข และสร้างตารางค่างวดใหม่
                </p>
              </div>
              <button
                onClick={() => setEditContractModalOpen(false)}
                disabled={isSavingContract}
                className="p-2 sm:p-2.5 bg-white border border-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg sm:rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-8 flex-1 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ชื่อวงกู้
                  </label>
                  <input
                    name="loanName"
                    type="text"
                    value={formData.loanName}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold transition-all text-sm sm:text-base text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ลำดับวงกู้
                  </label>
                  <input
                    name="loanNumber"
                    type="text"
                    value={formData.loanNumber}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black transition-all text-sm sm:text-base text-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400 block mb-1">
                  บัญชีธนาคารที่ใช้ปล่อยกู้
                </label>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 hover:bg-white border border-transparent rounded-xl sm:rounded-2xl transition-all group text-left shadow-sm hover:shadow-md"
                  style={{ borderColor: `${selectedBankInfo.color}40` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: `${selectedBankInfo.color}15`,
                        border: `1px solid ${selectedBankInfo.color}30`,
                      }}
                    >
                      <Landmark
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        style={{ color: selectedBankInfo.color }}
                      />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-gray-800">
                        {selectedBankInfo.owner}
                      </p>
                      <p
                        className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest mt-0.5"
                        style={{ color: selectedBankInfo.color }}
                      >
                        ธนาคาร: {selectedBankInfo.bank}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ยอดปล่อยกู้
                  </label>
                  <input
                    name="principal"
                    type="number"
                    value={formData.principal === 0 ? "" : formData.principal}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-base sm:text-xl text-gray-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
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
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-base sm:text-xl text-green-600 transition-all"
                  />
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-gray-50 rounded-xl sm:rounded-[1.5rem] border border-gray-100">
                <label className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
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
                      className={`py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black transition-all border ${!isCustomFreq && formData.frequency === f.val && formData.type === f.type ? "bg-blue-500 border-blue-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"}`}
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
                    className={`py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black transition-all border ${isCustomFreq ? "bg-blue-500 border-blue-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-400 hover:border-blue-200"}`}
                  >
                    กำหนดเอง
                  </button>
                </div>
                {isCustomFreq && (
                  <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3">
                    <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      ส่งทุกๆ
                    </span>
                    <input
                      type="number"
                      name="frequency"
                      value={formData.frequency === 0 ? "" : formData.frequency}
                      onChange={handleFormChange}
                      className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 sm:py-2 text-center bg-white border border-gray-200 rounded-lg sm:rounded-xl outline-none font-black text-sm sm:text-base text-blue-500 focus:border-blue-500 transition-all"
                    />
                    <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      วัน
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    จำนวนงวด
                  </label>
                  <input
                    name="installments"
                    type="number"
                    value={
                      formData.installments === 0 ? "" : formData.installments
                    }
                    onChange={handleFormChange}
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-sm sm:text-base text-gray-700 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    วันที่เริ่ม
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="w-full mt-1 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gray-50 border border-transparent rounded-xl sm:rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-black text-sm sm:text-base text-gray-700 transition-all"
                  />
                </div>
              </div>
              <div className="bg-[#1F2335] p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] text-white shadow-xl grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 sm:mb-1">
                    ยอดส่ง / งวด
                  </span>
                  <span className="font-black text-lg sm:text-2xl text-blue-400">
                    ฿{installmentAmount.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 sm:mb-1">
                    กำไร / งวด
                  </span>
                  <span className="font-black text-lg sm:text-2xl text-green-400">
                    ฿{profitPerInstallment.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 border-t border-white/10 pt-3 sm:pt-4 mt-1 sm:mt-2 flex justify-between">
                  <div>
                    <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5 sm:mb-1">
                      รับจริงทั้งหมด
                    </span>
                    <span className="font-black text-sm sm:text-lg">
                      ฿{actualTotalToCollect.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-0.5 sm:mb-1">
                      กำไรสุทธิ
                    </span>
                    <span className="font-black text-sm sm:text-lg text-blue-500">
                      ฿{totalProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-8 border-t border-gray-100 bg-white rounded-b-[1.5rem] sm:rounded-b-[2.5rem] flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setEditContractModalOpen(false)}
                disabled={isSavingContract}
                className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black text-gray-500 bg-gray-100 hover:bg-gray-200 uppercase tracking-widest"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateContract}
                disabled={isSavingContract}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5 sm:gap-2 disabled:opacity-50"
              >
                {isSavingContract ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}{" "}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เลือกบัญชีธนาคาร */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
            onClick={() => setIsBankModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-4xl bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-5 sm:px-8 py-5 sm:py-6 border-b border-gray-50 bg-gray-50/80">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-800">
                  เลือกบัญชีโอนออก
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  แหล่งที่มาของเงินต้นสำหรับการปล่อยกู้
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="p-2.5 sm:p-3 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg sm:rounded-xl shadow-sm border border-gray-100 transition-all active:scale-95"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-8 space-y-8 sm:space-y-10 flex-1">
              {Object.entries(groupedBanks).map(([owner, banks]) => (
                <div key={owner}>
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-gray-700 tracking-wide">
                      {owner}
                    </h4>
                    <div className="flex-1 h-px bg-gray-100 ml-3 sm:ml-4"></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
                          className={`relative p-3 sm:p-5 rounded-xl sm:rounded-3xl border flex flex-col items-start text-left transition-all duration-300 group ${isSelected ? "shadow-md scale-[1.02]" : "bg-white hover:shadow-lg hover:-translate-y-1"}`}
                          style={
                            isSelected
                              ? {
                                  borderColor: b.color,
                                  backgroundColor: `${b.color}15`,
                                }
                              : { borderColor: "#f3f4f6" }
                          }
                        >
                          <div className="flex justify-between w-full items-center mb-2 sm:mb-3">
                            <div
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors"
                              style={{
                                backgroundColor: isSelected
                                  ? `${b.color}20`
                                  : "#f9fafb",
                              }}
                            >
                              <Landmark
                                className="w-4 h-4 sm:w-5 sm:h-5 transition-colors"
                                style={{
                                  color:
                                    isSelected || "group-hover"
                                      ? b.color
                                      : "#d1d5db",
                                }}
                              />
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-white shadow-sm">
                                <CheckCircle2
                                  className="w-3 h-3 sm:w-4 sm:h-4"
                                  style={{ color: b.color }}
                                />
                              </div>
                            )}
                          </div>
                          <span
                            className="font-black text-sm sm:text-lg transition-colors mt-0.5 sm:mt-1"
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

      {/* Modal ดูตารางงวด */}
      {scheduleModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setScheduleModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-lg rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-5 sm:p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-gray-800 flex items-center gap-2 sm:gap-3">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />{" "}
                  ตารางค่างวด
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                  <span className="text-[9px] sm:text-[14px] font-black text-white bg-orange-500 px-2 py-0.5 rounded uppercase tracking-widest">
                    วง {selectedLoan.loanNumber || "-"}
                  </span>
                  <p className="text-[9px] sm:text-[14px] font-black text-gray-400 uppercase tracking-widest">
                    {selectedLoan.totalInstallments} งวด
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-2 sm:p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg sm:rounded-xl transition-all"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-8 bg-gray-50/50 flex-1">
              {loadingSchedule ? (
                <div className="py-16 sm:py-20 flex flex-col items-center gap-3 text-gray-300 font-black text-[10px] uppercase">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />{" "}
                  กำลังโหลด...
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {loanSchedule.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 sm:p-5 rounded-xl sm:rounded-[1.5rem] border bg-white transition-all ${item.status === "paid" ? "opacity-50 grayscale" : "border-gray-100 shadow-sm"}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {item.status === "paid" ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                        ) : (
                          <CircleDashed className="w-5 h-5 sm:w-6 sm:h-6 text-orange-300" />
                        )}
                        <div>
                          <p className="text-xs sm:text-sm font-black text-gray-800">
                            งวดที่ {item.installmentNo}
                          </p>
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {item.dueDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm sm:text-lg font-black ${item.status === "paid" ? "text-gray-400" : "text-orange-500"}`}
                        >
                          ฿{item.amount.toLocaleString()}
                        </p>
                        <p
                          className={`text-[7px] sm:text-[9px] font-black uppercase ${item.status === "paid" ? "text-green-600" : "text-green-500"}`}
                        >
                          กำไร: ฿{(item.profitShare || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 sm:p-8 border-t border-gray-100 bg-white rounded-b-[1.5rem] sm:rounded-b-[2.5rem] flex justify-between items-center">
              <div>
                <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  ยอดเก็บต่องวด
                </p>
                <p className="text-lg sm:text-xl font-black text-gray-800">
                  ฿{selectedLoan.installmentAmount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="bg-gray-900 hover:bg-black text-white px-6 sm:px-10 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
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
