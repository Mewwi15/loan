"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { listReports } from "@/lib/bankData";
import { fmt } from "@/lib/bankReport";
import { ArrowLeft, Loader2, TrendingUp, BarChart3 } from "lucide-react";

export default function HistoryPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("received");

  useEffect(() => {
    listReports(400).then((rs) => {
      setReports(rs.slice().reverse()); // oldest → newest for the chart
      setLoading(false);
    });
  }, []);

  const series = useMemo(
    () => reports.map((r) => ({
      date: r.date,
      received: r.totals?.received || 0,
      withdrawn: r.totals?.withdrawn || 0,
      closing: r.totals?.closing || 0,
      cumRemaining: r.totals?.cumRemaining || 0,
    })),
    [reports],
  );

  const METRICS = {
    received: { label: "ยอดรับโอน", color: "#10b981" },
    withdrawn: { label: "ยอดหักถอน", color: "#f43f5e" },
    closing: { label: "ยอดคงเหลือ", color: "#3b82f6" },
    cumRemaining: { label: "ยอดสะสมคงเหลือ", color: "#f97316" },
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-black text-gray-800">ประวัติย้อนหลัง</h1>
          <p className="text-sm text-gray-500 font-bold">แนวโน้มยอดรวมรายวัน · {reports.length} วัน</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center font-bold text-gray-400">ยังไม่มีข้อมูล</div>
      ) : (
        <>
          {/* metric toggle */}
          <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
            {Object.entries(METRICS).map(([k, m]) => (
              <button key={k} onClick={() => setMetric(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-black transition-all ${metric === k ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={metric === k ? { background: m.color } : {}}>
                {m.label}
              </button>
            ))}
          </div>

          <Chart series={series} field={metric} color={METRICS[metric].color} />

          {/* daily totals table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 text-gray-500 text-xs font-black uppercase">
                    <th className="text-left px-4 py-3">วันที่</th>
                    <th className="text-right px-4 py-3">รับโอน</th>
                    <th className="text-right px-4 py-3">หักถอน</th>
                    <th className="text-right px-4 py-3">คงเหลือ</th>
                    <th className="text-right px-4 py-3">สะสมคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {series.slice().reverse().map((s) => (
                    <tr key={s.date} className="hover:bg-orange-50/40">
                      <td className="px-4 py-2.5 font-black text-gray-800">
                        <Link href={`/reports?d=${s.date}`} className="hover:text-orange-600">{s.date}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-bold">{fmt(s.received)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-600 font-bold">{fmt(s.withdrawn)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-black text-gray-800">{fmt(s.closing)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-orange-600 font-bold">{fmt(s.cumRemaining)}</td>
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

// simple inline SVG bar chart
function Chart({ series, field, color }) {
  const W = 1000, H = 280, pad = 10;
  const max = Math.max(1, ...series.map((s) => s[field]));
  const n = series.length;
  const bw = Math.max(2, (W - pad * 2) / n - 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 text-gray-500 font-black text-sm">
        <BarChart3 className="w-4 h-4" /> สูงสุด ฿{fmt(max)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }} preserveAspectRatio="none">
        {series.map((s, i) => {
          const h = (s[field] / max) * (H - pad * 2);
          const x = pad + i * ((W - pad * 2) / n);
          return (
            <rect key={i} x={x} y={H - pad - h} width={bw} height={h} rx="2" fill={color} opacity="0.85">
              <title>{s.date}: ฿{fmt(s[field])}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
