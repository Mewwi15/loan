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
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewSharePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState([]);

  // ==========================================
  // 🟢 STATE: กติกาของวงแชร์
  // ==========================================
  const [isCustomFreq, setIsCustomFreq] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    groupName: "",
    totalHands: 21, // จำนวนมือทั้งหมด
    installmentAmount: 1000, // ส่งมือละกี่บาท
    poolAmount: 21000, // เงินกองกลางรวม
    startDate: new Date().toISOString().split("T")[0],
    frequency: 7, // ส่งทุกๆ กี่วัน
    frequencyType: "day",
  });

  // ==========================================
  // 🟢 STATE: การจัดสรรรายมือ (Hands)
  // ==========================================
  const [hands, setHands] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectingHandIndex, setSelectingHandIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ดึงรายชื่อลูกค้าตอนโหลดหน้าเว็บ
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

  // สร้าง/ปรับขนาดกล่องรายมืออัตโนมัติตามจำนวนมือ (totalHands)
  useEffect(() => {
    const numHands = Number(shareConfig.totalHands) || 0;
    setHands((prev) => {
      const newHands = [...prev];
      if (newHands.length < numHands) {
        // เพิ่มมือให้ครบ
        for (let i = newHands.length; i < numHands; i++) {
          newHands.push({
            handNumber: i + 1,
            customerId: "",
            customerName: "",
          });
        }
      } else if (newHands.length > numHands) {
        // ตัดมือส่วนเกินทิ้ง
        newHands.splice(numHands);
      }
      return newHands;
    });

    // คำนวณเงินกองกลางให้อัตโนมัติ (มือละ x จำนวนมือ)
    if (shareConfig.installmentAmount > 0 && numHands > 0) {
      setShareConfig((prev) => ({
        ...prev,
        poolAmount: prev.installmentAmount * numHands,
      }));
    }
  }, [shareConfig.totalHands, shareConfig.installmentAmount]);

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

  // เปิด Modal เลือกคนเข้ามือที่ถูกคลิก
  const openSelectCustomer = (index) => {
    setSelectingHandIndex(index);
    setSearchQuery("");
    setIsCustomerModalOpen(true);
  };

  // เลือกคนเข้ามือ
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

  // บันทึกวงแชร์ลง Firebase
  const handleSaveShareGroup = async () => {
    if (!shareConfig.groupName.trim()) return alert("กรุณาระบุชื่อวงแชร์");
    if (shareConfig.totalHands <= 0) return alert("ระบุจำนวนมือไม่ถูกต้อง");
    if (shareConfig.installmentAmount <= 0)
      return alert("ระบุยอดส่งต่องวดไม่ถูกต้อง");
    if (shareConfig.frequency <= 0) return alert("ระบุรอบการส่งเงินไม่ถูกต้อง");

    // ตรวจสอบว่าเลือกคนครบทุกมือหรือยัง
    const missingHand = hands.findIndex((h) => !h.customerId);
    if (missingHand !== -1) {
      return alert(
        `❌ กรุณาเลือกสมาชิกให้ครบทุกมือ (ขาดมือที่ ${missingHand + 1})`,
      );
    }

    if (
      !window.confirm(
        `ยืนยันการสร้างวงแชร์ "${shareConfig.groupName}"\nจำนวน ${shareConfig.totalHands} มือ (กองกลาง ฿${shareConfig.poolAmount.toLocaleString()}) ใช่หรือไม่?`,
      )
    )
      return;

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. สร้างเอกสารวงแชร์หลักใน Collection 'shares'
      const shareRef = doc(collection(db, "shares"));
      batch.set(shareRef, {
        name: shareConfig.groupName.trim(),
        totalHands: Number(shareConfig.totalHands),
        installmentAmount: Number(shareConfig.installmentAmount),
        poolAmount: Number(shareConfig.poolAmount),
        startDate: shareConfig.startDate,
        frequency: Number(shareConfig.frequency),
        frequencyType: shareConfig.frequencyType,
        currentPeriod: 1, // เริ่มงวดที่ 1
        status: "active",
        createdAt: serverTimestamp(),
      });

      // ตัวแปรไว้นับว่าลูกค้าคนไหนถือแชร์วงนี้กี่มือ เพื่อไปบวกหน้าโปรไฟล์
      const customerHandsCount = {};

      // 2. สร้างเอกสารรายมือใน Collection 'share_hands'
      hands.forEach((hand) => {
        const handRef = doc(collection(db, "share_hands"));

        // มือที่ 1 คือท้าวแชร์ -> ชนะประมูลไปแล้วในงวดที่ 1 (สถานะ dead)
        const isTaoShare = hand.handNumber === 1;

        batch.set(handRef, {
          shareId: shareRef.id,
          shareName: shareConfig.groupName.trim(),
          handNumber: hand.handNumber,
          customerId: hand.customerId,
          customerName: hand.customerName,
          status: isTaoShare ? "dead" : "alive", // ท้าวแชร์มือตายตั้งแต่เริ่ม / ที่เหลือมือเป็น
          wonAtPeriod: isTaoShare ? 1 : null, // ท้าวแชร์รับงวดแรก
          totalPaid: 0, // ยอดส่งสะสม (อัปเดตทุกครั้งที่จ่ายรายงวด)
          createdAt: serverTimestamp(),
        });

        // นับสถิติรายบุคคล
        if (!customerHandsCount[hand.customerId])
          customerHandsCount[hand.customerId] = 0;
        customerHandsCount[hand.customerId]++;
      });

      // 3. อัปเดตข้อมูลลูกค้า (เพิ่ม activeShares ตามจำนวนมือที่ถือ)
      Object.keys(customerHandsCount).forEach((custId) => {
        const custRef = doc(db, "customers", custId);
        batch.update(custRef, {
          // เพิ่มฟิลด์ activeShares ถ้ายังไม่มี (ให้ Firebase รู้ว่าเป็นตัวเลข)
          activeShares: increment(customerHandsCount[custId]),
        });
      });

      await batch.commit();
      alert("✅ สร้างวงแชร์และจัดสรรมือสำเร็จ!");
      router.push("/shares"); // สมมติว่าหน้าศูนย์บัญชาการแชร์รวมคือ /shares
    } catch (error) {
      console.error("Error creating share group:", error);
      alert("เกิดข้อผิดพลาดในการสร้างวงแชร์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 pt-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <HandCoins className="w-8 h-8 text-indigo-500" /> เปิดวงแชร์ใหม่
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
            ระบบบริหารวงแชร์จับฉลาก / ดอกตามตกลง
          </p>
        </div>

        <button
          onClick={handleSaveShareGroup}
          disabled={loading}
          className="w-full sm:w-auto bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-1"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกวงแชร์
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================== */}
        {/* 🟡 ฝั่งซ้าย: กติกาของวง (Share Config) */}
        {/* ========================================== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-6">
            <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm uppercase tracking-widest border-l-4 border-indigo-500 pl-4">
              1. กติกาของวงแชร์
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                  ชื่อวงแชร์ *
                </label>
                <input
                  name="groupName"
                  type="text"
                  value={shareConfig.groupName}
                  onChange={handleConfigChange}
                  className="w-full mt-1 px-5 py-4 bg-indigo-50/30 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 font-black text-indigo-600 text-lg transition-all placeholder:text-indigo-200"
                  placeholder="เช่น วงแม่เบญ 21 มือ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    จำนวนมือทั้งหมด
                  </label>
                  <div className="relative mt-1">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      name="totalHands"
                      type="number"
                      value={shareConfig.totalHands}
                      onChange={handleConfigChange}
                      className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 font-black text-gray-700 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                    ส่งงวดละ (บาท)
                  </label>
                  <input
                    name="installmentAmount"
                    type="number"
                    value={shareConfig.installmentAmount}
                    onChange={handleConfigChange}
                    className="w-full mt-1 px-4 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 font-black text-gray-700 transition-all text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-black uppercase tracking-widest ml-1 text-gray-400">
                  เงินกองกลางรวม (บาท)
                </label>
                <input
                  name="poolAmount"
                  type="number"
                  value={shareConfig.poolAmount}
                  onChange={handleConfigChange}
                  className="w-full mt-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 font-black text-2xl text-indigo-500 transition-all text-center"
                />
              </div>

              <div className="p-4 md:p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-indigo-500" /> รอบการส่งเงิน
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
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border ${
                        !isCustomFreq &&
                        shareConfig.frequency === f.val &&
                        shareConfig.frequencyType === f.type
                          ? "bg-[#1F2335] border-[#1F2335] text-white shadow-lg"
                          : "bg-white border-gray-200 text-gray-400 hover:border-indigo-200"
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
                  className={`w-full mt-2 py-3 rounded-xl text-[10px] font-black transition-all border ${
                    isCustomFreq
                      ? "bg-indigo-500 border-indigo-500 text-white shadow-lg"
                      : "bg-white border-gray-200 text-gray-400 hover:border-indigo-200"
                  }`}
                >
                  กำหนดวันเอง
                </button>
                {isCustomFreq && (
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      ส่งทุกๆ
                    </span>
                    <input
                      type="number"
                      name="frequency"
                      value={shareConfig.frequency}
                      onChange={handleConfigChange}
                      className="w-24 px-4 py-2 text-center bg-white border border-gray-200 rounded-xl outline-none font-black text-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      วัน
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  วันที่เริ่มวงแชร์งวดแรก
                </label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    name="startDate"
                    type="date"
                    value={shareConfig.startDate}
                    onChange={handleConfigChange}
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none font-black text-gray-700 focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 🟡 ฝั่งขวา: จัดสรรรายมือ (Hands Allocation) */}
        {/* ========================================== */}
        <div className="lg:col-span-7 z-0">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col h-fit">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center rounded-t-[2.5rem]">
              <div>
                <h3 className="font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-widest border-l-4 border-indigo-500 pl-4">
                  2. จัดสรรมือแชร์
                </h3>
                <p className="text-[10px] font-bold text-gray-400 mt-1 ml-5 uppercase tracking-widest">
                  คลิกเพื่อเลือกผู้ถือมือ (1 คนถือได้หลายมือ)
                </p>
              </div>
              <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest">
                {hands.filter((h) => h.customerId).length} /{" "}
                {shareConfig.totalHands} มือ
              </span>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto bg-gray-50/30">
              {hands.map((hand, index) => {
                const isTaoShare = index === 0; // มือที่ 1 คือท้าวแชร์
                const hasUser = !!hand.customerId;

                return (
                  <div
                    key={index}
                    onClick={() => openSelectCustomer(index)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                      isTaoShare
                        ? hasUser
                          ? "border-amber-400 bg-amber-50"
                          : "border-amber-200 bg-white hover:border-amber-400"
                        : hasUser
                          ? "border-indigo-500 bg-indigo-50/30"
                          : "border-dashed border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs shadow-sm ${
                          isTaoShare
                            ? "bg-amber-400 text-white"
                            : hasUser
                              ? "bg-indigo-500 text-white"
                              : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {hand.handNumber}
                      </div>

                      <div className="truncate">
                        {isTaoShare && (
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                            <Crown className="w-3 h-3" /> ท้าวแชร์ (รับงวดแรก)
                          </p>
                        )}
                        {!isTaoShare && hasUser && (
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                            ลูกแชร์มือที่ {hand.handNumber}
                          </p>
                        )}

                        <p
                          className={`font-bold text-sm truncate mt-0.5 ${hasUser ? "text-gray-800" : "text-gray-400"}`}
                        >
                          {hasUser ? hand.customerName : "คลิกเลือกสมาชิก..."}
                        </p>
                      </div>
                    </div>

                    {!hasUser && (
                      <PlusCircle
                        className={`w-5 h-5 transition-colors ${isTaoShare ? "text-amber-300 group-hover:text-amber-500" : "text-gray-300 group-hover:text-indigo-400"}`}
                      />
                    )}
                    {hasUser && !isTaoShare && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🌟 MODAL: เลือกสมาชิกสำหรับมือแชร์ */}
      {/* ========================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setIsCustomerModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 md:px-8 py-6 border-b border-gray-100 bg-gray-50/50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                  <User className="w-6 h-6 text-indigo-500" /> เลือกคนถือมือ{" "}
                  {selectingHandIndex !== null ? selectingHandIndex + 1 : ""}
                </h2>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-3 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 md:px-8 py-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-500 font-bold transition-all text-gray-700"
                  placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 bg-gray-50/30">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm font-bold text-gray-400">
                    ไม่พบรายชื่อลูกค้านี้
                  </p>
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectCustomerForHand(c)}
                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-transparent bg-white hover:border-indigo-200 shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-gray-800">
                          {c.code && (
                            <span className="text-indigo-500 mr-1">
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
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
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
