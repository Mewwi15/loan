"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Calculator,
  Landmark,
  HandCoins,
  ArrowDownToLine,
  Download,
} from "lucide-react";

export default function ShareSummaryPage() {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ผลรวมทั้งหมดของทุกวง
  const [grandTotal, setGrandTotal] = useState({
    normalDead: 0,
    closedPayoff: 0,
    total: 0,
  });

  useEffect(() => {
    // 1. ดึงเฉพาะวงแชร์ที่กำลังดำเนินการ (Active)
    const qShares = query(
      collection(db, "shares"),
      where("status", "==", "active"),
    );
    const unsubShares = onSnapshot(qShares, (sharesSnap) => {
      const activeShares = sharesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      if (activeShares.length === 0) {
        setSummaryData([]);
        setLoading(false);
        return;
      }

      // 2. ดึงข้อมูลลูกแชร์เฉพาะสถานะ dead และ closed
      const qHands = query(
        collection(db, "share_hands"),
        where("status", "in", ["dead", "closed"]),
      );
      const unsubHands = onSnapshot(qHands, (handsSnap) => {
        const relevantHands = handsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        let sumNormal = 0;
        let sumClosed = 0;
        const resultData = [];

        activeShares.forEach((share) => {
          const shareHands = relevantHands.filter(
            (h) => h.shareId === share.id,
          );

          // ==========================================
          // 🟢 ก้อนที่ 1: มือตายปกติ (ค้ำท้าย 3 งวด)
          // ==========================================
          const normalDeadHands = shareHands.filter(
            (h) => h.status === "dead" && h.handNumber !== 1,
          );
          const normalAccumulation =
            normalDeadHands.length * (share.installmentAmount * 3);

          // ==========================================
          // 🔵 ก้อนที่ 2: ปิดวงไปแล้ว (ลอจิกใหม่จากบอส!)
          // ==========================================
          const closedHands = shareHands.filter((h) => h.status === "closed");

          // หางวดที่เหลือ (รวมงวดปัจจุบันด้วย) เช่น งวด 15 จาก 21 งวด = (21 - 15) + 1 = 7 งวด
          // ใส่ Math.max กันเหนียวไว้เผื่อวงแชร์รวนไปงวดที่เกินกว่าจำนวนมือ
          const remainingPeriods = Math.max(
            0,
            share.totalHands - share.currentPeriod + 1,
          );

          // จำนวนคนที่ปิดวง x งวดที่เหลือ x ยอดส่งต่องวด
          const closedAccumulation =
            closedHands.length * remainingPeriods * share.installmentAmount;

          const totalShareAccumulation =
            normalAccumulation + closedAccumulation;

          // เก็บข้อมูลลงตารางก็ต่อเมื่อวงนั้นมียอดสะสม
          if (totalShareAccumulation > 0) {
            sumNormal += normalAccumulation;
            sumClosed += closedAccumulation;

            resultData.push({
              id: share.id,
              name: share.name,
              normalAccumulation,
              closedAccumulation,
              totalAccumulation: totalShareAccumulation,
            });
          }
        });

        // จัดเรียงตามชื่อวงแชร์ (ก-ฮ)
        resultData.sort((a, b) => a.name.localeCompare(b.name));

        setSummaryData(resultData);
        setGrandTotal({
          normalDead: sumNormal,
          closedPayoff: sumClosed,
          total: sumNormal + sumClosed,
        });
        setLoading(false);
      });

      return () => unsubHands();
    });

    return () => unsubShares();
  }, []);

  const exportToCSV = () => {
    const headers = [
      "ลำดับ",
      "ชื่อวงแชร์",
      "ยอดสะสมมือตาย (ปกติ)",
      "ยอดสะสมโปะ (ปิดวง)",
      "รวมยอดสุทธิ",
    ];

    const rows = summaryData.map((data, index) => [
      index + 1,
      `"${data.name}"`,
      data.normalAccumulation,
      data.closedAccumulation,
      data.totalAccumulation,
    ]);

    rows.push([
      "",
      '"รวมทั้งสิ้น"',
      grandTotal.normalDead,
      grandTotal.closedPayoff,
      grandTotal.total,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `สรุปยอดสะสมท้าวแชร์_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-bold text-xs uppercase tracking-widest">
          กำลังดึงข้อมูลและคำนวณ...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-8 font-sans animate-in fade-in duration-500 bg-gray-50/30 min-h-screen">
      {/* --- Header Section --- */}
      <div className="pt-10 pb-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Link
            href="/shares"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-amber-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> กลับไปแผงควบคุมวงแชร์
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Landmark className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                สรุปยอดเงินสะสมท้าวแชร์
              </h1>
              <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">
                เงินค้ำประกัน และ ยอดโปะปิดวง
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          disabled={summaryData.length === 0}
          className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-green-700 hover:border-green-300 px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> ส่งออก Excel
        </button>
      </div>

      {/* --- Grand Total Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200 transition-transform hover:-translate-y-1">
          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1.5">
            <HandCoins className="w-3.5 h-3.5" /> ยอดสะสม (มือตายปกติ)
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{grandTotal.normalDead.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200 transition-transform hover:-translate-y-1">
          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1.5">
            <ArrowDownToLine className="w-3.5 h-3.5" /> ยอดสะสม (ปิดวง)
          </p>
          <p className="text-2xl font-black text-gray-800">
            ฿{grandTotal.closedPayoff.toLocaleString()}
          </p>
        </div>
        <div className="bg-amber-50 rounded-[1.5rem] p-6 shadow-md border border-amber-200 transition-transform hover:-translate-y-1">
          <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-1 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> รวมยอดสะสมทั้งหมด
          </p>
          <p className="text-3xl font-black text-amber-700">
            ฿{grandTotal.total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">ตารางแจกแจงรายวง</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                <th className="px-6 py-4 font-bold text-gray-500 w-16 text-center">
                  #
                </th>
                <th className="px-6 py-4 font-bold text-gray-500">
                  ชื่อวงแชร์
                </th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">
                  สะสม (ปกติ)
                </th>
                <th className="px-6 py-4 font-bold text-gray-500 text-right">
                  สะสม (ปิดวง)
                </th>
                <th className="px-6 py-4 font-bold text-gray-800 text-right bg-gray-50">
                  รวมยอดสุทธิ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summaryData.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-10 text-center text-gray-400 font-bold"
                  >
                    ยังไม่มียอดสะสมในขณะนี้
                  </td>
                </tr>
              ) : (
                summaryData.map((data, index) => (
                  <tr
                    key={data.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-center font-bold text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-800">
                      {data.name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600">
                      ฿{data.normalAccumulation.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-600">
                      ฿{data.closedAccumulation.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-amber-600 bg-amber-50/30">
                      ฿{data.totalAccumulation.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {summaryData.length > 0 && (
              <tfoot className="bg-gray-900 text-white font-black">
                <tr>
                  <td
                    colSpan="2"
                    className="px-6 py-4 text-right uppercase tracking-widest text-xs"
                  >
                    รวมทั้งสิ้น
                  </td>
                  <td className="px-6 py-4 text-right">
                    ฿{grandTotal.normalDead.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ฿{grandTotal.closedPayoff.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-amber-400 text-lg">
                    ฿{grandTotal.total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
