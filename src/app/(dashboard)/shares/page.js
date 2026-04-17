"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  where,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
  Users,
  PlusCircle,
  ArrowRight,
  Wallet,
  Target,
  Loader2,
  CalendarDays,
  HandCoins,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle2,
  Landmark,
  ChevronDown,
  Calendar,
  Calculator,
  Check,
} from "lucide-react";

// ==========================================
// 🌟 ข้อมูลบัญชีธนาคาร (ใช้ร่วมกัน)
// ==========================================
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

export default function SharesDashboardPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingShare, setEditingShare] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  const menuRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "shares"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const sharesData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setShares(sharesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching shares:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteShare = async (shareId, shareName) => {
    setActiveMenuId(null);

    const confirmMsg = `⚠️ คำเตือน: ยืนยันการลบวงแชร์ "${shareName}" ใช่หรือไม่?\n\n*ข้อมูลลูกแชร์และประวัติการจ่ายเงินทั้งหมดในวงนี้จะถูกลบทิ้งอย่างถาวร!`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "shares", shareId));

      const handsQuery = query(
        collection(db, "share_hands"),
        where("shareId", "==", shareId),
      );
      const handsSnap = await getDocs(handsQuery);
      handsSnap.forEach((handDoc) => {
        batch.delete(handDoc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error("Error deleting share:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingShare.name.trim()) return alert("กรุณาระบุชื่อวงแชร์");
    if (editingShare.installmentAmount <= 0)
      return alert("ระบุยอดส่งต่องวดไม่ถูกต้อง");
    if (editingShare.poolAmount <= 0) return alert("ระบุยอดกองกลางไม่ถูกต้อง");
    if (editingShare.frequency <= 0) return alert("ระบุรอบการส่งให้ถูกต้อง");
    if (!editingShare.bankAccountId)
      return alert("กรุณาเลือกบัญชีธนาคารรับเงิน");

    setIsProcessing(true);
    try {
      const shareRef = doc(db, "shares", editingShare.id);
      await updateDoc(shareRef, {
        name: editingShare.name.trim(),
        installmentAmount: Number(editingShare.installmentAmount),
        poolAmount: Number(editingShare.poolAmount),
        startDate: editingShare.startDate,
        frequency: Number(editingShare.frequency),
        frequencyType: editingShare.frequencyType,
        bankAccountId: editingShare.bankAccountId,
        bankAccountName: editingShare.bankAccountName,
        bankName: editingShare.bankName,
        bankAccountNo: editingShare.bankAccountNo,
      });

      // ถ้าเปลี่ยนชื่อวง ต้องไปแก้ชื่อใน share_hands ด้วย
      if (editingShare.originalName !== editingShare.name.trim()) {
        const batch = writeBatch(db);
        const handsQuery = query(
          collection(db, "share_hands"),
          where("shareId", "==", editingShare.id),
        );
        const handsSnap = await getDocs(handsQuery);
        handsSnap.forEach((handDoc) => {
          batch.update(handDoc.ref, { shareName: editingShare.name.trim() });
        });
        await batch.commit();
      }

      setEditingShare(null);
    } catch (error) {
      console.error("Error updating share:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกการแก้ไข");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (share) => {
    setActiveMenuId(null);
    setIsBankDropdownOpen(false);
    setEditingShare({
      id: share.id,
      name: share.name,
      originalName: share.name,
      totalHands: share.totalHands,
      installmentAmount: share.installmentAmount,
      poolAmount: share.poolAmount,
      startDate: share.startDate || new Date().toISOString().split("T")[0],
      frequency: share.frequency,
      frequencyType: share.frequencyType,
      bankAccountId: share.bankAccountId || "",
      bankAccountName: share.bankAccountName || "",
      bankName: share.bankName || "",
      bankAccountNo: share.bankAccountNo || "",
    });
  };

  const handleSelectBank = (bank) => {
    setEditingShare((prev) => ({
      ...prev,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      bankName: bank.bankName,
      bankAccountNo: bank.accountNo,
    }));
    setIsBankDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="font-bold text-xs uppercase tracking-widest">
          กำลังโหลดข้อมูลวงแชร์...
        </p>
      </div>
    );
  }

  const activeShares = shares.filter((s) => s.status === "active");
  const completedShares = shares.filter((s) => s.status === "completed");

  const selectedBankData = ADMIN_BANK_ACCOUNTS.find(
    (b) => b.id === editingShare?.bankAccountId,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 bg-gray-50/30 min-h-screen relative">
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="font-bold text-gray-800">กำลังประมวลผล...</p>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="pt-8 pb-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <HandCoins className="w-8 h-8 text-blue-600" /> แผงควบคุมวงแชร์
          </h1>
          <p className="text-sm font-semibold text-gray-500 mt-2">
            บริหารจัดการวงแชร์ทั้งหมดของคุณในที่เดียว
          </p>
        </div>

        <Link
          href="/shares/new"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          เปิดวงแชร์ใหม่
        </Link>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 tracking-wide mb-1">
              วงแชร์ที่กำลังเดิน
            </p>
            <p className="text-3xl font-black text-gray-900">
              {activeShares.length}{" "}
              <span className="text-sm font-semibold text-gray-500">วง</span>
            </p>
          </div>
        </div>
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 tracking-wide mb-1">
              ยอดกองกลางรวม (Active)
            </p>
            <p className="text-3xl font-black text-gray-900">
              ฿
              {activeShares
                .reduce((sum, s) => sum + (s.poolAmount || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 tracking-wide mb-1">
              วงแชร์ที่จบแล้ว
            </p>
            <p className="text-3xl font-black text-gray-900">
              {completedShares.length}{" "}
              <span className="text-sm font-semibold text-gray-500">วง</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- ACTIVE SHARES LIST --- */}
      <div>
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-base border-l-4 border-blue-600 pl-3">
          วงแชร์ที่กำลังดำเนินการ
        </h3>

        {activeShares.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-gray-300">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold mb-4">
              ยังไม่มีวงแชร์ในระบบ
            </p>
            <Link
              href="/shares/new"
              className="inline-flex bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-xl font-bold text-sm transition-colors"
            >
              เปิดวงแรกเลยคลิก!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {activeShares.map((share) => (
              <div
                key={share.id}
                className="bg-white rounded-[1.5rem] shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-all relative group"
              >
                <div
                  className="absolute top-5 right-4 z-10"
                  ref={activeMenuId === share.id ? menuRef : null}
                >
                  <button
                    onClick={() =>
                      setActiveMenuId(
                        activeMenuId === share.id ? null : share.id,
                      )
                    }
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 rounded-xl transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {activeMenuId === share.id && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => openEditModal(share)}
                        className="w-full text-left px-5 py-4 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" /> แก้ไขข้อมูล
                      </button>
                      <button
                        onClick={() => handleDeleteShare(share.id, share.name)}
                        className="w-full text-left px-5 py-4 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> ลบวงแชร์นี้ทิ้ง
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start mb-6 pr-10">
                  <div>
                    <h4 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">
                      {share.name}
                    </h4>
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-100">
                      <CalendarDays className="w-4 h-4 text-blue-500" /> ส่งทุกๆ{" "}
                      {share.frequency}{" "}
                      {share.frequencyType === "day" ? "วัน" : "เดือน"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-green-50/50 rounded-[1rem] p-3 border border-green-100 text-center">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                      กองกลาง
                    </p>
                    <p className="text-base font-black text-green-700">
                      ฿{share.poolAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 rounded-[1rem] p-3 border border-blue-100 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
                      ส่งงวดละ
                    </p>
                    <p className="text-base font-black text-blue-700">
                      ฿{share.installmentAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-[1rem] p-3 border border-gray-200 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                      งวดปัจจุบัน
                    </p>
                    <p className="text-base font-black text-gray-900">
                      {share.currentPeriod} / {share.totalHands}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/shares/${share.id}`}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
                >
                  ดูรายละเอียด <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- COMPLETED SHARES LIST --- */}
      {completedShares.length > 0 && (
        <div className="pt-10 mt-10 border-t border-gray-200">
          <h3 className="font-bold text-gray-400 mb-6 flex items-center gap-2 text-sm border-l-4 border-gray-300 pl-3">
            ประวัติวงแชร์ที่จบแล้ว
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedShares.map((share) => (
              <div
                key={share.id}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex justify-between items-center relative group"
              >
                <button
                  onClick={() => handleDeleteShare(share.id, share.name)}
                  className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="ลบประวัติวงแชร์"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div>
                  <h4 className="font-bold text-gray-800">{share.name}</h4>
                  <p className="text-xs text-gray-500 font-medium mt-1 bg-gray-50 inline-block px-2 py-1 rounded">
                    กองกลาง ฿{share.poolAmount?.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0 border border-green-100">
                  <Check className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🌟 MODAL: Edit Full Form (แก้ไขทุกรายละเอียด) */}
      {/* ========================================== */}
      {editingShare && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50/50 rounded-t-[2rem] shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />{" "}
                แก้ไขรายละเอียดวงแชร์
              </h3>
              <button
                onClick={() => setEditingShare(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 🌟 เนื้อหาภายใน Modal (เลื่อนลงได้) */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* ชื่อวง & จำนวนมือ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                    ชื่อวงแชร์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingShare.name}
                    onChange={(e) =>
                      setEditingShare({ ...editingShare, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-bold text-gray-900 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                    จำนวนมือทั้งหมด{" "}
                    <span className="text-[10px] text-gray-400 normal-case">
                      (แก้ไขไม่ได้)
                    </span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={editingShare.totalHands}
                      readOnly
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                    วันที่เริ่มวงแชร์
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={editingShare.startDate}
                      onChange={(e) =>
                        setEditingShare({
                          ...editingShare,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 font-bold text-gray-900 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* การเงิน */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/30 border border-blue-100 rounded-2xl">
                <div>
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 block">
                    ส่งงวดละ (บาท)
                  </label>
                  <input
                    type="number"
                    value={editingShare.installmentAmount}
                    onChange={(e) =>
                      setEditingShare({
                        ...editingShare,
                        installmentAmount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-500 font-black text-blue-700 text-lg transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 block">
                    กองกลาง / เปียได้ (บาท)
                  </label>
                  <input
                    type="number"
                    value={editingShare.poolAmount}
                    onChange={(e) =>
                      setEditingShare({
                        ...editingShare,
                        poolAmount: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white border border-green-200 rounded-xl outline-none focus:border-green-500 font-black text-green-700 text-lg transition-all"
                  />
                </div>

                {/* พรีวิวกำไรอัตโนมัติ */}
                <div className="md:col-span-2 pt-3 border-t border-blue-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" /> สรุปกำไรท้าวแชร์:
                  </span>
                  <span className="text-lg font-black text-orange-600">
                    ฿
                    {(
                      Number(editingShare.installmentAmount || 0) *
                        Number(editingShare.totalHands) -
                      Number(editingShare.poolAmount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* รอบการส่ง */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                  รอบการส่งเงิน (ส่งทุกๆ กี่วัน/เดือน)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editingShare.frequency}
                    onChange={(e) =>
                      setEditingShare({
                        ...editingShare,
                        frequency: e.target.value,
                      })
                    }
                    className="w-24 px-4 py-3 text-center bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 font-bold text-gray-900 transition-all"
                  />
                  <select
                    value={editingShare.frequencyType}
                    onChange={(e) =>
                      setEditingShare({
                        ...editingShare,
                        frequencyType: e.target.value,
                      })
                    }
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 font-bold text-gray-900 transition-all appearance-none"
                  >
                    <option value="day">วัน</option>
                    <option value="month">เดือน</option>
                  </select>
                </div>
              </div>

              {/* บัญชีธนาคาร */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">
                  บัญชีธนาคารที่ใช้รับเงินวงแชร์
                </label>
                <div className="relative">
                  <div
                    onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                    className={`w-full bg-white border rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
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
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
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
                            className="text-xs font-bold mt-0.5"
                            style={{ color: selectedBankData.hexColor }}
                          >
                            {selectedBankData.bankName} •{" "}
                            {selectedBankData.accountNo}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                          <Landmark className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="font-bold text-gray-400 text-sm">
                          -- คลิกเพื่อเลือกบัญชีธนาคาร --
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
                    <div className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-56 overflow-y-auto custom-scrollbar">
                      {ADMIN_BANK_ACCOUNTS.map((bank) => (
                        <div
                          key={bank.id}
                          onClick={() => handleSelectBank(bank)}
                          className="p-3.5 flex items-center gap-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
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
                            <p className="text-xs font-semibold text-gray-500 mt-0.5 flex gap-1.5">
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
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-[2rem] shrink-0">
              <button
                onClick={() => setEditingShare(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white px-4 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md transition-colors"
              >
                <Save className="w-5 h-5" /> บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
