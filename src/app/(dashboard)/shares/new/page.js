"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import {
  Save,
  Users,
  Calendar,
  Clock,
  Loader2,
  Search,
  User,
  Crown,
  ChevronRight,
  HandCoins,
  PlusCircle,
  CheckCircle2,
  X,
  Landmark,
  ChevronDown,
  Calculator,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ข้อมูลบัญชีธนาคาร (ใช้ร่วมกันทั้งระบบกู้และแชร์)
const RAW_BANK_ACCOUNTS = [
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

const ADMIN_BANK_ACCOUNTS = RAW_BANK_ACCOUNTS.map((b, idx) => ({
  id: `bank-${idx}`,
  accountName: b.owner,
  bankName: b.bank,
  accountNo: b.acc,
  hexColor: b.color,
}));

export default function NewSharePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState([]);

  // ==========================================
  // STATE: กติกาของวงแชร์
  // ==========================================
  const [isCustomFreq, setIsCustomFreq] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    groupName: "",
    totalHands: 21,
    installmentAmount: "", // ให้ผู้ใช้กรอกเอง
    poolAmount: "", // ให้ผู้ใช้กรอกเอง
    startDate: new Date().toISOString().split("T")[0],
    frequency: 7,
    frequencyType: "day",
    bankAccountId: "",
    bankAccountName: "",
    bankName: "",
    bankAccountNo: "",
  });

  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  // ==========================================
  // STATE: การจัดสรรรายมือ (Hands)
  // ==========================================
  const [hands, setHands] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectingHandIndex, setSelectingHandIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // ปรับจำนวนมืออัตโนมัติตามที่กรอก
  useEffect(() => {
    const numHands = Number(shareConfig.totalHands) || 0;

    setHands((prev) => {
      const newHands = [...prev];
      if (newHands.length < numHands) {
        for (let i = newHands.length; i < numHands; i++) {
          newHands.push({
            handNumber: i + 1,
            customerId: "",
            customerName: "",
          });
        }
      } else if (newHands.length > numHands) {
        newHands.splice(numHands);
      }
      return newHands;
    });
  }, [shareConfig.totalHands]);

  const handleConfigChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    if (type === "number") finalValue = value === "" ? "" : Number(value);
    setShareConfig((prev) => ({ ...prev, [name]: finalValue }));
  };

  const setFreq = (val, type = "day") => {
    setIsCustomFreq(false);
    setShareConfig((prev) => ({
      ...prev,
      frequency: val,
      frequencyType: type,
    }));
  };

  const formatCustomerName = (c) => {
    if (c.nickname && c.name) return `${c.nickname} (${c.name})`;
    return c.nickname || c.name || "";
  };

  const openSelectCustomer = (index) => {
    setSelectingHandIndex(index);
    setSearchQuery("");
    setIsCustomerModalOpen(true);
  };

  const selectCustomerForHand = (customer) => {
    if (selectingHandIndex === null) return;
    setHands((prev) => {
      const updated = [...prev];
      updated[selectingHandIndex] = {
        ...updated[selectingHandIndex],
        customerId: customer.id,
        customerName: formatCustomerName(customer),
      };
      return updated;
    });
    setIsCustomerModalOpen(false);
    setSelectingHandIndex(null);
  };

  const filteredCustomers = customersList.filter((c) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      (c.name?.toLowerCase() || "").includes(s) ||
      (c.nickname?.toLowerCase() || "").includes(s) ||
      (c.code?.toLowerCase() || "").includes(s)
    );
  });

  const handleSelectBank = (bank) => {
    setShareConfig((prev) => ({
      ...prev,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      bankName: bank.bankName,
      bankAccountNo: bank.accountNo,
    }));
    setIsBankDropdownOpen(false);
  };

  // คำนวณตัวเลขแบบ Real-time
  const calculatedTotalCollected =
    (Number(shareConfig.installmentAmount) || 0) *
    (Number(shareConfig.totalHands) || 0);
  const calculatedAdminProfit =
    calculatedTotalCollected - (Number(shareConfig.poolAmount) || 0);

  const handleSaveShareGroup = async () => {
    if (!shareConfig.groupName.trim()) return alert("กรุณาระบุชื่อวงแชร์");
    if (shareConfig.totalHands <= 0) return alert("ระบุจำนวนมือไม่ถูกต้อง");
    if (shareConfig.installmentAmount <= 0)
      return alert("ระบุยอดส่งต่องวดไม่ถูกต้อง");
    if (shareConfig.poolAmount <= 0) return alert("ระบุยอดกองกลางไม่ถูกต้อง");
    if (shareConfig.frequency <= 0) return alert("ระบุรอบการส่งเงินไม่ถูกต้อง");
    if (!shareConfig.bankAccountId)
      return alert("กรุณาเลือกบัญชีธนาคารรับเงิน");

    const missingHand = hands.findIndex((h) => !h.customerId);
    if (missingHand !== -1) {
      return alert(
        `กรุณาเลือกสมาชิกให้ครบทุกมือ (ขาดมือที่ ${missingHand + 1})`,
      );
    }

    if (
      !window.confirm(
        `ยืนยันการสร้างวงแชร์ "${shareConfig.groupName}" ใช่หรือไม่?\n\nสรุปข้อมูล:\n- จำนวน ${shareConfig.totalHands} มือ\n- ยอดเก็บรวม ฿${calculatedTotalCollected.toLocaleString()}\n- กองกลาง ฿${shareConfig.poolAmount.toLocaleString()}\n- กำไรวง ฿${calculatedAdminProfit.toLocaleString()}`,
      )
    )
      return;

    setLoading(true);
    try {
      const batch = writeBatch(db);

      const shareRef = doc(collection(db, "shares"));
      batch.set(shareRef, {
        name: shareConfig.groupName.trim(),
        totalHands: Number(shareConfig.totalHands),
        installmentAmount: Number(shareConfig.installmentAmount),
        poolAmount: Number(shareConfig.poolAmount),
        startDate: shareConfig.startDate,
        frequency: Number(shareConfig.frequency),
        frequencyType: shareConfig.frequencyType,
        bankAccountId: shareConfig.bankAccountId,
        bankAccountName: shareConfig.bankAccountName,
        bankName: shareConfig.bankName,
        bankAccountNo: shareConfig.bankAccountNo,
        currentPeriod: 1,
        status: "active",
        createdAt: serverTimestamp(),
      });

      const customerHandsCount = {};

      hands.forEach((hand) => {
        const handRef = doc(collection(db, "share_hands"));
        const isTaoShare = hand.handNumber === 1;

        batch.set(handRef, {
          shareId: shareRef.id,
          shareName: shareConfig.groupName.trim(),
          handNumber: hand.handNumber,
          customerId: hand.customerId,
          customerName: hand.customerName,
          status: isTaoShare ? "dead" : "alive",
          wonAtPeriod: isTaoShare ? 1 : null,
          totalPaid: 0,
          createdAt: serverTimestamp(),
        });

        if (!customerHandsCount[hand.customerId])
          customerHandsCount[hand.customerId] = 0;
        customerHandsCount[hand.customerId]++;
      });

      await batch.commit();
      alert("สร้างวงแชร์และจัดสรรมือสำเร็จ!");
      router.push("/shares");
    } catch (error) {
      console.error("Error creating share group:", error);
      alert("เกิดข้อผิดพลาดในการสร้างวงแชร์");
    } finally {
      setLoading(false);
    }
  };

  const selectedBankData = ADMIN_BANK_ACCOUNTS.find(
    (b) => b.id === shareConfig.bankAccountId,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 bg-gray-50/30 min-h-screen">
      {/* --- Header --- */}
      <div className="pt-8 pb-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Link
            href="/shares"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            เปิดวงแชร์ใหม่
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            กำหนดข้อมูลวงแชร์และจัดสรรรายชื่อลูกแชร์
          </p>
        </div>

        <button
          onClick={handleSaveShareGroup}
          disabled={loading}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          บันทึกข้อมูลวงแชร์
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* --- ฝั่งซ้าย: ข้อมูลวงแชร์ --- */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
              ข้อมูลกติกาแชร์
            </h3>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  ชื่อวงแชร์ <span className="text-red-500">*</span>
                </label>
                <input
                  name="groupName"
                  type="text"
                  value={shareConfig.groupName}
                  onChange={handleConfigChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-semibold text-gray-900 transition-all"
                  placeholder="เช่น วง 6000 ส่ง 315"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                    จำนวนมือทั้งหมด
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="totalHands"
                      type="number"
                      value={shareConfig.totalHands}
                      onChange={handleConfigChange}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-semibold text-gray-900 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1.5 block">
                    ส่งงวดละ (บาท)
                  </label>
                  <input
                    name="installmentAmount"
                    type="number"
                    value={shareConfig.installmentAmount}
                    onChange={handleConfigChange}
                    placeholder="เช่น 315"
                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-bold text-blue-700 transition-all text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  กองกลาง / ยอดเปียได้ (บาท)
                </label>
                <input
                  name="poolAmount"
                  type="number"
                  value={shareConfig.poolAmount}
                  onChange={handleConfigChange}
                  placeholder="เช่น 6000"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-bold text-gray-900 transition-all text-center text-lg"
                />
              </div>

              {/* 🧮 ส่วนสรุปการคำนวณกำไร */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    สรุปการคำนวณวงแชร์
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">
                      ยอดเก็บรวม ({shareConfig.totalHands} มือ):
                    </span>
                    <span className="font-bold text-gray-800">
                      ฿{calculatedTotalCollected.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">
                      หักจ่ายผู้ชนะ (กองกลาง):
                    </span>
                    <span className="font-bold text-gray-800">
                      - ฿{Number(shareConfig.poolAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                    ส่วนต่าง (กำไรท้าวแชร์)
                  </span>
                  <span className="text-lg font-black text-orange-600">
                    ฿
                    {calculatedAdminProfit > 0
                      ? calculatedAdminProfit.toLocaleString()
                      : 0}
                  </span>
                </div>
              </div>

              {/* บัญชีธนาคาร */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  บัญชีธนาคารที่รับเงินวงนี้
                </label>
                <div className="relative">
                  <div
                    onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                    className={`w-full bg-white border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      !selectedBankData
                        ? "border-gray-300 hover:border-gray-400"
                        : ""
                    }`}
                    style={
                      selectedBankData
                        ? { borderColor: `${selectedBankData.hexColor}66` }
                        : {}
                    }
                  >
                    {selectedBankData ? (
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${selectedBankData.hexColor}1A`,
                          }}
                        >
                          <Landmark
                            className="w-5 h-5"
                            style={{ color: selectedBankData.hexColor }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {selectedBankData.accountName}
                          </p>
                          <p
                            className="text-xs font-semibold mt-0.5"
                            style={{ color: selectedBankData.hexColor }}
                          >
                            {selectedBankData.bankName}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                          <Landmark className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="font-medium text-gray-400 text-sm">
                          คลิกเพื่อเลือกบัญชี...
                        </span>
                      </div>
                    )}
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${isBankDropdownOpen ? "rotate-180" : ""}`}
                      style={
                        selectedBankData
                          ? { color: selectedBankData.hexColor }
                          : { color: "#9CA3AF" }
                      }
                    />
                  </div>

                  {isBankDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-64 overflow-y-auto custom-scrollbar">
                      {ADMIN_BANK_ACCOUNTS.map((bank) => (
                        <div
                          key={bank.id}
                          onClick={() => handleSelectBank(bank)}
                          className="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${bank.hexColor}1A` }}
                          >
                            <Landmark
                              className="w-4 h-4"
                              style={{ color: bank.hexColor }}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {bank.accountName}
                            </p>
                            <p className="text-xs font-medium text-gray-500 mt-0.5 flex gap-1.5">
                              <span style={{ color: bank.hexColor }}>
                                {bank.bankName}
                              </span>
                              <span>{bank.accountNo}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-600" /> รอบการส่งเงิน
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                        !isCustomFreq &&
                        shareConfig.frequency === f.val &&
                        shareConfig.frequencyType === f.type
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomFreq(true);
                    setShareConfig((p) => ({ ...p, frequencyType: "day" }));
                  }}
                  className={`w-full mt-2 py-2 rounded-lg text-xs font-semibold transition-all border ${
                    isCustomFreq
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  กำหนดวันเอง
                </button>
                {isCustomFreq && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      ส่งทุกๆ
                    </span>
                    <input
                      type="number"
                      name="frequency"
                      value={shareConfig.frequency}
                      onChange={handleConfigChange}
                      className="w-20 px-3 py-1.5 text-center bg-white border border-gray-300 rounded-lg outline-none font-bold text-blue-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                    <span className="text-xs font-medium text-gray-500">
                      วัน
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  วันที่เริ่มวงแชร์งวดแรก
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="startDate"
                    type="date"
                    value={shareConfig.startDate}
                    onChange={handleConfigChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl outline-none font-semibold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ฝั่งขวา: จัดสรรรายมือ --- */}
        <div className="xl:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-fit">
            <div className="p-5 md:p-6 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                  จัดสรรมือแชร์
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-1 ml-4">
                  คลิกเพื่อเลือกลูกค้าลงในตำแหน่งมือต่างๆ
                </p>
              </div>
              <span className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-xs shadow-sm">
                {hands.filter((h) => h.customerId).length} /{" "}
                {shareConfig.totalHands} มือ
              </span>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto bg-gray-50/30 custom-scrollbar">
              {hands.map((hand, index) => {
                const isTaoShare = index === 0;
                const hasUser = !!hand.customerId;

                return (
                  <div
                    key={index}
                    onClick={() => openSelectCustomer(index)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group bg-white shadow-sm ${
                      isTaoShare
                        ? hasUser
                          ? "border-orange-300 bg-orange-50/50"
                          : "border-orange-200 hover:border-orange-400"
                        : hasUser
                          ? "border-blue-300 bg-blue-50/30"
                          : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          isTaoShare
                            ? "bg-orange-100 text-orange-600"
                            : hasUser
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {hand.handNumber}
                      </div>

                      <div className="truncate">
                        {isTaoShare && (
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide flex items-center gap-1">
                            <Crown className="w-3 h-3" /> ท้าวแชร์ (รับงวดแรก)
                          </p>
                        )}
                        {!isTaoShare && hasUser && (
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                            ลูกแชร์มือที่ {hand.handNumber}
                          </p>
                        )}

                        <p
                          className={`font-semibold text-sm truncate mt-0.5 ${hasUser ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {hasUser ? hand.customerName : "คลิกเลือกสมาชิก..."}
                        </p>
                      </div>
                    </div>

                    {!hasUser && (
                      <PlusCircle
                        className={`w-5 h-5 transition-colors ${isTaoShare ? "text-orange-300 group-hover:text-orange-500" : "text-gray-300 group-hover:text-blue-500"}`}
                      />
                    )}
                    {hasUser && !isTaoShare && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- Modal เลือกสมาชิก --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCustomerModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> เลือกลูกค้ามือที่{" "}
                  {selectingHandIndex !== null ? selectingHandIndex + 1 : ""}
                </h2>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-2 bg-white hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-medium transition-all text-sm"
                  placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white custom-scrollbar">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-500">
                    ไม่พบรายชื่อลูกค้านี้
                  </p>
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectCustomerForHand(c)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50/30 shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          {c.code && (
                            <span className="text-blue-600 mr-1">
                              [{c.code}]
                            </span>
                          )}
                          {formatCustomerName(c)}
                        </p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                          โทร: {c.phone || "-"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
