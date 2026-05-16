"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Copy,
  CheckCircle2,
  Wand2,
  Landmark,
  ChevronDown,
  X,
  User,
  MessageCircle,
  Hash,
  Clock,
} from "lucide-react";

// --- ข้อมูลธนาคาร พร้อมอิโมจิสีประจำธนาคาร ---
const BANK_OPTIONS = [
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "TTB",
    acc: "9219175719",
    color: "#f6821f",
    emoji: "🧡",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "9809449482",
    color: "#1E4598",
    emoji: "💙",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821566310",
    color: "#F0A500",
    emoji: "💛",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "6070572475",
    color: "#00AEEF",
    emoji: "🩵",
  },
  {
    owner: "พงศกร ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020337297038",
    color: "#EB008B",
    emoji: "🩷",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "ไทยพาณิชย์",
    acc: "6152349291",
    color: "#4E2A84",
    emoji: "💜",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "6070572467",
    color: "#00AEEF",
    emoji: "🩵",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821527017",
    color: "#F0A500",
    emoji: "💛",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กสิกร",
    acc: "0141543237",
    color: "#00A950",
    emoji: "💚",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "TTB",
    acc: "6952049879",
    color: "#f6821f",
    emoji: "🧡",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020296778762",
    color: "#EB008B",
    emoji: "🩷",
  },
  {
    owner: "นายธวัช ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "9774355938",
    color: "#1E4598",
    emoji: "💙",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงศรี",
    acc: "0821527025",
    color: "#F0A500",
    emoji: "💛",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ออมสิน",
    acc: "020425621834",
    color: "#EB008B",
    emoji: "🩷",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงเทพ",
    acc: "6590164049",
    color: "#1E4598",
    emoji: "💙",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ธกส.",
    acc: "020233790285",
    color: "#00572F",
    emoji: "💚",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กสิกร",
    acc: "2782464313",
    color: "#00A950",
    emoji: "💚",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "กรุงไทย",
    acc: "1153038803",
    color: "#00AEEF",
    emoji: "🩵",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "ไทยพาณิชย์",
    acc: "7332395238",
    color: "#4E2A84",
    emoji: "💜",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "เกียรตินาคิน",
    acc: "2031489700",
    color: "#7C2367",
    emoji: "❤️",
  },
  {
    owner: "พันธ์ทิพย์ ศรีษเกตุ",
    bank: "อาคารสงเคราะห์",
    acc: "001910308777",
    color: "#F37021",
    emoji: "🧡",
  },
  {
    owner: "นันทินี ทองสุด",
    bank: "กสิกร",
    acc: "1972871156",
    color: "#00A950",
    emoji: "💚",
  },
];

