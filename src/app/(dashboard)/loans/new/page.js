"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  increment,
} from "firebase/firestore";
import {
  Save,
  Calendar,
  Clock,
  User,
  Loader2,
  Landmark,
  Users,
  ChevronDown,
  X,
  CheckCircle2,
  Hash,
  PlusCircle,
  Trash2,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";

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
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "TTB",
    acc: "6952049887",
    color: "#F37021",
  },
  {
    owner: "นันทินี ทองสุด",
    bank: "กสิกร",
    acc: "1972871156",
    color: "#00A950",
  },
];

export default function NewLoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [loanMode, setLoanMode] = useState("single");

  const [customersList, setCustomersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ==========================================
  // 🟢 STATE: สำหรับวงกู้เดี่ยว (Single Loan)
  // ==========================================
  const [isCustomFrequency, setIsCustomFrequency] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    loanName: "",
    loanNumber: "1",
    bankIndex: 0,
    principal: "", // 🌟 แก้ค่าเรื่มต้นให้ปล่อยว่างได้
    interestPercent: 10,
    installments: 20,
    startDate: new Date().toISOString().split("T")[0],
    frequency: 1,
    type: "day",
  });

  // ==========================================
  // 🟠 STATE: สำหรับวงกลุ่ม / แชร์ (Group Loan)
  // ==========================================
  const [isGroupCustomFreq, setIsGroupCustomFreq] = useState(false);
  const [groupConfig, setGroupConfig] = useState({
    groupName: "",
    loanNumber: "1",
    bankIndex: 0,
    principal: "", // 🌟 แก้ค่าเรื่มต้นให้ปล่อยว่างได้
    interestPercent: 10,
    installments: 20,
    startDate: new Date().toISOString().split("T")[0],
    frequency: 1,
    type: "day",
  });

  const [selectedMembers, setSelectedMembers] = useState([]); // [{ customerId, customerName, customPrincipal: "" }]
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillName = params.get("name");
    const prefillId = params.get("id");

    if (prefillName) {
      setFormData((prev) => ({
        ...prev,
        customerName: prefillName,
        customerId: prefillId || "",
      }));
      setLoanMode("single");
    }
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      const querySnapshot = await getDocs(collection(db, "customers"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomersList(list);
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCustomerName = (c) => {
    if (c.nickname && c.name) return `${c.nickname} (${c.name})`;
    return c.nickname || c.name || "";
  };

  // ==========================================
  // 🟢 คำนวณ & ฟังก์ชัน: วงเดี่ยว
  // ==========================================
  const principal = Number(formData.principal) || 0;
  const percent = Number(formData.interestPercent) || 0;
  const count = Math.max(Number(formData.installments) || 1, 1);

  const rawTotalAmount = principal + (principal * percent) / 100;
  const installmentAmount = Math.ceil(rawTotalAmount / count);
  const actualTotalToCollect = installmentAmount * count;
  const totalProfit = Math.max(actualTotalToCollect - principal, 0);
  const profitPerInstallment = Math.ceil(totalProfit / count);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    // 🌟 แก้ให้รับค่าว่างได้ เพื่อให้พิมพ์ 0 ได้อิสระ ไม่ดึงกลับไปเป็นค่าว่าง
    if (type === "number") finalValue = value === "" ? "" : Number(value);

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };
      if (name === "customerName") updated.customerId = "";
      return updated;
    });
    if (name === "customerName") setShowDropdown(true);
  };

  const setFreq = (val, type = "day") => {
    setIsCustomFrequency(false);
    setFormData((prev) => ({ ...prev, frequency: val, type: type }));
  };

  const filteredCustomers = customersList.filter((c) => {
    const search = formData.customerName.toLowerCase();
    const matchName = c.name?.toLowerCase().includes(search);
    const matchNickname = c.nickname?.toLowerCase().includes(search);
    const matchCode = c.code?.toLowerCase().includes(search);
    return matchName || matchNickname || matchCode;
  });

  const handleSaveContract = async () => {
    const targetLoanNumber = formData.loanNumber.toString().trim();

    if (!formData.customerId)
      return alert("❌ กรุณาเลือกลูกค้าจากรายการค้นหา (Dropdown) ครับ");
    if (principal <= 0) return alert("กรุณาระบุยอดปล่อยกู้");
    if (!targetLoanNumber) return alert("กรุณาระบุลำดับวงกู้");
    if (Number(formData.frequency) <= 0)
      return alert("กรุณาระบุรอบการส่งเงินที่ถูกต้อง");

    setLoading(true);

    try {
      const targetCustomer = customersList.find(
        (c) => c.id === formData.customerId,
      );

      if (!targetCustomer) {
        alert("❌ ไม่พบข้อมูลลูกค้านี้ในระบบ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
        return;
      }

      const displayCustomerName = formatCustomerName(targetCustomer);
      let finalLoanName = formData.loanName.trim();

      const checkLoanQuery = query(
        collection(db, "loans"),
        where("loanNumber", "==", targetLoanNumber),
      );
      const checkLoanSnapshot = await getDocs(checkLoanQuery);
      const activeLoansInSlot = checkLoanSnapshot.docs
        .map((doc) => doc.data())
        .filter((data) => data.status !== "closed");

      if (activeLoansInSlot.length > 0) {
        const existingGroupName =
          activeLoansInSlot[0].loanName || "ไม่ระบุชื่อกลุ่ม";
        const confirmJoin = window.confirm(
          `⚠️ สล็อต "วงที่ ${targetLoanNumber}" มีคนใช้งานอยู่แล้วในชื่อกลุ่ม: "${existingGroupName}"\n\nคุณต้องการเพิ่มลูกค้ารายนี้เข้า "กลุ่มเดียวกัน" ใช่หรือไม่?`,
        );
        if (!confirmJoin) {
          setLoading(false);
          return;
        }
        finalLoanName = existingGroupName;
      } else {
        finalLoanName = finalLoanName || displayCustomerName;
      }

      const customerRef = doc(db, "customers", targetCustomer.id);
      const batch = writeBatch(db);
      const loanRef = doc(collection(db, "loans"));

      const selectedBankForSingle =
        BANK_OPTIONS[formData.bankIndex] || BANK_OPTIONS[0];

      batch.set(loanRef, {
        customerId: targetCustomer.id,
        customerName: displayCustomerName,
        loanName: finalLoanName,
        loanNumber: targetLoanNumber,
        bankOwner: selectedBankForSingle.owner,
        bankName: selectedBankForSingle.bank,
        bankAccount: selectedBankForSingle.acc,
        bankColor: selectedBankForSingle.color,
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
        frequency: Number(formData.frequency) || 1,
        frequencyType: formData.type,
        status: "active",
        createdAt: serverTimestamp(),
      });

      batch.update(customerRef, {
        activeLoans: increment(1),
        totalDebt: increment(actualTotalToCollect),
      });

      for (let i = 0; i < count; i++) {
        let dueDate = new Date(formData.startDate);
        if (formData.type === "day") {
          dueDate.setDate(
            dueDate.getDate() + i * (Number(formData.frequency) || 1),
          );
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        const scheduleRef = doc(collection(db, "schedules"));
        batch.set(scheduleRef, {
          loanId: loanRef.id,
          customerId: targetCustomer.id,
          customerName: displayCustomerName,
          loanName: finalLoanName,
          loanNumber: targetLoanNumber,
          installmentNo: i + 1,
          dueDate: dueDate.toISOString().split("T")[0],
          amount: installmentAmount,
          profitShare: profitPerInstallment,
          status: "pending",
        });
      }

      await batch.commit();
      alert("✅ บันทึกสัญญาเรียบร้อยแล้ว!");
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/");
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🟠 คำนวณ & ฟังก์ชัน: วงกลุ่ม (Group Loan)
  // ==========================================
  const handleGroupConfigChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    // 🌟 แก้ให้รับค่าว่างได้
    if (type === "number") finalValue = value === "" ? "" : Number(value);
    setGroupConfig((prev) => ({ ...prev, [name]: finalValue }));
  };

  const setGroupFreq = (val, type = "day") => {
    setIsGroupCustomFreq(false);
    setGroupConfig((prev) => ({ ...prev, frequency: val, type: type }));
  };

  const updateMemberCustomPrincipal = (customerId, value) => {
    setSelectedMembers((prev) =>
      prev.map((m) =>
        m.customerId === customerId ? { ...m, customPrincipal: value } : m,
      ),
    );
  };

  const openMemberModal = () => {
    setTempSelectedIds(selectedMembers.map((m) => m.customerId));
    setMemberSearchQuery("");
    setIsMemberModalOpen(true);
  };

  const toggleMemberSelection = (id) => {
    setTempSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const confirmMemberSelection = () => {
    const newMembers = tempSelectedIds.map((id) => {
      const existing = selectedMembers.find((m) => m.customerId === id);
      if (existing) return existing;

      const customer = customersList.find((c) => c.id === id);
      return {
        customerId: customer.id,
        customerName: formatCustomerName(customer),
        customPrincipal: "",
      };
    });
    setSelectedMembers(newMembers);
    setIsMemberModalOpen(false);
  };

  const removeSelectedMember = (idToRemove) => {
    setSelectedMembers((prev) =>
      prev.filter((m) => m.customerId !== idToRemove),
    );
  };

  const filteredModalCustomers = customersList.filter((c) => {
    if (!memberSearchQuery) return true;
    const search = memberSearchQuery.toLowerCase();
    return (
      (c.name?.toLowerCase() || "").includes(search) ||
      (c.nickname?.toLowerCase() || "").includes(search) ||
      (c.code?.toLowerCase() || "").includes(search)
    );
  });

  const groupDefaultPrincipal = Number(groupConfig.principal) || 0;
  const groupPercent = Number(groupConfig.interestPercent) || 0;
  const groupCount = Math.max(Number(groupConfig.installments) || 1, 1);

  let totalGroupPrincipal = 0;
  let totalGroupCollectPerInst = 0;
  let totalGroupExpectedCollect = 0;
  let totalGroupProfit = 0;
  let totalGroupProfitPerInst = 0;

  const membersCalculations = selectedMembers.map((m) => {
    const p =
      m.customPrincipal !== ""
        ? Number(m.customPrincipal)
        : groupDefaultPrincipal;

    const instAmt = Math.ceil((p + (p * groupPercent) / 100) / groupCount);
    const total = instAmt * groupCount;
    const profit = Math.max(total - p, 0);
    const profPerInst = Math.ceil(profit / groupCount);

    totalGroupPrincipal += p;
    totalGroupCollectPerInst += instAmt;
    totalGroupExpectedCollect += total;
    totalGroupProfit += profit;
    totalGroupProfitPerInst += profPerInst;

    return {
      ...m,
      calculatedPrincipal: p,
      instAmt,
      total,
      profit,
      profPerInst,
    };
  });

  const handleSaveGroupLoan = async () => {
    const targetLoanNumber = groupConfig.loanNumber.toString().trim();

    if (!groupConfig.groupName.trim())
      return alert("กรุณาตั้งชื่อกลุ่ม / วงแชร์");
    if (!targetLoanNumber) return alert("กรุณาระบุลำดับวงกู้ของกลุ่ม");
    if (groupDefaultPrincipal <= 0)
      return alert(
        "กรุณาระบุ 'ยอดปล่อยกู้ (ต่อคน)' สำหรับเป็นยอดมาตรฐานด้วยครับ",
      );
    if (groupConfig.installments <= 0 || Number(groupConfig.frequency) <= 0)
      return alert("รูปแบบงวดไม่ถูกต้อง");

    if (selectedMembers.length === 0)
      return alert("❌ กรุณาเลือกสมาชิกเข้ากลุ่มอย่างน้อย 1 คนครับ");

    setLoading(true);

    try {
      const checkLoanQuery = query(
        collection(db, "loans"),
        where("loanNumber", "==", targetLoanNumber),
      );
      const checkLoanSnapshot = await getDocs(checkLoanQuery);
      const activeLoansInSlot = checkLoanSnapshot.docs
        .map((doc) => doc.data())
        .filter((data) => data.status !== "closed");

      if (activeLoansInSlot.length > 0) {
        const existingGroupName =
          activeLoansInSlot[0].loanName || "ไม่ระบุชื่อกลุ่ม";
        const confirmJoin = window.confirm(
          `⚠️ สล็อต "วงที่ ${targetLoanNumber}" มีคนใช้งานอยู่แล้วในชื่อกลุ่ม: "${existingGroupName}"\n\nคุณต้องการสร้างกลุ่มนี้ซ้อนในสล็อตเดียวกัน ใช่หรือไม่?`,
        );
        if (!confirmJoin) {
          setLoading(false);
          return;
        }
      } else {
        if (
          !window.confirm(
            `ยืนยันการสร้างวงกลุ่ม "${groupConfig.groupName}" (วงที่ ${targetLoanNumber})\nยอดปล่อยกู้รวม ${totalGroupPrincipal.toLocaleString()} บาท (จำนวน ${selectedMembers.length} คน) ?`,
          )
        ) {
          setLoading(false);
          return;
        }
      }

      const selectedBankForGroup =
        BANK_OPTIONS[groupConfig.bankIndex] || BANK_OPTIONS[0];

      for (const member of membersCalculations) {
        const batch = writeBatch(db);

        const targetCustomer = customersList.find(
          (c) => c.id === member.customerId,
        );
        if (!targetCustomer) {
          throw new Error(`ไม่พบข้อมูลลูกค้า ID: ${member.customerId}`);
        }

        const loanRef = doc(collection(db, "loans"));
        const displayCustomerName = member.customerName;

        batch.set(loanRef, {
          customerId: targetCustomer.id,
          customerName: displayCustomerName,
          loanName: groupConfig.groupName.trim(),
          loanNumber: targetLoanNumber,
          bankOwner: selectedBankForGroup.owner,
          bankName: selectedBankForGroup.bank,
          bankAccount: selectedBankForGroup.acc,
          bankColor: selectedBankForGroup.color,
          principal: member.calculatedPrincipal,
          interestRate: groupPercent,
          totalAmount: member.total,
          remainingBalance: member.total,
          totalInstallments: groupCount,
          currentInstallment: 0,
          installmentAmount: member.instAmt,
          totalProfit: member.profit,
          profitPerInstallment: member.profPerInst,
          startDate: groupConfig.startDate,
          frequency: Number(groupConfig.frequency) || 1,
          frequencyType: groupConfig.type,
          status: "active",
          isGroupLoan: true,
          createdAt: serverTimestamp(),
        });

        batch.update(doc(db, "customers", targetCustomer.id), {
          activeLoans: increment(1),
          totalDebt: increment(member.total),
        });

        for (let i = 0; i < groupCount; i++) {
          let dueDate = new Date(groupConfig.startDate);
          if (groupConfig.type === "day") {
            dueDate.setDate(
              dueDate.getDate() + i * (Number(groupConfig.frequency) || 1),
            );
          } else {
            dueDate.setMonth(dueDate.getMonth() + i);
          }

          const scheduleRef = doc(collection(db, "schedules"));
          batch.set(scheduleRef, {
            loanId: loanRef.id,
            customerId: targetCustomer.id,
            customerName: displayCustomerName,
            loanName: groupConfig.groupName.trim(),
            loanNumber: targetLoanNumber,
            installmentNo: i + 1,
            dueDate: dueDate.toISOString().split("T")[0],
            amount: member.instAmt,
            profitShare: member.profPerInst,
            status: "pending",
          });
        }
        await batch.commit();
      }

      alert("✅ สร้างวงกู้กลุ่มและกระจายข้อมูลสำเร็จเรียบร้อยแล้ว!");
      router.push("/");
    } catch (error) {
      console.error("Error creating group loan:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const groupedBanks = BANK_OPTIONS.reduce((acc, bank, index) => {
    if (!acc[bank.owner]) acc[bank.owner] = [];
    acc[bank.owner].push({ ...bank, index });
    return acc;
  }, {});

  const selectedBankInfo =
    loanMode === "single"
      ? BANK_OPTIONS[formData.bankIndex] || BANK_OPTIONS[0]
      : BANK_OPTIONS[groupConfig.bankIndex] || BANK_OPTIONS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 pt-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            {loanMode === "single" ? (
              "สร้างวงกู้ใหม่"
            ) : (
              <>
                <Users className="w-8 h-8 text-orange-500" /> สร้างวงแชร์ /
                กลุ่ม
              </>
            )}
          </h1>
          <div className="flex bg-gray-100 p-1 rounded-xl mt-4 w-fit shadow-inner">
            <button
              onClick={() => setLoanMode("single")}
              className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                loanMode === "single"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              วงกู้เดี่ยว
            </button>
            <button
              onClick={() => setLoanMode("group")}
              className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                loanMode === "group"
                  ? "bg-white text-orange-500 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              วงแชร์ / วงกลุ่ม
            </button>
          </div>
        </div>

        <button
          onClick={
            loanMode === "single" ? handleSaveContract : handleSaveGroupLoan
          }
          disabled={loading}
          className="w-full sm:w-auto bg-orange-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-1"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {loanMode === "single"
            ? "บันทึกและเปิดสัญญา"
            : "บันทึกการสร้างวงกลุ่ม"}
        </button>
      </div>

      {loanMode === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-300 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-8">
              <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest border-l-4 border-orange-500 pl-4">
                Loan Configuration
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-12" ref={dropdownRef}>
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      ชื่อลูกค้า (ค้นหาจากชื่อเล่น/ชื่อจริง) *
                    </label>
                    <div className="relative mt-1">
                      <User
                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${formData.customerId ? "text-green-500" : "text-gray-300"}`}
                      />
                      <input
                        name="customerName"
                        type="text"
                        value={formData.customerName}
                        onChange={handleChange}
                        onFocus={() => setShowDropdown(true)}
                        className={`w-full pl-12 pr-10 py-4 bg-white border rounded-2xl outline-none font-bold transition-all text-gray-700 ${formData.customerId ? "border-green-500 bg-green-50/50" : "border-gray-200 focus:border-orange-500"}`}
                        placeholder="พิมพ์ค้นหาและเลือกลูกค้า..."
                      />
                      {formData.customerId && (
                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}

                      {showDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((c) => (
                              <div
                                key={c.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData((prev) => ({
                                    ...prev,
                                    customerId: c.id,
                                    customerName: formatCustomerName(c),
                                  }));
                                  setShowDropdown(false);
                                }}
                                className="px-5 py-4 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-sm font-black text-gray-800">
                                    {c.code && (
                                      <span className="text-orange-500 mr-1">
                                        [{c.code}]
                                      </span>
                                    )}
                                    {formatCustomerName(c)}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-400 mt-1">
                                    📞 {c.phone}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-5 py-6 text-center">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                ไม่พบรายชื่อลูกค้านี้
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-7">
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      ชื่อกลุ่ม / วงแชร์ (ไม่บังคับ)
                    </label>
                    <div className="relative mt-1">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        name="loanName"
                        type="text"
                        value={formData.loanName}
                        onChange={handleChange}
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-bold transition-all text-gray-700"
                        placeholder="เช่น แชร์แม่ชม (ปล่อยว่าง = ใช้ชื่อลูกค้า)"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      ลำดับวงกู้
                    </label>
                    <div className="relative mt-1">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        name="loanNumber"
                        type="text"
                        value={formData.loanNumber}
                        onChange={handleChange}
                        className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-black text-orange-500 transition-all text-center"
                        placeholder="เช่น 1, 2"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400 mb-1 block">
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

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      ยอดปล่อยกู้
                    </label>
                    <input
                      name="principal"
                      type="number"
                      value={formData.principal} // 🌟 นำเงื่อนไขการล้างช่องทิ้งไป
                      onChange={handleChange}
                      className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-800 text-xl md:text-2xl focus:bg-white focus:border-orange-500 transition-all text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      ดอกเบี้ย (%)
                    </label>
                    <input
                      name="interestPercent"
                      type="number"
                      step="0.01"
                      value={formData.interestPercent} // 🌟 นำเงื่อนไขการล้างช่องทิ้งไป ให้พิมพ์ 0 ได้
                      onChange={handleChange}
                      className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none text-green-600 font-black text-xl md:text-2xl focus:bg-white focus:border-green-500 transition-all"
                    />
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                  <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-orange-500" /> รอบการส่งเงิน
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                        className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                          !isCustomFrequency &&
                          formData.frequency === f.val &&
                          formData.type === f.type
                            ? "bg-[#1F2335] border-[#1F2335] text-white shadow-lg"
                            : "bg-white border-gray-200 text-gray-400 hover:border-orange-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomFrequency(true);
                        setFormData((prev) => ({ ...prev, type: "day" }));
                      }}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        isCustomFrequency
                          ? "bg-orange-500 border-orange-500 text-white shadow-lg"
                          : "bg-white border-gray-200 text-gray-400 hover:border-orange-200"
                      }`}
                    >
                      กำหนดเอง
                    </button>
                  </div>

                  {isCustomFrequency && (
                    <div className="mt-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        ส่งทุกๆ
                      </span>
                      <input
                        type="number"
                        name="frequency"
                        value={formData.frequency} // 🌟
                        onChange={handleChange}
                        className="w-24 px-4 py-2 text-center bg-white border border-gray-200 rounded-xl outline-none font-black text-orange-500 focus:border-orange-500 transition-all shadow-inner"
                        placeholder="เช่น 3"
                        min="1"
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        วัน
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                      จำนวนงวด
                    </label>
                    <input
                      name="installments"
                      type="number"
                      value={formData.installments} // 🌟
                      onChange={handleChange}
                      className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-700 focus:bg-white focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      วันที่เริ่ม
                    </label>
                    <input
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-700 focus:bg-white focus:border-orange-500 transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[#1F2335] p-6 md:p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden space-y-6 md:space-y-8 mt-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="relative z-10 grid grid-cols-2 gap-y-6 md:gap-y-8 gap-x-4">
                    <div>
                      <span className="text-[12px] md:text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        ยอดเก็บ / งวด
                      </span>
                      <span className="font-black text-2xl md:text-4xl text-orange-400 tracking-tighter">
                        ฿{installmentAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] md:text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        กำไร / งวด
                      </span>
                      <span className="font-black text-2xl md:text-4xl text-green-400 tracking-tighter">
                        ฿{profitPerInstallment.toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-white/5 pt-6 md:pt-8 flex justify-between items-end">
                      <div>
                        <span className="text-[12px] md:text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                          ยอดรับจริงทั้งหมด
                        </span>
                        <span className="font-black text-xl md:text-2xl">
                          ฿{actualTotalToCollect.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] md:text-[14px] font-black text-orange-400 uppercase tracking-widest block mb-1">
                          กำไรสุทธิ
                        </span>
                        <span className="font-black text-xl md:text-2xl text-orange-500">
                          ฿{totalProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 z-0">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden flex flex-col h-fit max-h-[70vh]">
              <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <h3 className="font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-widest">
                  <Calendar className="w-5 h-5 text-orange-500" />{" "}
                  ตารางค่างวดพรีวิว
                </h3>
                <span className="px-4 py-1.5 bg-white rounded-xl border border-gray-100 text-[10px] font-black text-orange-500 shadow-sm">
                  {count} งวด
                </span>
              </div>

              <div className="overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white border-b border-gray-50 z-10">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <th className="px-6 md:px-10 py-5">งวดที่</th>
                      <th className="px-6 md:px-10 py-5 text-center">
                        วันที่ชำระ
                      </th>
                      <th className="px-6 md:px-10 py-5 text-right">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Array.from({ length: count }).map((_, i) => {
                      let date = new Date(formData.startDate);
                      if (formData.type === "day") {
                        date.setDate(
                          date.getDate() +
                            i * (Number(formData.frequency) || 1),
                        );
                      } else {
                        date.setMonth(date.getMonth() + i);
                      }
                      const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                      return (
                        <tr
                          key={i}
                          className="hover:bg-orange-50/10 transition-all group"
                        >
                          <td className="px-6 md:px-10 py-4 md:py-6 text-xs font-black text-gray-300 group-hover:text-orange-500">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="px-6 md:px-10 py-4 md:py-6 text-sm font-bold text-gray-600 text-center">
                            {dateStr}
                          </td>
                          <td className="px-6 md:px-10 py-4 md:py-6 text-sm font-black text-gray-800 text-right">
                            ฿{installmentAmount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🟠 UI: GROUP LOAN (ระบบปรับเงินต้นรายบุคคล) */}
      {/* ========================================== */}
      {loanMode === "group" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-300 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-8 relative z-10">
              <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest border-l-4 border-orange-500 pl-4">
                1. กติกาของกลุ่ม (ใช้ร่วมกันทุกคน)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ชื่อกลุ่ม / วงแชร์ *
                  </label>
                  <input
                    name="groupName"
                    type="text"
                    value={groupConfig.groupName}
                    onChange={handleGroupConfigChange}
                    className="w-full mt-1 px-5 py-4 bg-orange-50/30 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-black text-orange-600 text-lg transition-all"
                    placeholder="เช่น แชร์แม่ชมวงที่ 1"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ลำดับวงกู้ *
                  </label>
                  <div className="relative mt-1">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      name="loanNumber"
                      type="text"
                      value={groupConfig.loanNumber}
                      onChange={handleGroupConfigChange}
                      className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-black text-orange-500 transition-all text-center"
                      placeholder="เช่น 1"
                    />
                  </div>
                </div>

                <div className="md:col-span-6">
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ยอดปล่อยกู้เริ่มต้น (ต่อคน) *
                  </label>
                  <input
                    name="principal"
                    type="number"
                    value={groupConfig.principal} // 🌟
                    onChange={handleGroupConfigChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-800 text-xl focus:bg-white focus:border-orange-500 transition-all"
                    placeholder="ใส่ยอดเริ่มต้นให้ทุกคน"
                  />
                </div>

                <div className="md:col-span-6">
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ดอกเบี้ย (%)
                  </label>
                  <input
                    name="interestPercent"
                    type="number"
                    step="0.01"
                    value={groupConfig.interestPercent} // 🌟 อนุญาตให้เป็น 0
                    onChange={handleGroupConfigChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none text-green-600 font-black text-xl focus:bg-white focus:border-green-500 transition-all"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400 mb-1 block">
                    บัญชีธนาคารต้นทาง
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(true)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-white border border-transparent rounded-2xl transition-all group text-left shadow-sm hover:shadow-md"
                    style={{ borderColor: `${selectedBankInfo.color}40` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: `${selectedBankInfo.color}15`,
                          border: `1px solid ${selectedBankInfo.color}30`,
                        }}
                      >
                        <Landmark
                          className="w-4 h-4"
                          style={{ color: selectedBankInfo.color }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800">
                          {selectedBankInfo.owner}
                        </p>
                        <p
                          className="text-[9px] font-black uppercase tracking-widest mt-0.5"
                          style={{ color: selectedBankInfo.color }}
                        >
                          ธนาคาร: {selectedBankInfo.bank}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-500" />{" "}
                  รอบการส่งเงินของกลุ่ม
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "รายวัน", val: 1, type: "day" },
                    { label: "5 วัน", val: 5, type: "day" },
                    { label: "7 วัน", val: 7, type: "day" },
                    { label: "รายเดือน", val: 1, type: "month" },
                  ].map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setGroupFreq(f.val, f.type)}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        !isGroupCustomFreq &&
                        groupConfig.frequency === f.val &&
                        groupConfig.type === f.type
                          ? "bg-[#1F2335] border-[#1F2335] text-white shadow-lg"
                          : "bg-white border-gray-200 text-gray-400 hover:border-orange-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupCustomFreq(true);
                      setGroupConfig((prev) => ({ ...prev, type: "day" }));
                    }}
                    className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                      isGroupCustomFreq
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg"
                        : "bg-white border-gray-200 text-gray-400 hover:border-orange-200"
                    }`}
                  >
                    กำหนดเอง
                  </button>
                </div>
                {isGroupCustomFreq && (
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      ส่งทุกๆ
                    </span>
                    <input
                      type="number"
                      name="frequency"
                      value={groupConfig.frequency} // 🌟
                      onChange={handleGroupConfigChange}
                      className="w-24 px-4 py-2 text-center bg-white border border-gray-200 rounded-xl outline-none font-black text-orange-500 focus:border-orange-500 transition-all"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      วัน
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    จำนวนงวด
                  </label>
                  <input
                    name="installments"
                    type="number"
                    value={groupConfig.installments} // 🌟
                    onChange={handleGroupConfigChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-700 focus:bg-white focus:border-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    วันที่เริ่ม
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={groupConfig.startDate}
                    onChange={handleGroupConfigChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-700 focus:bg-white focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 🌟 2. สมาชิกในกลุ่ม (พร้อมช่องกรอกเงินต้นแยกรายคน) */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-6 relative z-20">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div>
                  <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest border-l-4 border-orange-500 pl-4">
                    2. สมาชิกในกลุ่ม ({selectedMembers.length} คน)
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-5">
                    สามารถปรับยอดกู้แยกรายบุคคลได้
                  </p>
                </div>
                <button
                  onClick={openMemberModal}
                  className="text-[10px] font-black uppercase tracking-widest text-white bg-orange-500 hover:bg-orange-600 px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" /> เลือกสมาชิกเข้ากลุ่ม
                </button>
              </div>

              {selectedMembers.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    ยังไม่มีสมาชิกในกลุ่มนี้
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">
                    คลิกปุ่ม เลือกสมาชิกเข้ากลุ่ม ด้านบนเพื่อเพิ่ม
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {membersCalculations.map((m, index) => (
                    <div
                      key={m.customerId}
                      className="bg-gray-50 border border-gray-100 p-5 rounded-[1.5rem] flex flex-col gap-3 transition-colors hover:border-orange-200"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-orange-600">
                              {index + 1}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-gray-800 truncate">
                            {m.customerName}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSelectedMember(m.customerId)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 🌟 ช่องให้กรอกเงินต้นแยกรายบุคคล */}
                      <div className="flex items-center gap-3 mt-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          เงินต้น:
                        </label>
                        <input
                          type="number"
                          value={m.customPrincipal}
                          onChange={(e) =>
                            updateMemberCustomPrincipal(
                              m.customerId,
                              e.target.value,
                            )
                          }
                          placeholder={`ยอดตั้งต้น: ${groupDefaultPrincipal}`}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-black text-orange-500 outline-none focus:border-orange-500 transition-all placeholder:text-gray-300 placeholder:font-bold"
                        />
                      </div>

                      {/* 🌟 แสดงยอดส่งของคนๆ นั้นให้เห็นทันทีที่แก้ตัวเลข */}
                      <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-1">
                        <span className="text-[10px] font-bold text-gray-400">
                          ส่งงวดละ:{" "}
                          <span className="font-black text-gray-700">
                            ฿{m.instAmt.toLocaleString()}
                          </span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">
                          กำไร:{" "}
                          <span className="font-black text-green-500">
                            ฿{m.profit.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🌟 3. สรุปยอดรวมกลุ่ม (รวมจากยอดของแต่ละคน) */}
            <div className="bg-[#1F2335] p-6 md:p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden z-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>

              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-8 gap-x-4">
                <div className="col-span-2 md:col-span-4 border-b border-white/5 pb-6">
                  <span className="text-[12px] md:text-[14px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    ยอดเงินต้นรวมทั้งกลุ่ม
                  </span>
                  <span className="font-black text-3xl md:text-4xl text-white tracking-tighter">
                    ฿{totalGroupPrincipal.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] md:text-[12px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    ยอดเก็บรวม/งวด
                  </span>
                  <span className="font-black text-xl md:text-2xl text-orange-400 tracking-tighter">
                    ฿{totalGroupCollectPerInst.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] md:text-[12px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    กำไรรวม/งวด
                  </span>
                  <span className="font-black text-xl md:text-2xl text-green-400 tracking-tighter">
                    ฿{totalGroupProfitPerInst.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] md:text-[12px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                    รับจริงทั้งหมด
                  </span>
                  <span className="font-black text-xl md:text-2xl">
                    ฿{totalGroupExpectedCollect.toLocaleString()}
                  </span>
                </div>

                <div className="md:text-right">
                  <span className="text-[10px] md:text-[12px] font-black text-orange-400 uppercase tracking-widest block mb-1">
                    กำไรสุทธิรวม
                  </span>
                  <span className="font-black text-xl md:text-2xl text-orange-500">
                    ฿{totalGroupProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 z-0">
            {/* 🌟 ปรับตารางให้พอดีไม่ยืด */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden flex flex-col h-fit max-h-[70vh]">
              <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <h3 className="font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-widest">
                  <Calendar className="w-5 h-5 text-orange-500" /> ตารางพรีวิว
                  (รวมทั้งกลุ่ม)
                </h3>
                <span className="px-4 py-1.5 bg-white rounded-xl border border-gray-100 text-[10px] font-black text-orange-500 shadow-sm">
                  {groupCount} งวด
                </span>
              </div>

              <div className="overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white border-b border-gray-50 z-10">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <th className="px-6 py-5">งวดที่</th>
                      <th className="px-6 py-5 text-center">วันที่ชำระ</th>
                      <th className="px-6 py-5 text-right">ยอดเก็บรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Array.from({ length: groupCount }).map((_, i) => {
                      let date = new Date(groupConfig.startDate);
                      if (groupConfig.type === "day") {
                        date.setDate(
                          date.getDate() +
                            i * (Number(groupConfig.frequency) || 1),
                        );
                      } else {
                        date.setMonth(date.getMonth() + i);
                      }
                      const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                      return (
                        <tr
                          key={i}
                          className="hover:bg-orange-50/10 transition-all group"
                        >
                          <td className="px-6 py-4 text-xs font-black text-gray-300 group-hover:text-orange-500">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-600 text-center">
                            {dateStr}
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-gray-800 text-right">
                            ฿{totalGroupCollectPerInst.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🌟 MODAL: เลือกสมาชิกแบบ Checkbox (Idea 2)  */}
      {/* ========================================== */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsMemberModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[85vh] md:h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex justify-between items-center px-6 md:px-8 py-6 border-b border-gray-100 bg-gray-50/50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                  <Users className="w-6 h-6 text-orange-500" /> เลือกสมาชิก
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  เลือกคนที่ต้องการดึงเข้ากลุ่ม
                </p>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-3 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* ค้นหาใน Modal */}
            <div className="px-6 md:px-8 py-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-bold transition-all text-gray-700"
                  placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                />
              </div>
            </div>

            {/* รายชื่อลูกค้า */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-gray-50/30">
              {filteredModalCustomers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm font-bold text-gray-400">
                    ไม่พบรายชื่อลูกค้านี้
                  </p>
                </div>
              ) : (
                filteredModalCustomers.map((c) => {
                  const isChecked = tempSelectedIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleMemberSelection(c.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        isChecked
                          ? "border-orange-500 bg-orange-50/50 shadow-sm"
                          : "border-transparent bg-white hover:border-orange-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isChecked ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-black ${isChecked ? "text-orange-700" : "text-gray-800"}`}
                          >
                            {c.code && (
                              <span className="text-orange-500 mr-1">
                                [{c.code}]
                              </span>
                            )}
                            {formatCustomerName(c)}
                          </p>
                          <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                            📞 {c.phone || "ไม่มีเบอร์"}
                          </p>
                        </div>
                      </div>
                      <div>
                        {isChecked ? (
                          <CheckSquare className="w-6 h-6 text-orange-500" />
                        ) : (
                          <Square className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-6 md:p-8 bg-white border-t border-gray-100 rounded-b-[2.5rem] flex items-center justify-between">
              <p className="text-sm font-black text-gray-500">
                เลือกแล้ว{" "}
                <span className="text-xl text-orange-500">
                  {tempSelectedIds.length}
                </span>{" "}
                คน
              </p>
              <button
                onClick={confirmMemberSelection}
                className="bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                ยืนยันการเลือก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: เลือกบัญชีธนาคาร --- */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
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
                      const isSelected =
                        loanMode === "single"
                          ? formData.bankIndex === b.index
                          : groupConfig.bankIndex === b.index;

                      return (
                        <button
                          key={b.index}
                          type="button"
                          onClick={() => {
                            if (loanMode === "single") {
                              setFormData((prev) => ({
                                ...prev,
                                bankIndex: b.index,
                              }));
                            } else {
                              setGroupConfig((prev) => ({
                                ...prev,
                                bankIndex: b.index,
                              }));
                            }
                            setIsBankModalOpen(false);
                          }}
                          className={`relative p-4 md:p-5 rounded-3xl border flex flex-col items-start text-left transition-all duration-300 group ${
                            isSelected
                              ? "shadow-md scale-[1.02]"
                              : "bg-white hover:shadow-lg hover:-translate-y-1"
                          }`}
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
    </div>
  );
}
