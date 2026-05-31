"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { listReportDates, getReport } from "@/lib/bankData";
import { fmt } from "@/lib/bankReport";
import { ArrowLeft, Loader2, Calendar, Users, Landmark } from "lucide-react";

function groupBy(rows, key) {
  const map = {};
  for (const r of rows) {
    const g = r[key] || "อื่นๆ";
    if (!map[g]) map[g] = { key: g, count: 0, received: 0, withdrawn: 0, closing: 0, cumRemaining: 0, emoji: r.emoji };
    map[g].count++;
    map[g].received += Number(r.received) || 0;
    map[g].withdrawn += Number(r.withdrawn) || 0;
    map[g].closing += Number(r.closing) || 0;
    map[g].cumRemaining += Number(r.cumRemaining) || 0;
  }
  return Object.values(map).sort((a, b) => b.closing - a.closing);
}

export default function SummaryPage() {
  const [dates, setDates] = useState([]);
  const [date, setDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listReportDates().then((ds) => {
      setDates(ds);
      if (ds.length) setDate(ds[0]);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    getReport(date).then((r) => { setReport(r); setLoading(false); });
  }, [date]);

  const rows = report?.rows || [];
  const byOwner = useMemo(() => groupBy(rows, "owner"), [rows]);
  const byBank = useMemo(() => groupBy(rows, "bank"), [rows]);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-black text-gray-800">สรุปรายคน / ธนาคาร</h1>
          <p className="text-sm text-gray-500 font-bold">ยอดรวมแยกตามผู้ถือบัญชีและธนาคาร</p>
        </div>
      </div>

      {dates.length > 0 && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-fit">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select value={date} onChange={(e) => setDate(e.target.value)} className="font-black text-gray-800 outline-none bg-transparent">
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : !report ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center font-bold text-gray-400">ยังไม่มีข้อมูล</div>
      ) : (
        <>
          {/* per owner */}
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-gray-500 uppercase tracking-wider mb-3"><Users className="w-4 h-4" /> รายคน</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {byOwner.map((g) => (
                <div key={g.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black text-gray-800">{g.emoji} {g.key}</p>
                    <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{g.count} บัญชี</span>
                  </div>
                  <p className="text-2xl font-black text-gray-800 tabular-nums">฿{fmt(g.closing)}</p>
                  <p className="text-[11px] text-gray-400 font-bold">คงเหลือรวม</p>
                  <div className="flex justify-between mt-3 pt-3 border-t border-gray-50 text-xs font-bold">
                    <span className="text-emerald-600">+{fmt(g.received)}</span>
                    <span className="text-rose-500">−{fmt(g.withdrawn)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* per bank */}
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-gray-500 uppercase tracking-wider mb-3"><Landmark className="w-4 h-4" /> รายธนาคาร</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-black uppercase">
                    <th className="text-left px-4 py-3">ธนาคาร</th>
                    <th className="text-right px-4 py-3">บัญชี</th>
                    <th className="text-right px-4 py-3">รับโอน</th>
                    <th className="text-right px-4 py-3">หักถอน</th>
                    <th className="text-right px-4 py-3">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byBank.map((g) => (
                    <tr key={g.key} className="hover:bg-orange-50/40">
                      <td className="px-4 py-3 font-black text-gray-800">{g.key}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-400">{g.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-bold">{fmt(g.received)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600 font-bold">{fmt(g.withdrawn)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-black text-gray-800">{fmt(g.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
