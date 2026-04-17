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

  // ==========================================
  // 1. ดึงข้อมูลแบบ Real-time
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

    // หากรองมือที่ยังไม่ได้จ่าย และไม่ใช่มือท้าวแชร์
    const unpaidHands = hands.filter(
      (h) =>
        h.handNumber !== 1 && !h.paidPeriods?.includes(share.currentPeriod),
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

  const standardGuaranteeDeduction = share.installmentAmount * 3;
  const memberActualReceived = share.poolAmount - standardGuaranteeDeduction;

  const currentHandSaved = currentPeriod * share.installmentAmount;
  const memberCurrentHandDebt = memberActualReceived - currentHandSaved;
  const displayDeadDebt = memberCurrentHandDebt > 0 ? memberCurrentHandDebt : 0;

  // 🌟 คำนวณยอดสุทธิ (Net Balance) ของลูกค้าแต่ละคนในวงนี้แบบ Real-time
  const customerNetBalances = {};
  hands.forEach((h) => {
    const cid = h.customerId;
    if (!customerNetBalances[cid]) customerNetBalances[cid] = 0;

    const isTao = h.handNumber === 1;
    const isAlive = h.status === "alive";
    const totalPaid = Number(h.totalPaid) || 0;

    if (isAlive) {
      customerNetBalances[cid] += totalPaid;
    } else {
      const deduction = isTao ? 0 : standardGuaranteeDeduction;
      const actualRec = share.poolAmount - deduction;
      const debt = actualRec - totalPaid > 0 ? actualRec - totalPaid : 0;
      customerNetBalances[cid] -= debt;
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
              <div className="bg-[#f8fafc] border border-blue-100 rounded-[1rem] px-6 py-4 shadow-sm min-w-[220px]">
                <p className="text-sm font-bold text-[#2563eb] tracking-wide mb-1">
                  เงินออมสะสม (มือเป็น)
                </p>
                <p className="text-3xl font-black text-[#1e40af]">
                  + ฿{currentHandSaved.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#fffdfd] border border-red-100 rounded-[1rem] px-6 py-4 shadow-sm min-w-[220px]">
                <p className="text-sm font-bold text-[#b91c1c] tracking-wide mb-1">
                  หนี้คงเหลือ (ลูกแชร์มือตาย)
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

          {/* 🌟 เพิ่มปุ่มติ๊กรับยอดทั้งหมด */}
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
                const hasPaidThisPeriod =
                  hand.paidPeriods?.includes(currentPeriod);

                const prevPaid = hasPaidThisPeriod
                  ? hand.totalPaid - share.installmentAmount
                  : hand.totalPaid;

                const handGuaranteeDeduction = isTao
                  ? 0
                  : standardGuaranteeDeduction;
                const handActualReceived =
                  share.poolAmount - handGuaranteeDeduction;

                const currentDebt = handActualReceived - hand.totalPaid;
                const displayAmount = isAlive
                  ? hand.totalPaid
                  : currentDebt > 0
                    ? currentDebt
                    : 0;

                return (
                  <tr
                    key={hand.id}
                    className={`hover:bg-blue-50/30 transition-colors ${
                      hasPaidThisPeriod ? "bg-green-50/10" : "bg-white"
                    }`}
                  >
                    <td className="px-5 py-4 text-center font-bold text-gray-500">
                      {hand.handNumber}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {hand.customerName}
                      </p>

                      {isTao && (
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          ท้าวแชร์ (ไม่ต้องส่ง)
                        </p>
                      )}

                      {hand.wonAtPeriod && !isTao && (
                        <div className="mt-1.5 inline-flex items-center gap-1 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold text-red-600">
                          <Award className="w-3 h-3 pointer-events-none" />{" "}
                          รับงวด {hand.wonAtPeriod} | หักค้ำ 3 งวด (฿
                          {handGuaranteeDeduction.toLocaleString()}) | รับจริง ฿
                          {handActualReceived.toLocaleString()}
                        </div>
                      )}
                      {hand.wonAtPeriod && isTao && (
                        <div className="mt-1.5 inline-flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold text-green-600">
                          <Crown className="w-3 h-3 pointer-events-none" />{" "}
                          รับงวด 1 | รับเต็ม ฿
                          {handActualReceived.toLocaleString()} (ไม่หักค้ำ)
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {isAlive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          มือเป็น
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          มือตาย
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right border-l border-gray-100 bg-gray-50/30">
                      {!isTao ? (
                        <span className="font-bold text-gray-700">
                          ฿{share.installmentAmount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right bg-gray-50/30">
                      {!isTao ? (
                        hasPaidThisPeriod ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-gray-500 font-medium">
                              {prevPaid.toLocaleString()} +{" "}
                              {share.installmentAmount.toLocaleString()} =
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              ฿{hand.totalPaid.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-gray-800 text-sm">
                              ฿{hand.totalPaid.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-orange-500 font-semibold mt-0.5">
                              รอรับยอด
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {isAlive ? (
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
                          <span className="text-[10px] text-gray-500 font-medium">
                            หนี้คงเหลือ (หักค้ำ)
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {isTao ? (
                        <span className="text-[11px] text-gray-400 font-semibold bg-gray-100 px-3 py-1.5 rounded-lg cursor-not-allowed">
                          ข้าม
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => togglePaidStatus(hand)}
                          disabled={
                            isProcessing || share.status === "completed"
                          }
                          className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all border cursor-pointer ${
                            hasPaidThisPeriod
                              ? "bg-green-600 border-green-600 text-white shadow-sm"
                              : "bg-white border-gray-300 text-gray-300 hover:border-green-500 hover:text-green-600"
                          } disabled:opacity-50`}
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
                  {/* 🌟 เปลี่ยนหัวตารางเป็น "ยอดสุทธิ (ทั้งวง)" */}
                  <th className="px-6 py-4 font-semibold text-right">
                    ยอดสุทธิ (ทั้งวง)
                  </th>
                  <th className="px-6 py-4 font-semibold text-center w-[200px]">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eligibleCandidates.map((cand) => {
                  const hasSkipped =
                    cand.skippedPeriods?.includes(currentPeriod);

                  // 🌟 ดึงยอดสุทธิของลูกค้าคนนี้มาโชว์
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
                        </div>
                      </td>

                      {/* 🌟 แสดงยอดสุทธิสีเขียว-แดง */}
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
      {/* 🌟 MODAL: ใบสรุปรายชื่อ (โชว์คนสละสิทธิ์ด้วย) */}
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
