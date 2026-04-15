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
  Users, // 🌟 เพิ่มไอคอน Users สำหรับกลุ่ม
  ChevronDown,
  X,
  CheckCircle2,
  Hash,
} from "lucide-react";

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

export default function NewLoanPage() {
  const [loading, setLoading] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [customersList, setCustomersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [isCustomFrequency, setIsCustomFrequency] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
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
    if (type === "number") {
      finalValue = value === "" ? 0 : Number(value);
    }
    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };
      if (name === "customerName") {
        updated.customerId = "";
      }
      return updated;
    });

    if (name === "customerName") setShowDropdown(true);
  };

  const setFreq = (val, type = "day") => {
    setIsCustomFrequency(false);
    setFormData((prev) => ({ ...prev, frequency: val, type: type }));
  };

  const groupedBanks = BANK_OPTIONS.reduce((acc, bank, index) => {
    if (!acc[bank.owner]) acc[bank.owner] = [];
    acc[bank.owner].push({ ...bank, index });
    return acc;
  }, {});

  const selectedBankInfo = BANK_OPTIONS[formData.bankIndex];

  const filteredCustomers = customersList.filter((c) => {
    const search = formData.customerName.toLowerCase();
    const matchName = c.name?.toLowerCase().includes(search);
    const matchNickname = c.nickname?.toLowerCase().includes(search);
    return matchName || matchNickname;
  });

  const handleSaveContract = async () => {
    const targetLoanNumber = formData.loanNumber.toString().trim();

    if (!formData.customerName.trim()) return alert("กรุณาระบุชื่อลูกค้า");
    if (principal <= 0) return alert("กรุณาระบุยอดปล่อยกู้");
    if (!targetLoanNumber) return alert("กรุณาระบุลำดับวงกู้");
    if (formData.frequency <= 0)
      return alert("กรุณาระบุรอบการส่งเงินที่ถูกต้อง");

    setLoading(true);

    try {
      const targetCustomer = customersList.find(
        (c) =>
          c.id === formData.customerId ||
          (c.nickname && c.nickname === formData.customerName.trim()) ||
          c.name === formData.customerName.trim(),
      );

      if (!targetCustomer) {
        alert("❌ ไม่พบชื่อลูกค้านี้ในระบบ! กรุณาเลือกลูกค้าจาก Dropdown");
        setLoading(false);
        return;
      }

      const displayCustomerName =
        targetCustomer.nickname || targetCustomer.name;
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
          `⚠️ สล็อต "วงที่ ${targetLoanNumber}" มีคนใช้งานอยู่แล้วในชื่อกลุ่ม: "${existingGroupName}"\n\nคุณต้องการเพิ่มลูกค้ารายนี้เข้า "กลุ่มเดียวกัน" ใช่หรือไม่?\n(คลิก OK เพื่อเข้าร่วมกลุ่ม หรือ Cancel เพื่อยกเลิกและเปลี่ยนเลขวงใหม่)`,
        );

        if (!confirmJoin) {
          setLoading(false);
          return;
        }

        // ถ้ายอมรับการเข้าร่วมกลุ่ม ระบบจะยัดชื่อกลุ่มเก่าให้คนนี้ทันที (แม้จะพิมพ์ชื่ออื่นมา)
        finalLoanName = existingGroupName;
      } else {
        // วงใหม่เอี่ยม: ถ้าแอดมินพิมพ์ชื่อกลุ่มมาก็ใช้ชื่อนั้น ถ้าว่างไว้ก็ให้เป็นชื่อลูกค้าปกติ
        finalLoanName = finalLoanName || displayCustomerName;
      }

      const customerRef = doc(db, "customers", targetCustomer.id);
      const batch = writeBatch(db);
      const loanRef = doc(collection(db, "loans"));

      const loanData = {
        customerId: targetCustomer.id,
        customerName: displayCustomerName,
        loanName: finalLoanName, // ถูกจัดการเรียบร้อยแล้ว
        loanNumber: targetLoanNumber,
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
        status: "active",
        createdAt: serverTimestamp(),
      };
      batch.set(loanRef, loanData);

      batch.update(customerRef, {
        activeLoans: increment(1),
        totalDebt: increment(actualTotalToCollect),
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
          loanId: loanRef.id,
          customerId: targetCustomer.id,
          customerName: displayCustomerName,
          loanName: finalLoanName, // บันทึกลงตารางงวดด้วย
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

      setFormData({
        customerId: "",
        customerName: "",
        loanName: "", // เคลียร์ชื่อกลุ่ม
        loanNumber: "",
        bankIndex: 0,
        principal: 0,
        interestPercent: 10,
        installments: 20,
        startDate: new Date().toISOString().split("T")[0],
        frequency: 1,
        type: "day",
      });
      setIsCustomFrequency(false);
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-8 pt-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">
            สร้างวงกู้ใหม่
          </h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">
            อัปเดตยอดลูกค้าอัตโนมัติ
          </p>
        </div>
        <button
          onClick={handleSaveContract}
          disabled={loading}
          className="w-full sm:w-auto bg-orange-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95 text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกและเปิดสัญญา
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-8">
            <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest border-l-4 border-orange-500 pl-4">
              Loan Configuration
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12" ref={dropdownRef}>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ชื่อลูกค้า (ค้นหาจากชื่อเล่น/ชื่อจริง)
                  </label>
                  <div className="relative mt-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      name="customerName"
                      type="text"
                      value={formData.customerName}
                      onChange={handleChange}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-orange-500 font-bold transition-all text-gray-700"
                      placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                    />

                    {showDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  customerId: c.id,
                                  customerName: c.nickname || c.name,
                                }));
                                setShowDropdown(false);
                              }}
                              className="px-5 py-4 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-black text-gray-800">
                                  {c.nickname
                                    ? `${c.nickname} (${c.name})`
                                    : c.name}
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

                {/* 🌟 ช่องตั้งชื่อกลุ่ม (เปลี่ยน Label และเพิ่มคำแนะนำ) */}
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
                  <p className="text-[9px] font-bold text-gray-400 mt-2 ml-2 tracking-widest">
                    * ใช้สำหรับจัดกลุ่มคนกู้ในหน้าวอร์รูม
                  </p>
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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ยอดปล่อยกู้
                  </label>
                  <input
                    name="principal"
                    type="number"
                    value={formData.principal === 0 ? "" : formData.principal}
                    onChange={handleChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-800 text-2xl focus:bg-white focus:border-orange-500 transition-all text-gray-700"
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
                    value={
                      formData.interestPercent === 0
                        ? ""
                        : formData.interestPercent
                    }
                    onChange={handleChange}
                    className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none text-green-600 font-black text-2xl focus:bg-white focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-500" /> รอบการส่งเงิน
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
                      value={formData.frequency === 0 ? "" : formData.frequency}
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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    จำนวนงวด
                  </label>
                  <input
                    name="installments"
                    type="number"
                    value={
                      formData.installments === 0 ? "" : formData.installments
                    }
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

              <div className="bg-[#1F2335] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden space-y-8 mt-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 grid grid-cols-2 gap-y-8 gap-x-4">
                  <div>
                    <span className="text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                      ยอดเก็บ / งวด
                    </span>
                    <span className="font-black text-4xl text-orange-400 tracking-tighter">
                      ฿{installmentAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                      กำไร / งวด
                    </span>
                    <span className="font-black text-4xl text-green-400 tracking-tighter">
                      ฿{profitPerInstallment.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-white/5 pt-8 flex justify-between items-end">
                    <div>
                      <span className="text-[14px] font-black text-gray-500 uppercase tracking-widest block mb-1">
                        ยอดรับจริงทั้งหมด
                      </span>
                      <span className="font-black text-2xl">
                        ฿{actualTotalToCollect.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-black text-orange-400 uppercase tracking-widest block mb-1">
                        กำไรสุทธิ
                      </span>
                      <span className="font-black text-2xl text-orange-500">
                        ฿{totalProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden flex flex-col h-full min-h-[700px]">
          <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
            <h3 className="font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-widest">
              <Calendar className="w-5 h-5 text-orange-500" /> ตารางค่างวดพรีวิว
            </h3>
            <span className="px-4 py-1.5 bg-white rounded-xl border border-gray-100 text-[10px] font-black text-orange-500 shadow-sm">
              {count} งวด
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white border-b border-gray-50 z-10">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  <th className="px-10 py-5">งวดที่</th>
                  <th className="px-10 py-5 text-center">วันที่ชำระ</th>
                  <th className="px-10 py-5 text-right">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: count }).map((_, i) => {
                  let date = new Date(formData.startDate);
                  if (formData.type === "day") {
                    date.setDate(
                      date.getDate() + i * Number(formData.frequency || 1),
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
                      <td className="px-10 py-6 text-xs font-black text-gray-300 group-hover:text-orange-500">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-gray-600 text-center">
                        {dateStr}
                      </td>
                      <td className="px-10 py-6 text-sm font-black text-gray-800 text-right">
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

      {isBankModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsBankModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50 bg-gray-50/80">
              <div>
                <h2 className="text-2xl font-black text-gray-800">
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

            <div className="overflow-y-auto p-8 space-y-10 flex-1">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          className={`relative p-5 rounded-3xl border flex flex-col items-start text-left transition-all duration-300 group ${
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
                              : {
                                  borderColor: "#f3f4f6",
                                }
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
                            className="font-black text-lg transition-colors mt-1"
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