export default function ScheduleGeneratorPage() {
  const [bankIndex, setBankIndex] = useState(0);
  const [installments, setInstallments] = useState(10);
  const [interval, setInterval] = useState(7);
  const [intervalType, setIntervalType] = useState("day");
  const [startDate, setStartDate] = useState("");
  const [resultText, setResultText] = useState("");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(today);
  }, []);

  // 🌟 ฟังก์ชันคำนวณข้อความ (อัปเกรดความฉลาดในการจัดช่องว่าง)
  const generateSchedule = () => {
    const total = Number(installments) || 10;
    const amount = intervalType === "day" ? Number(interval) || 1 : 1;

    if (!startDate) return alert("กรุณาเลือกวันที่เริ่มงวดแรก");

    // โชว์คำว่า "รายเดือน" หรือ "ราย X วัน"
    const typeLabel = intervalType === "day" ? `ราย ${amount} วัน` : "รายเดือน";
    let output = `✨วง\nผ่อน บาท\nจำนวน ${total} งวด\n${typeLabel}\n\n`;

    let currentDate = new Date(startDate);

    for (let i = 1; i <= total; i++) {
      const d = String(currentDate.getDate()).padStart(2, "0");
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const y = (currentDate.getFullYear() + 543).toString().slice(-2);

      // 🌟 ท่าไม้ตายแก้บรรทัดเบี้ยวใน LINE/Messenger:
      // ใช้ "Figure Space" (\u2007) ซึ่งเป็นช่องว่างที่มีความกว้าง "เท่ากับตัวเลข 1 ตัวเป๊ะๆ"
      // มาเติมหน้าเลข 1-9 เพื่อให้ความกว้างของคำว่า "งวดที่ 9" เท่ากับ "งวดที่ 10" พอดี
      const numPad = i < 10 ? `\u2007${i}` : `${i}`;

      // 🌟 เพิ่มระยะห่างระหว่างจุด (.) กับ วันที่ อีก 3-4 เคาะ ตามที่บอสสั่ง
      const spacing = "           "; // 11 เคาะคงที่ (เพราะความกว้าง numPad เท่ากันหมดแล้ว)

      output += `งวดที่ ${numPad}.${spacing}${d}/${m}/${y}\n`;

      if (intervalType === "day") {
        currentDate.setDate(currentDate.getDate() + amount);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1); // บวกรอบละ 1 เดือน
      }
    }

    const selectedBank = BANK_OPTIONS[bankIndex];
    if (selectedBank) {
      output += `\n\n${selectedBank.emoji}${selectedBank.bank}${selectedBank.emoji}\n`;
      output += `เลขที่บัญชี ${selectedBank.acc}\n`;
      output += `ชื่อบัญชี  ${selectedBank.owner}\n`;
    }

    output += `\n\n⏰ส่งยอดก่อน 18:00 น.ช้าปรับชั่วโมงละ 100\nแม่จุ๊บใจดี อยู่กันแบบเพื่อนนะคะ รักษาเครดิตตัวเองกันด้วยน๊า💕`;

    setResultText(output);
  };

  const copyToClipboard = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  const shareToLine = () => {
    if (!resultText) return alert("กรุณาสร้างตารางก่อนแชร์ครับ");
    window.open(
      `https://line.me/R/msg/text/?${encodeURIComponent(resultText)}`,
      "_blank",
    );
  };

  const selectedBankInfo = BANK_OPTIONS[bankIndex] || BANK_OPTIONS[0];

  const groupedBanks = BANK_OPTIONS.reduce((acc, bank, index) => {
    if (!acc[bank.owner]) acc[bank.owner] = [];
    acc[bank.owner].push({ ...bank, index });
    return acc;
  }, {});

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-32 font-sans">
      {/* 🌟 Header */}
      <div className="bg-white px-5 py-4 shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <h1 className="text-xl font-black text-gray-800 tracking-tight flex items-center justify-center gap-2">
          <Wand2 className="w-6 h-6 text-orange-500" /> รันงวด
        </h1>
      </div>

      <div className="px-4 mt-6 max-w-md mx-auto animate-in fade-in duration-500">
        {/* 🌟 Unified Settings Card */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* 1. บัญชีรับโอน */}
          <div
            onClick={() => setIsBankModalOpen(true)}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${selectedBankInfo.color}15` }}
              >
                {selectedBankInfo.emoji}
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                  บัญชีรับโอน
                </p>
                <p className="text-sm font-black text-gray-800 leading-tight">
                  <span style={{ color: selectedBankInfo.color }}>
                    {selectedBankInfo.owner}
                  </span>
                </p>
                <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                  {selectedBankInfo.bank} • {selectedBankInfo.acc}
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
              <ChevronDown className="text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* 2. ปุ่มสลับ รายวัน/รายเดือน */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-xl shadow-inner">
              <button
                onClick={() => setIntervalType("day")}
                className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  intervalType === "day"
                    ? "bg-white text-orange-500 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                ส่งรายวัน
              </button>
              <button
                onClick={() => setIntervalType("month")}
                className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                  intervalType === "month"
                    ? "bg-white text-orange-500 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                ส่งรายเดือน
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* จำนวนงวด */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-transparent focus-within:border-orange-500 transition-all">
                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-1">
                  <Hash className="w-3 h-3 text-orange-400" /> จำนวนงวด
                </label>
                <input
                  type="number"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full bg-transparent font-black text-gray-800 text-2xl outline-none transition-all placeholder:text-gray-200 px-1"
                  placeholder="0"
                />
              </div>

              {/* ห่างกี่วัน (ซ่อนเมื่อเลือกระบบรายเดือน) */}
              {intervalType === "day" ? (
                <div className="bg-orange-50/50 p-3.5 rounded-xl border border-transparent focus-within:border-orange-500 transition-all animate-in zoom-in-95 duration-200">
                  <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-1">
                    <Clock className="w-3 h-3 text-orange-500" /> ห่างกี่วัน
                  </label>
                  <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full bg-transparent font-black text-orange-600 text-2xl outline-none transition-all placeholder:text-gray-200 px-1"
                    placeholder="0"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-center animate-in zoom-in-95 duration-200 opacity-80">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> รายเดือน
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. วันที่เริ่มงวดแรก */}
          <div className="p-4 flex items-center bg-gray-50/50">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 mr-3">
              <CalendarDays className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-0.5">
                วันที่เริ่มงวดแรก
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent font-bold text-gray-800 text-sm outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 🌟 ปุ่มเสกตาราง */}
        <button
          onClick={generateSchedule}
          className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 flex justify-center items-center gap-2 text-sm uppercase tracking-widest transition-all mb-6"
        >
          <Wand2 className="w-5 h-5 text-orange-500" /> สร้างตาราง
        </button>

        {/* 🌟 Output Note Pad (กล่องแสดงผลสไตล์สมุดโน้ต) */}
        <div className="relative">
          <div className="absolute top-0 left-4 px-3 py-1 -mt-3 bg-orange-100 border border-orange-200 rounded-lg shadow-sm z-10 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
              พรีวิวข้อความ (แก้ไขได้)
            </span>
          </div>
          <textarea
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            spellCheck="false"
            placeholder="ผลลัพธ์ตารางจะแสดงที่นี่..."
            className="w-full bg-[#FFFAF5] p-6 pt-7 rounded-[2rem] border border-orange-100/50 text-gray-700 font-mono text-sm leading-[1.8] h-[350px] outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner custom-scrollbar"
          ></textarea>
        </div>
      </div>

      {/* 🌟 Floating Action Bar (ปุ่มคัดลอก/ส่งไลน์) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-4 rounded-2xl shadow-sm flex justify-center items-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            <Copy className="w-4 h-4" /> คัดลอก
          </button>
          <button
            onClick={shareToLine}
            className="flex-1 bg-[#06C755] hover:bg-[#05b34c] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#06C755]/20 flex justify-center items-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            <MessageCircle className="w-4 h-4 fill-current" /> ส่ง LINE
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-2 backdrop-blur-md font-bold transition-all duration-300 ${
          showToast
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <CheckCircle2 className="text-green-400 w-5 h-5" />
        คัดลอกลงคลิปบอร์ดแล้ว!
      </div>

      {/* Modal เลือกธนาคาร */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsBankModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50 bg-gray-50/80">
              <div>
                <h2 className="text-xl font-black text-gray-800">
                  เลือกบัญชีรับโอน
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  คลิกเลือกบัญชีที่ต้องการแสดงในข้อความ
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="p-2.5 bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-xl shadow-sm border border-gray-100 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-6 flex-1 bg-gray-50/30 custom-scrollbar">
              {Object.entries(groupedBanks).map(([owner, banks]) => (
                <div
                  key={owner}
                  className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-50 mb-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-500" />
                    </div>
                    <h4 className="text-sm font-black text-gray-800">
                      {owner}
                    </h4>
                  </div>

                  <div className="space-y-1">
                    {banks.map((b) => {
                      const isSelected = bankIndex === b.index;
                      return (
                        <button
                          key={b.index}
                          onClick={() => {
                            setBankIndex(b.index);
                            setIsBankModalOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-gray-50 border-gray-300 shadow-sm"
                              : "border-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-2xl w-10 text-center drop-shadow-sm">
                              {b.emoji}
                            </div>
                            <div className="text-left">
                              <p className="font-black text-gray-800 text-sm leading-tight">
                                {b.bank}
                              </p>
                              <p className="text-[11px] font-bold text-gray-400 mt-0.5 tracking-widest">
                                {b.acc}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-gray-800" />
                          )}
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
