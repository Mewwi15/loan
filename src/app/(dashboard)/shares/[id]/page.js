"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Loader2,
  Award,
  Wallet,
  Users,
  Ban,
  Trophy,
  Download,
  X,
  Camera,
  Crown,
  Undo2,
  Coins,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertCircle,
  User,
} from "lucide-react";
import { toPng } from "html-to-image";

export default function ShareCommandCenterPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id;

  const [share, setShare] = useState(null);
  const [hands, setHands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const printAreaRef = useRef(null);

  // 🌟 State สำหรับสวมสิทธิ์ (Swap)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [handToSwap, setHandToSwap] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================
  // 1. ดึงข้อมูลแบบ Real-time และรายชื่อลูกค้า
  // ==========================================
  useEffect(() => {
    if (!shareId) return;

    const unsubShare = onSnapshot(doc(db, "shares", shareId), (docSnap) => {
      if (docSnap.exists()) {
        setShare({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert("ไม่พบข้อมูลวงแชร์นี้");
        router.push("/shares");
      }
    });

    const q = query(
      collection(db, "share_hands"),
      where("shareId", "==", shareId),
    );
    const unsubHands = onSnapshot(q, (snap) => {
      const handsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      handsData.sort((a, b) => a.handNumber - b.handNumber);
      setHands(handsData);
      setLoading(false);
    });

    // โหลดรายชื่อลูกค้าเตรียมไว้สำหรับสวมสิทธิ์
    const fetchCustomers = async () => {
      const custSnap = await getDocs(collection(db, "customers"));
      setCustomersList(custSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchCustomers();

    return () => {
      unsubShare();
      unsubHands();
    };
  }, [shareId, router]);

  // ==========================================
  // 2. ฟังก์ชันเช็คชื่อ (Check-in)
  // ==========================================
  const togglePaidStatus = async (hand) => {
    if (share.status === "completed") return;
    setIsProcessing(true);

    const handRef = doc(db, "share_hands", hand.id);
    const currentPeriod = share.currentPeriod;
    const hasPaid = hand.paidPeriods?.includes(currentPeriod);

    try {
      if (hasPaid) {
        await updateDoc(handRef, {
          paidPeriods: arrayRemove(currentPeriod),
          totalPaid: increment(-share.installmentAmount),
        });
      } else {
        await updateDoc(handRef, {
          paidPeriods: arrayUnion(currentPeriod),
          totalPaid: increment(share.installmentAmount),
        });
      }
    } catch (error) {
      console.error("Error toggling paid status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 ฟังก์ชันติ๊กรับยอดทั้งหมด (Check All)
  const handleCheckAll = async () => {
    if (share.status === "completed") return;

    const unpaidHands = hands.filter(
      (h) =>
        h.handNumber !== 1 &&
        !h.paidPeriods?.includes(share.currentPeriod) &&
        h.status !== "closed",
    );

    if (unpaidHands.length === 0) {
      alert("เช็คยอดครบทุกมือแล้วครับ!");
      return;
    }

    const confirmMsg = `ยืนยันการติ๊กรับยอดให้ครบทั้ง ${unpaidHands.length} มือที่เหลือในงวดนี้ ใช่หรือไม่?`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      unpaidHands.forEach((h) => {
        const handRef = doc(db, "share_hands", h.id);
        batch.update(handRef, {
          paidPeriods: arrayUnion(share.currentPeriod),
          totalPaid: increment(share.installmentAmount),
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error checking all hands:", error);
      alert("เกิดข้อผิดพลาดในการเช็คยอดทั้งหมด");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 3. ฟังก์ชันสละสิทธิ์งวดนี้
  // ==========================================
  const toggleSkipStatus = async (hand) => {
    if (share.status === "completed") return;
    setIsProcessing(true);

    const handRef = doc(db, "share_hands", hand.id);
    const currentPeriod = share.currentPeriod;
    const hasSkipped = hand.skippedPeriods?.includes(currentPeriod);

    try {
      if (hasSkipped) {
        await updateDoc(handRef, {
          skippedPeriods: arrayRemove(currentPeriod),
        });
      } else {
        const confirmMsg = `ยืนยันให้ มือที่ ${hand.handNumber} (${hand.customerName}) สละสิทธิ์รับเงินในงวดที่ ${currentPeriod} ใช่หรือไม่?`;
        if (!window.confirm(confirmMsg)) {
          setIsProcessing(false);
          return;
        }
        await updateDoc(handRef, {
          skippedPeriods: arrayUnion(currentPeriod),
        });
      }
    } catch (error) {
      console.error("Error toggling skip status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 4. ฟังก์ชันบันทึกผู้ชนะ
  // ==========================================
  const handleDeclareWinner = async (winnerHand) => {
    if (share.status === "completed") return;

    const confirmMsg = `ยืนยันให้ มือที่ ${winnerHand.handNumber} (${winnerHand.customerName}) เป็นผู้รับเงินในงวดที่ ${share.currentPeriod} ใช่หรือไม่?\n\nระบบจะเปลี่ยนสถานะเป็น "มือตาย" และขึ้นงวดถัดไปทันที`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      const winnerRef = doc(db, "share_hands", winnerHand.id);
      batch.update(winnerRef, {
        status: "dead",
        wonAtPeriod: share.currentPeriod,
      });

      const shareRef = doc(db, "shares", share.id);
      const nextPeriod = share.currentPeriod + 1;

      if (nextPeriod > share.totalHands) {
        batch.update(shareRef, {
          currentPeriod: share.totalHands,
          status: "completed",
        });
      } else {
        batch.update(shareRef, { currentPeriod: nextPeriod });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error declaring winner:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextPeriodForTao = async () => {
    if (share.status === "completed") return;
    if (
      !window.confirm(
        `ยืนยันการรับเงินงวดที่ 1 สำหรับท้าวแชร์\nและเริ่มงวดที่ 2 ใช่หรือไม่?`,
      )
    )
      return;

    setIsProcessing(true);
    try {
      const shareRef = doc(db, "shares", share.id);
      await updateDoc(shareRef, { currentPeriod: 2 });
    } catch (error) {
      console.error("Error updating period:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชันยกเลิกปิดบัญชี
  // ==========================================
  const handleUndoClose = async (hand) => {
    const confirmMsg = `ยืนยันการ "ยกเลิกปิดบัญชี" ของ มือที่ ${hand.handNumber} (${hand.customerName}) ใช่หรือไม่?\n\nระบบจะคืนสถานะกลับไปเป็น ${hand.wonAtPeriod || hand.handNumber === 1 ? "มือตาย" : "มือเป็น"} เหมือนเดิม`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const handRef = doc(db, "share_hands", hand.id);
      const prevStatus =
        hand.handNumber === 1 || hand.wonAtPeriod ? "dead" : "alive";
      await updateDoc(handRef, { status: prevStatus });
    } catch (error) {
      console.error("Error undoing close status:", error);
      alert("เกิดข้อผิดพลาดในการยกเลิกปิดวง");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชัน สวมสิทธิ์ (ขายมือแชร์)
  // ==========================================
  const openSwapModal = (hand) => {
    setHandToSwap(hand);
    setSearchQuery("");
    setIsSwapModalOpen(true);
  };

  const confirmSwap = async (newCustomer) => {
    const currentPeriod = share.currentPeriod;
    const confirmMsg = `ยืนยันการสวมสิทธิ์ให้\n"${newCustomer.nickname || newCustomer.name}"\n\nมารับช่วงต่อจาก "${handToSwap.customerName}" ในงวดที่ ${currentPeriod} ใช่หรือไม่?\n\n*ระบบจะบันทึกยอดทุนคนเก่าไว้หักคืนตอนเปียได้อัตโนมัติ`;

    if (!window.confirm(confirmMsg)) return;
    setIsProcessing(true);

    try {
      // 1. คำนวณก้อนทุนคนเก่า (ก่อนงวดปัจจุบัน)
      const prevPaidCount =
        handToSwap.paidPeriods?.filter((p) => p < currentPeriod).length || 0;
      const previousOwnerCapital = prevPaidCount * share.installmentAmount;

      // 2. สร้างฐานหนี้พิเศษเฉพาะคนใหม่: (ฐานปกติ) - (ก้อนทุนคนเก่า)
      const totalCollectedPerPeriod =
        share.installmentAmount * share.totalHands;
      const standardGuaranteeDeduction = share.installmentAmount * 3;
      const normalBaseDebt =
        totalCollectedPerPeriod - standardGuaranteeDeduction;
      const customBaseDebt = normalBaseDebt - previousOwnerCapital;

      // 3. จัดรูปแบบชื่อ
      const newCustomerName = newCustomer.nickname
        ? `${newCustomer.nickname} (${newCustomer.name})`
        : newCustomer.name;

      // 4. อัปเดตฐานข้อมูล
      const handRef = doc(db, "share_hands", handToSwap.id);
      await updateDoc(handRef, {
        customerId: newCustomer.id,
        customerName: newCustomerName,
        isSwapped: true,
        originalOwnerName: handToSwap.customerName,
        swappedAtPeriod: currentPeriod,
        previousOwnerCapital: previousOwnerCapital,
        customBaseDebt: customBaseDebt,
      });

      setIsSwapModalOpen(false);
      setHandToSwap(null);
    } catch (error) {
      console.error("Error swapping hand:", error);
      alert("เกิดข้อผิดพลาดในการเปลี่ยนมือแชร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // กรองรายชื่อลูกค้าใน Modal สวมสิทธิ์
  const filteredCustomers = customersList.filter((c) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      (c.name?.toLowerCase() || "").includes(s) ||
      (c.nickname?.toLowerCase() || "").includes(s) ||
      (c.code?.toLowerCase() || "").includes(s)
    );
  });

  // ==========================================
  // 🌟 ฟังก์ชันบันทึกภาพ
  // ==========================================
  const handleDownloadImage = () => {
    if (!printAreaRef.current) return;
    setIsCapturing(true);

    setTimeout(async () => {
      try {
        const dataUrl = await toPng(printAreaRef.current, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true,
        });

        const link = document.createElement("a");
        link.download = `รายชื่อจับฉลากงวด-${share.currentPeriod}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error("Error capturing image:", error);
        alert("ไม่สามารถบันทึกภาพได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsCapturing(false);
      }
    }, 500);
  };

  if (loading || !share) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 pointer-events-none" />
        <p className="font-semibold text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const currentPeriod = share.currentPeriod;
  const totalCollectedPerPeriod = share.installmentAmount * share.totalHands;
  const adminProfit = totalCollectedPerPeriod - share.poolAmount;

  // 🌟 ลอจิกการเงินหลัก
  const DEDUCT_HANDS_COUNT = 3;
  const standardGuaranteeDeduction =
    share.installmentAmount * DEDUCT_HANDS_COUNT;

  // 🌟 ฐานหนี้มาตรฐาน = (ยอดเก็บรวม/งวด) - (หักค้ำท้าย)
  const totalObligationPerHand =
    totalCollectedPerPeriod - standardGuaranteeDeduction;

  // ==========================================
  // 🌟 ดึงตัวแปรมาตรฐาน 1 มือ มาแสดงบนการ์ด
  // ==========================================
  const standardPaidPeriods = Math.max(0, currentPeriod - 1);
  const displayAliveSaved = standardPaidPeriods * share.installmentAmount;
  const displayDeadDebt = Math.max(
    0,
    totalObligationPerHand - displayAliveSaved,
  );

  // คำนวณยอดสุทธิ (Net Balance) ของลูกค้าทุกคน สำหรับแสดงในตารางที่ 2
  const customerNetBalances = {};
  hands.forEach((h) => {
    const cid = h.customerId;
    if (!customerNetBalances[cid]) customerNetBalances[cid] = 0;

    const isAlive = h.status === "alive";
    const isClosed = h.status === "closed";

    // สำหรับคนที่สวมสิทธิ์ คิดเฉพาะยอดจ่ายหลังรับช่วงต่อมาแล้ว
    const isSwapped = !!h.isSwapped;
    const realTotalPaid = isSwapped
      ? (h.paidPeriods?.filter((p) => p >= h.swappedAtPeriod).length || 0) *
        share.installmentAmount
      : (h.paidPeriods?.length || 0) * share.installmentAmount;

    if (isClosed) return;

    if (isAlive) {
      customerNetBalances[cid] += realTotalPaid;
    } else if (h.status === "dead") {
      const baseDebtForThisHand = isSwapped
        ? h.customBaseDebt || 0
        : totalObligationPerHand;
      let actualRemainingDebt = baseDebtForThisHand - realTotalPaid;
      if (actualRemainingDebt < 0) actualRemainingDebt = 0;
      customerNetBalances[cid] -= actualRemainingDebt;
    }
  });

  const eligibleCandidates = hands.filter(
    (h) =>
      h.status === "alive" &&
      h.paidPeriods?.includes(currentPeriod) &&
      h.handNumber !== 1,
  );

  const collectedCount = hands.filter((h) =>
    h.paidPeriods?.includes(currentPeriod),
  ).length;
  const totalCollectedThisPeriod =
    collectedCount * share.installmentAmount + share.installmentAmount;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 bg-gray-50/30 min-h-screen touch-manipulation">
      {/* --- Header Section --- */}
      <div className="pt-8 pb-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="w-full md:w-auto">
          <Link
            href="/shares"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 pointer-events-none" /> ย้อนกลับ
          </Link>
          <h1 className="text-3xl font-black text-gray-900 mb-6">
            {share.name}
          </h1>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-white border border-gray-200 rounded-[1rem] px-6 py-4 shadow-sm min-w-[180px]">
                <p className="text-xs font-bold text-gray-500 tracking-wide mb-1">
                  ยอดเก็บรวม/งวด
                </p>
                <p className="text-2xl font-black text-gray-800">
                  ฿{totalCollectedPerPeriod.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[1rem] px-6 py-4 shadow-sm min-w-[180px]">
                <p className="text-xs font-bold text-[#15803d] tracking-wide mb-1">
                  ให้ผู้ชนะ (กองกลาง)
                </p>
                <p className="text-2xl font-black text-[#166534]">
                  ฿{share.poolAmount?.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[1rem] px-6 py-4 shadow-sm min-w-[180px]">
                <p className="text-xs font-bold text-[#b91c1c] tracking-wide mb-1 flex items-center gap-1">
                  หักค้ำท้าย (3 งวด)
                </p>
                <p className="text-2xl font-black text-[#991b1b]">
                  ฿{standardGuaranteeDeduction.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-[1rem] px-6 py-4 shadow-sm min-w-[180px]">
                <p className="text-xs font-bold text-[#c2410c] tracking-wide mb-1">
                  ค่าทำวง (กำไรท้าว)
                </p>
                <p className="text-2xl font-black text-[#9a3412]">
                  ฿{adminProfit > 0 ? adminProfit.toLocaleString() : 0}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* 🌟 การ์ดแสดงยอดแบบ 1 มือ */}
              <div className="bg-[#f8fafc] border border-blue-100 rounded-[1rem] px-6 py-4 shadow-sm min-w-[220px]">
                <p className="text-sm font-bold text-[#2563eb] tracking-wide mb-1">
                  เงินออมสะสม (มือเป็น)
                </p>
                <p className="text-3xl font-black text-[#1e40af]">
                  + ฿{displayAliveSaved.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#fffdfd] border border-red-100 rounded-[1rem] px-6 py-4 shadow-sm min-w-[220px]">
                <p className="text-sm font-bold text-[#b91c1c] tracking-wide mb-1">
                  หนี้คงเหลือ (มือตาย)
                </p>
                <p className="text-3xl font-black text-[#991b1b]">
                  - ฿{displayDeadDebt.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto mt-6 md:mt-0">
          <div className="flex-1 md:flex-none bg-white border border-gray-200 rounded-[1rem] px-6 py-4 shadow-sm text-center flex flex-col justify-center">
            <p className="text-xs font-bold text-gray-500 mb-1">
              ยอดเก็บได้งวดนี้{" "}
              <span className="text-[10px] text-gray-400 font-medium">
                (รวมท้าวแล้ว)
              </span>
            </p>
            <p className="text-xl font-black text-blue-600 flex items-center justify-center gap-1">
              ฿{totalCollectedThisPeriod.toLocaleString()}
              <span className="text-sm text-gray-400 font-bold">
                / ฿{totalCollectedPerPeriod.toLocaleString()}
              </span>
            </p>
          </div>
          <div className="flex-1 md:flex-none bg-gray-900 rounded-[1rem] px-8 py-4 shadow-md text-center text-white flex flex-col justify-center">
            <p className="text-xs font-bold opacity-80 mb-1">งวดปัจจุบัน</p>
            <p className="text-3xl font-black leading-none">
              {share.currentPeriod}{" "}
              <span className="text-sm font-medium opacity-80">
                / {share.totalHands}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* --- ตารางที่ 1: เช็คชื่อประจำงวด --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600 pointer-events-none" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                ตารางเก็บยอด (งวดที่ {share.currentPeriod})
              </h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                ติ๊กเพื่อยืนยันการรับเงินเข้ากองกลาง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckAll}
            disabled={isProcessing || share.status === "completed"}
            className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 pointer-events-none" />{" "}
            ติ๊กรับยอดทั้งหมด
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="px-5 py-4 font-semibold w-16 text-center">#</th>
                <th className="px-5 py-4 font-semibold">รายชื่อ</th>
                <th className="px-5 py-4 font-semibold text-center w-28">
                  สถานะ
                </th>
                <th className="px-5 py-4 font-semibold text-right border-l border-gray-200 bg-gray-50/80">
                  ส่งงวดนี้
                </th>
                <th className="px-5 py-4 font-semibold text-right bg-gray-50/80">
                  ยอดสะสมรวม
                </th>
                <th className="px-5 py-4 font-semibold text-right">
                  สถานะการเงิน
                </th>
                <th className="px-5 py-4 font-semibold text-center w-28">
                  เช็คยอด
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hands.map((hand) => {
                const isTao = hand.handNumber === 1;
                const isAlive = hand.status === "alive";
                const isClosed = hand.status === "closed";
                const isSwapped = !!hand.isSwapped; // 🌟 เช็คว่ามีการสวมสิทธิ์ไหม

                const hasPaidThisPeriod =
                  hand.paidPeriods?.includes(currentPeriod);

                // 🌟 ลอจิกการคำนวณยอดเงินของแต่ละบรรทัด (รองรับคนสวมสิทธิ์)
                // ถ้ารับช่วงต่อ: ให้นับเฉพาะงวดที่เขาจ่ายเอง (>= งวดที่สวมสิทธิ์)
                const realPaidPeriodsCount = isSwapped
                  ? hand.paidPeriods?.filter((p) => p >= hand.swappedAtPeriod)
                      .length || 0
                  : hand.paidPeriods?.length || 0;

                const displayRealTotalPaid =
                  realPaidPeriodsCount * share.installmentAmount;
                const prevPaid = hasPaidThisPeriod
                  ? displayRealTotalPaid - share.installmentAmount
                  : displayRealTotalPaid;

                // 🌟 ยอดรับจริงตอนเปีย (หักค้ำ และ หักคืนคนเก่าด้วย!)
                const handGuaranteeDeduction = isTao
                  ? 0
                  : standardGuaranteeDeduction;
                const previousCapitalToDeduct = isSwapped
                  ? hand.previousOwnerCapital || 0
                  : 0;

                const handActualReceived =
                  share.poolAmount -
                  handGuaranteeDeduction -
                  previousCapitalToDeduct;

                // 🌟 หนี้คงเหลือที่แท้จริง = (ฐานหนี้ของคนนี้) - (จ่ายไปแล้ว)
                const baseDebtForThisHand = isSwapped
                  ? hand.customBaseDebt || 0
                  : totalObligationPerHand;
                let currentRemainingDebt =
                  baseDebtForThisHand - displayRealTotalPaid;
                if (currentRemainingDebt < 0) currentRemainingDebt = 0;

                const displayAmount = isAlive
                  ? displayRealTotalPaid
                  : currentRemainingDebt;
                const remainingPeriodsCount = Math.ceil(
                  currentRemainingDebt / share.installmentAmount,
                );

                return (
                  <tr
                    key={hand.id}
                    className={`transition-colors ${
                      isClosed
                        ? "bg-emerald-600/90 text-white"
                        : hasPaidThisPeriod
                          ? "bg-green-50/10 hover:bg-blue-50/30"
                          : "bg-white hover:bg-blue-50/30"
                    }`}
                  >
                    <td
                      className={`px-5 py-4 text-center font-bold ${isClosed ? "text-emerald-100" : "text-gray-500"}`}
                    >
                      {hand.handNumber}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-semibold ${isClosed ? "text-white" : "text-gray-900"}`}
                          >
                            {hand.customerName}
                          </p>
                          {isClosed && (
                            <span className="text-[10px] font-black uppercase bg-white text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> โปะจบแล้ว
                            </span>
                          )}
                        </div>

                        {/* 🌟 ป้าย Tag รับช่วงต่อ */}
                        {isSwapped && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold mt-1 flex items-center gap-1 w-fit ${isClosed ? "bg-emerald-800/40 text-emerald-100" : "bg-amber-100 text-amber-700 border border-amber-200"}`}
                          >
                            <RefreshCw className="w-3 h-3" /> รับช่วงต่อจาก{" "}
                            {hand.originalOwnerName}
                          </span>
                        )}
                      </div>

                      {isTao && (
                        <p
                          className={`text-[11px] font-medium mt-1 ${isClosed ? "text-emerald-100" : "text-gray-500"}`}
                        >
                          ท้าวแชร์ (ไม่ต้องส่ง)
                        </p>
                      )}

                      {hand.wonAtPeriod && !isTao && (
                        <div
                          className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isClosed ? "bg-emerald-800/40 text-emerald-50 border border-emerald-500" : "bg-red-50 border border-red-100 text-red-600"}`}
                        >
                          <Award className="w-3 h-3 pointer-events-none" />{" "}
                          รับงวด {hand.wonAtPeriod} |
                          {isSwapped &&
                            ` หักคืนทุน ${hand.originalOwnerName} ฿${previousCapitalToDeduct.toLocaleString()} | `}
                          รับจริง ฿{handActualReceived.toLocaleString()}
                        </div>
                      )}
                      {hand.wonAtPeriod && isTao && (
                        <div
                          className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isClosed ? "bg-emerald-800/40 text-emerald-50 border border-emerald-500" : "bg-green-50 border border-green-100 text-green-600"}`}
                        >
                          <Crown className="w-3 h-3 pointer-events-none" />{" "}
                          รับงวด 1 | รับเต็ม ฿
                          {share.poolAmount.toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-white/20 text-white border border-white/20 shadow-sm">
                          ปิดบัญชีแล้ว
                        </span>
                      ) : isAlive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          มือเป็น
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          มือตาย
                        </span>
                      )}
                    </td>

                    <td
                      className={`px-5 py-4 text-right border-l ${isClosed ? "border-emerald-500 bg-emerald-700/20" : "border-gray-100 bg-gray-50/30"}`}
                    >
                      {!isTao && !isClosed ? (
                        <span className="font-bold text-gray-700">
                          ฿{share.installmentAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span
                          className={`font-bold ${isClosed ? "text-emerald-100" : "text-gray-400"}`}
                        >
                          -
                        </span>
                      )}
                    </td>

                    <td
                      className={`px-5 py-4 text-right ${isClosed ? "bg-emerald-700/20" : "bg-gray-50/30"}`}
                    >
                      {isClosed ? (
                        <span className="font-bold text-white text-sm">
                          เคลียร์ยอดแล้ว
                        </span>
                      ) : !isTao ? (
                        hasPaidThisPeriod ? (
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-[11px] font-medium ${isClosed ? "text-emerald-200" : "text-gray-500"}`}
                            >
                              {prevPaid.toLocaleString()} +{" "}
                              {share.installmentAmount.toLocaleString()} =
                            </span>
                            <span
                              className={`font-bold text-sm ${isClosed ? "text-white" : "text-green-700"}`}
                            >
                              ฿{displayRealTotalPaid.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-gray-800 text-sm">
                              ฿{displayRealTotalPaid.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-orange-500 font-semibold mt-0.5">
                              รอรับยอด
                            </span>
                          </div>
                        )
                      ) : (
                        <span
                          className={`font-bold ${isClosed ? "text-emerald-100" : "text-gray-400"}`}
                        >
                          -
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {isTao ? (
                        <span
                          className={`font-bold ${isClosed ? "text-emerald-200" : "text-gray-400"}`}
                        >
                          ท้าวแชร์ (ไม่มีหนี้)
                        </span>
                      ) : isClosed ? (
                        <span className="text-emerald-200 font-bold">-</span>
                      ) : isAlive ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-green-600 text-sm">
                            + ฿{displayAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            ยอดออมสะสม
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-red-600 text-sm">
                            - ฿{displayAmount.toLocaleString()}
                          </span>
                          {currentRemainingDebt > 0 ? (
                            <span className="text-[10px] text-red-500 font-bold mt-0.5">
                              ส่งต่ออีก {remainingPeriodsCount} งวด
                            </span>
                          ) : (
                            <span className="text-[10px] text-green-500 font-bold mt-0.5">
                              ส่งครบแล้ว ไม่ต้องส่งต่อ
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => handleUndoClose(hand)}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-800 text-white transition-all shadow-sm disabled:opacity-50"
                        >
                          <Undo2 className="w-3 h-3 pointer-events-none" />{" "}
                          ยกเลิกโปะ
                        </button>
                      ) : isTao ? (
                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-not-allowed bg-gray-100 text-gray-400">
                          ข้าม
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => togglePaidStatus(hand)}
                          disabled={
                            isProcessing ||
                            share.status === "completed" ||
                            (currentRemainingDebt === 0 && !isAlive)
                          }
                          className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all border cursor-pointer ${
                            hasPaidThisPeriod
                              ? "bg-green-600 border-green-600 text-white shadow-sm"
                              : "bg-white border-gray-300 text-gray-300 hover:border-green-500 hover:text-green-600"
                          } disabled:opacity-50 disabled:bg-gray-100`}
                        >
                          <Check
                            className="w-5 h-5 pointer-events-none"
                            strokeWidth={2.5}
                          />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ตารางที่ 2: รายชื่อผู้มีสิทธิ์ --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600 pointer-events-none" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                ผู้มีสิทธิ์จับฉลาก{" "}
                {share.currentPeriod === 1 && (
                  <span className="text-orange-500">(ท้าวแชร์งวด 1)</span>
                )}
              </h2>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                เฉพาะ มือเป็น ที่เช็คยอดจ่ายแล้ว และไม่สละสิทธิ์
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {share.currentPeriod > 1 && eligibleCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 pointer-events-none" />{" "}
                สร้างรูปรายชื่อ
              </button>
            )}

            <div className="text-xs font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              {share.currentPeriod === 1
                ? "ท้าวแชร์ 1 มือ"
                : `มีสิทธิ์เปีย ${eligibleCandidates.length} มือ`}
            </div>
          </div>
        </div>

        {share.currentPeriod === 1 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center bg-orange-50/30">
            <Crown className="w-16 h-16 text-orange-400 mb-4 pointer-events-none" />
            <h3 className="text-xl font-black text-gray-800 mb-2">
              ท้าวแชร์รับเงินงวดที่ 1
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-6">
              งวดแรกท้าวแชร์ได้รับเงินกองกลางโดยไม่ต้องจับฉลาก
            </p>

            <button
              type="button"
              onClick={handleNextPeriodForTao}
              disabled={isProcessing || share.status === "completed"}
              className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              รับเงินเรียบร้อย - ขึ้นงวดที่ 2{" "}
              <ArrowLeft className="w-4 h-4 rotate-180 pointer-events-none" />
            </button>
          </div>
        ) : eligibleCandidates.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Ban className="w-8 h-8 mx-auto mb-2 opacity-50 pointer-events-none" />
            <p className="font-medium text-sm text-gray-600">
              ไม่มีรายชื่อในงวดนี้
            </p>
            <p className="text-xs mt-1">
              กรุณาเช็คยอดจ่ายเงินในตารางด้านบนก่อน
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <th className="px-6 py-4 font-semibold w-20 text-center">
                    #
                  </th>
                  <th className="px-6 py-4 font-semibold">ชื่อลูกค้า</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    ยอดสุทธิ
                  </th>
                  <th className="px-6 py-4 font-semibold text-center w-[240px]">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eligibleCandidates.map((cand) => {
                  const hasSkipped =
                    cand.skippedPeriods?.includes(currentPeriod);

                  const netBal = customerNetBalances[cand.customerId] || 0;
                  const isPositive = netBal >= 0;

                  return (
                    <tr
                      key={cand.id}
                      className={`transition-colors ${hasSkipped ? "bg-red-50/20" : "hover:bg-orange-50/20 bg-white"}`}
                    >
                      <td className="px-6 py-4 text-center font-bold text-gray-500">
                        {cand.handNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              hasSkipped ? "line-through text-red-400" : ""
                            }
                          >
                            {cand.customerName}
                          </span>
                          {hasSkipped && (
                            <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                              สละสิทธิ์
                            </span>
                          )}
                          {cand.isSwapped && !hasSkipped && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                              สวมสิทธิ์
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`px-6 py-4 text-right font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
                      >
                        {isPositive ? "+" : "-"} ฿
                        {Math.abs(netBal).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        {hasSkipped ? (
                          <button
                            type="button"
                            onClick={() => toggleSkipStatus(cand)}
                            disabled={isProcessing}
                            className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5 pointer-events-none" />{" "}
                            ยกเลิกสละสิทธิ์
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openSwapModal(cand)}
                              disabled={isProcessing}
                              className="w-10 bg-white border border-gray-200 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 text-gray-400 flex items-center justify-center rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                              title="เปลี่ยนมือ (สวมสิทธิ์)"
                            >
                              <RefreshCw className="w-4 h-4 pointer-events-none" />
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSkipStatus(cand)}
                              disabled={isProcessing}
                              className="w-10 bg-white border border-gray-200 hover:border-red-400 hover:text-red-500 hover:bg-red-50 text-gray-400 flex items-center justify-center rounded-lg transition-all shadow-sm shrink-0 cursor-pointer"
                              title="สละสิทธิ์งวดนี้"
                            >
                              <Ban className="w-4 h-4 pointer-events-none" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeclareWinner(cand)}
                              disabled={
                                isProcessing || share.status === "completed"
                              }
                              className="flex-1 bg-gray-900 hover:bg-orange-500 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <Trophy className="w-3.5 h-3.5 pointer-events-none" />{" "}
                              ได้รับเงิน
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 🌟 MODAL: สวมสิทธิ์เปลี่ยนมือแชร์ */}
      {/* ========================================== */}
      {isSwapModalOpen && handToSwap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSwapModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-amber-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-600" />{" "}
                  สวมสิทธิ์มือแชร์
                </h2>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  แทนที่ {handToSwap.customerName} (มือที่{" "}
                  {handToSwap.handNumber}) ในงวดที่ {share.currentPeriod}
                </p>
              </div>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="p-2 bg-white hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 transition-all active:scale-95 cursor-pointer"
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
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-50 font-medium transition-all text-sm"
                  placeholder="ค้นหารายชื่อคนใหม่..."
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
                    onClick={() => confirmSwap(c)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-white hover:border-amber-300 hover:bg-amber-50/30 shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">
                          {c.code && (
                            <span className="text-amber-600 mr-1">
                              [{c.code}]
                            </span>
                          )}
                          {c.nickname ? `${c.nickname} (${c.name})` : c.name}
                        </p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                          คลิกเพื่อเลือกคนนี้
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🌟 MODAL: ใบสรุปรายชื่อ */}
      {/* ========================================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setShowExportModal(false)}
          ></div>

          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 z-10">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white rounded-t-[2rem]">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600 pointer-events-none" />{" "}
                สร้างรูปรายชื่อ
              </h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50">
              <div
                id="print-area"
                ref={printAreaRef}
                className="bg-white p-4 rounded-xl"
              >
                <div className="text-center mb-6 pt-2">
                  <h2 className="text-xl font-black text-gray-900">
                    {share.name}
                  </h2>
                  <p className="text-sm font-semibold text-gray-500 mt-1">
                    รายชื่อผู้มีสิทธิ์จับฉลาก งวดที่ {share.currentPeriod}
                  </p>
                </div>

                <div className="border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white border-b border-blue-100">
                        <th className="px-4 py-3 font-bold text-blue-700 w-20 text-center">
                          มือที่
                        </th>
                        <th className="px-4 py-3 font-bold text-blue-700">
                          ชื่อลูกค้า
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {eligibleCandidates.map((cand) => {
                        const hasSkipped =
                          cand.skippedPeriods?.includes(currentPeriod);

                        return (
                          <tr
                            key={cand.id}
                            className={`bg-white ${hasSkipped ? "bg-gray-50/50" : ""}`}
                          >
                            <td
                              className={`px-4 py-3 text-center font-bold border-r border-gray-50 ${hasSkipped ? "text-gray-400" : "text-blue-600"}`}
                            >
                              {cand.handNumber}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                              <span
                                className={
                                  hasSkipped ? "line-through text-gray-400" : ""
                                }
                              >
                                {cand.customerName}
                              </span>
                              {hasSkipped && (
                                <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                                  สละสิทธิ์
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-3 rounded-b-[2rem] shrink-0">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isCapturing}
                className="flex-1 bg-blue-600 text-white px-4 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCapturing ? (
                  <Loader2 className="w-5 h-5 animate-spin pointer-events-none" />
                ) : (
                  <Download className="w-5 h-5 pointer-events-none" />
                )}
                {isCapturing ? "กำลังประมวลผล..." : "ดาวน์โหลดเป็นรูปภาพ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
