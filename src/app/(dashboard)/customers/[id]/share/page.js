"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  User,
  HandCoins,
  Clock,
  AlertCircle,
  Calculator,
  CheckCircle2,
} from "lucide-react";

export default function CustomerSharesProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState(null);
  const [hands, setHands] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 1. ดึงข้อมูลลูกค้า และ มือแชร์ที่เขาถืออยู่
  // ==========================================
  useEffect(() => {
    if (!customerId) return;

    // ดึงข้อมูลลูกค้า
    const unsubCustomer = onSnapshot(
      doc(db, "customers", customerId),
      (docSnap) => {
        if (docSnap.exists()) {
          setCustomer({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert("ไม่พบข้อมูลลูกค้านี้");
          router.push("/customers");
        }
      },
    );

    // ดึงข้อมูลรายมือที่ลูกค้านี้ถืออยู่ทั้งหมด
    const qHands = query(
      collection(db, "share_hands"),
      where("customerId", "==", customerId),
    );
    const unsubHands = onSnapshot(qHands, async (handsSnap) => {
      const handsData = handsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ถอดรหัสวงแชร์ (shareId) ที่ไม่ซ้ำกัน เพื่อไปดึงรายละเอียดวง
      const uniqueShareIds = [...new Set(handsData.map((h) => h.shareId))];

      if (uniqueShareIds.length === 0) {
        setHands([]);
        setLoading(false);
        return;
      }

      try {
        const sharesPromises = uniqueShareIds.map((id) =>
          getDoc(doc(db, "shares", id)),
        );
        const sharesSnaps = await Promise.all(sharesPromises);

        const sharesMap = {};
        sharesSnaps.forEach((s) => {
          if (s.exists()) sharesMap[s.id] = s.data();
        });

        // นำข้อมูลมือแชร์ มาประกบกับ ข้อมูลวงแชร์
        const mergedHands = handsData
          .map((h) => ({
            ...h,
            shareDetails: sharesMap[h.shareId] || null,
          }))
          .filter((h) => h.shareDetails); // กรองเฉพาะวงที่ยังมีอยู่

        // 🌟 ลอจิกใหม่: จัดเรียงตามสถานะ (มือเป็น -> มือตาย -> ปิดบัญชี) แล้วค่อยเรียงตามชื่อวง
        mergedHands.sort((a, b) => {
          // 1. ให้คะแนนสถานะ (Status Priority)
          const getStatusScore = (status) => {
            if (status === "alive") return 1; // มือเป็น (ขึ้นก่อน)
            if (status === "dead") return 2; // มือตาย (อันดับสอง)
            return 3; // closed (ไว้ล่างสุด)
          };

          const scoreA = getStatusScore(a.status);
          const scoreB = getStatusScore(b.status);

          // ถ้าสถานะต่างกัน ให้เรียงตามคะแนนสถานะ
          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }

          // 2. ถ้าสถานะเดียวกัน ให้เรียงตามชื่อวง
          if (a.shareName !== b.shareName) {
            return a.shareName.localeCompare(b.shareName);
          }

          // 3. ถ้าชื่อวงเดียวกัน ให้เรียงตามมือที่
          return a.handNumber - b.handNumber;
        });

        setHands(mergedHands);
      } catch (error) {
        console.error("Error fetching share details:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubCustomer();
      unsubHands();
    };
  }, [customerId, router]);

  if (loading || !customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="font-semibold text-sm">กำลังโหลดข้อมูลประวัติแชร์...</p>
      </div>
    );
  }

  // ==========================================
  // 🧮 คำนวณสรุปยอด (เฉพาะวงที่กำลังดำเนินการ)
  // ==========================================
  const activeHands = hands.filter((h) => h.shareDetails.status === "active");
  const completedHands = hands.filter(
    (h) => h.shareDetails.status === "completed",
  );

  let totalAliveSaved = 0; // ยอดรวมมือเป็น (เงินออม)
  let totalDeadDebt = 0; // ยอดรวมมือตาย (หนี้สิน)

  activeHands.forEach((h) => {
    const shareData = h.shareDetails;
    const isTao = h.handNumber === 1;
    const isAlive = h.status === "alive";
    const isClosed = h.status === "closed";

    const realTotalPaid =
      (h.paidPeriods?.length || 0) * shareData.installmentAmount;

    if (isClosed) return; // ปิดวงแล้ว ข้ามการคิดยอด

    if (isAlive) {
      totalAliveSaved += realTotalPaid;
    } else if (h.status === "dead" && !isTao) {
      const totalCollected = shareData.installmentAmount * shareData.totalHands;
      const standardGuaranteeDeduction = shareData.installmentAmount * 3;
      const totalObligation = totalCollected - standardGuaranteeDeduction;

      let debt = totalObligation - realTotalPaid;
      if (debt < 0) debt = 0;
      totalDeadDebt += debt;
    }
  });

  const netBalance = totalAliveSaved - totalDeadDebt;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 bg-gray-50/30 min-h-screen">
      {/* --- Header Section --- */}
      <div className="pt-8 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link
            href={`/customers/${customerId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> กลับไปหน้าโปรไฟล์ลูกค้า
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">
                {customer.name}{" "}
                {customer.nickname ? `(${customer.nickname})` : ""}
              </h1>
              <p className="text-sm font-semibold text-gray-500 mt-1">
                รหัสลูกค้า: {customer.code || "-"} | ประวัติการเล่นแชร์
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- 📝 ตารางรายละเอียดแต่ละวง --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                รายละเอียดวงแชร์ที่กำลังเดิน
              </h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                แสดงสถานะและยอดเงิน แยกตามกลุ่ม (มือเป็น, มือตาย, ปิดแล้ว)
              </p>
            </div>
          </div>
          <div className="text-sm font-bold text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            กำลังเล่น {activeHands.length} มือ
          </div>
        </div>

        {activeHands.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-bold text-gray-500">
              ลูกค้านี้ไม่มีวงแชร์ที่กำลังดำเนินการ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border-b border-gray-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="px-6 py-4 font-semibold">ชื่อวงแชร์</th>
                  <th className="px-6 py-4 font-semibold text-center">
                    มือที่
                  </th>
                  <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    ส่งงวดละ
                  </th>
                  <th className="px-6 py-4 font-semibold text-right">
                    ยอดสะสมที่จ่ายแล้ว
                  </th>
                  <th className="px-6 py-4 font-semibold text-right bg-gray-50/80">
                    ยอดออม / หนี้คงเหลือ
                  </th>
                  <th className="px-6 py-4 font-semibold text-center w-28">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeHands.map((hand, index, array) => {
                  const shareData = hand.shareDetails;
                  const isAlive = hand.status === "alive";
                  const isClosed = hand.status === "closed";
                  const isDead = hand.status === "dead";
                  const isTao = hand.handNumber === 1;

                  const realTotalPaid =
                    (hand.paidPeriods?.length || 0) *
                    shareData.installmentAmount;

                  const totalCollected =
                    shareData.installmentAmount * shareData.totalHands;
                  const guaranteeDeduction = shareData.installmentAmount * 3;
                  const totalObligation = totalCollected - guaranteeDeduction;

                  let currentRemainingDebt = totalObligation - realTotalPaid;
                  if (currentRemainingDebt < 0) currentRemainingDebt = 0;

                  const displayAmount = isAlive
                    ? realTotalPaid
                    : currentRemainingDebt;

                  // ตรวจสอบว่าต้องโชว์ Header ของกลุ่มสถานะนี้ไหม (Group Separator)
                  let showGroupHeader = false;
                  let groupTitle = "";
                  let groupColorClass = "";

                  if (index === 0) {
                    showGroupHeader = true;
                    if (isAlive) {
                      groupTitle = "กลุ่มมือเป็น (ออมเงิน)";
                      groupColorClass = "text-blue-600 bg-blue-50/50";
                    } else if (isDead) {
                      groupTitle = "กลุ่มมือตาย (ผ่อนหนี้)";
                      groupColorClass = "text-red-600 bg-red-50/50";
                    } else {
                      groupTitle = "ปิดบัญชีแล้ว";
                      groupColorClass = "text-emerald-600 bg-emerald-50/50";
                    }
                  } else {
                    const prevHand = array[index - 1];
                    if (prevHand.status !== hand.status) {
                      showGroupHeader = true;
                      if (isAlive) {
                        groupTitle = "กลุ่มมือเป็น (ออมเงิน)";
                        groupColorClass = "text-blue-600 bg-blue-50/50";
                      } else if (isDead) {
                        groupTitle = "กลุ่มมือตาย (ผ่อนหนี้)";
                        groupColorClass = "text-red-600 bg-red-50/50";
                      } else {
                        groupTitle = "ปิดบัญชีแล้ว";
                        groupColorClass = "text-emerald-600 bg-emerald-50/50";
                      }
                    }
                  }

                  return (
                    <React.Fragment key={hand.id}>
                      {/* 🌟 หัวข้อแยกกลุ่ม (Group Header) */}
                      {showGroupHeader && (
                        <tr>
                          <td
                            colSpan="7"
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest border-y border-gray-100 ${groupColorClass}`}
                          >
                            {groupTitle}
                          </td>
                        </tr>
                      )}

                      {/* ข้อมูลในตาราง */}
                      <tr
                        className={`transition-colors ${
                          isClosed
                            ? "bg-gray-50/50 opacity-80"
                            : "hover:bg-gray-50 bg-white"
                        }`}
                      >
                        <td
                          className="px-6 py-4 border-l-4"
                          style={{
                            borderColor: isAlive
                              ? "#3b82f6"
                              : isDead
                                ? "#ef4444"
                                : "#10b981",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className={`font-bold ${isClosed ? "text-gray-500 line-through decoration-gray-300" : "text-gray-900"}`}
                            >
                              {hand.shareName}
                            </p>
                            {isClosed && (
                              <span className="text-[10px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> โปะจบ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                            กองกลาง: ฿{shareData.poolAmount.toLocaleString()} |
                            งวด: {shareData.currentPeriod}/
                            {shareData.totalHands}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-center font-bold text-gray-600">
                          {hand.handNumber}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {isClosed ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ปิดบัญชีแล้ว
                            </span>
                          ) : isAlive ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-blue-50 text-blue-700 border border-blue-200">
                              มือเป็น
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-red-50 text-red-700 border border-red-200">
                              มือตาย
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-gray-700">
                          {!isTao && !isClosed
                            ? `฿${shareData.installmentAmount.toLocaleString()}`
                            : "-"}
                        </td>

                        <td className="px-6 py-4 text-right font-bold text-gray-500">
                          {isClosed
                            ? "เคลียร์แล้ว"
                            : `฿${realTotalPaid.toLocaleString()}`}
                        </td>

                        <td className="px-6 py-4 text-right bg-gray-50/30">
                          {isClosed ? (
                            <span className="text-emerald-500 font-bold">
                              -
                            </span>
                          ) : isTao ? (
                            <span className="text-gray-400 font-bold">
                              ไม่มีหนี้
                            </span>
                          ) : isAlive ? (
                            <div className="flex flex-col items-end">
                              <span className="font-black text-blue-600 text-base">
                                + ฿{displayAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-500 font-bold">
                                ยอดออมสะสม
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="font-black text-red-600 text-base">
                                - ฿{displayAmount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-500 font-bold">
                                หนี้คงเหลือ
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/shares/${hand.shareId}`}
                            className="inline-flex items-center justify-center w-full px-3 py-2 bg-white border border-gray-200 hover:border-blue-400  hover:text-blue-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            ไปที่วง
                          </Link>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 🌟 แถบสรุปยอดแนบท้ายตาราง (Summary Footer) */}
        {activeHands.length > 0 && (
          <div className="bg-gray-50 p-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  ยอดออมรวม (มือเป็น)
                </p>
                <p className="text-xl font-black text-blue-600">
                  + ฿{totalAliveSaved.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-10 bg-gray-200 hidden md:block"></div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  ยอดหนี้รวม (มือตาย)
                </p>
                <p className="text-xl font-black text-red-600">
                  - ฿{totalDeadDebt.toLocaleString()}
                </p>
              </div>
            </div>

            <div
              className={`w-full md:w-auto flex items-center justify-between md:justify-start gap-4 px-6 py-4 rounded-[1.2rem] border shadow-sm ${
                netBalance > 0
                  ? "bg-green-50 border-green-200"
                  : netBalance < 0
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator
                  className={`w-5 h-5 ${
                    netBalance > 0
                      ? "text-green-600"
                      : netBalance < 0
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                />
                <div>
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                      netBalance > 0
                        ? "text-green-700"
                        : netBalance < 0
                          ? "text-red-700"
                          : "text-gray-500"
                    }`}
                  >
                    สรุปสถานะสุทธิ (Balance)
                  </p>
                  <p
                    className={`text-2xl font-black leading-none ${
                      netBalance > 0
                        ? "text-green-700"
                        : netBalance < 0
                          ? "text-red-700"
                          : "text-gray-800"
                    }`}
                  >
                    {netBalance > 0 ? "+" : ""} ฿{netBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              {netBalance !== 0 && (
                <div
                  className={`text-[10px] font-bold px-2 py-1 rounded-md mt-1 shrink-0 ${
                    netBalance > 0
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {netBalance > 0 ? "เราเป็นฝ่ายติดเงิน" : "ลูกค้าเป็นหนี้เรา"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- 🕒 ประวัติวงที่จบแล้ว --- */}
      {completedHands.length > 0 && (
        <div className="pt-6">
          <h3 className="font-bold text-gray-500 mb-4 flex items-center gap-2 text-sm border-l-4 border-gray-300 pl-3">
            <Clock className="w-4 h-4" /> ประวัติวงแชร์ที่จบแล้ว (
            {completedHands.length} มือ)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70 hover:opacity-100 transition-opacity">
            {completedHands.map((hand) => (
              <div
                key={hand.id}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">
                    {hand.shareName}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-semibold mt-1 bg-gray-50 inline-block px-2 py-1 rounded">
                    มือที่ {hand.handNumber} | กองกลาง ฿
                    {hand.shareDetails?.poolAmount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
