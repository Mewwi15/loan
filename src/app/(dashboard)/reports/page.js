"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { listReportDates, getReport, getPrevReport } from "@/lib/bankData";
import { fmt, sumRows, OWNERS, carryOverRows, todayBangkok } from "@/lib/bankReport";
import {
  Upload, Users, Loader2,
  Calendar, FileSpreadsheet, Eye, EyeOff, CalendarX, CalendarPlus, PencilLine,
} from "lucide-react";

export default function ReportsPage() {
  const [dates, setDates] = useState([]);
  const [date, setDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("ทั้งหมด");
  const [detailed, setDetailed] = useState(false);
  const [draftFrom, setDraftFrom] = useState(""); // ถ้าวันนี้เป็นร่างยกยอด = วันที่ยกมา
  const dateRef = useRef(null);

  useEffect(() => {
    (async () => {
      const ds = await listReportDates();
      setDates(ds);
      if (ds.length) {
        // default = วันนี้จริง (เวลาไทย) ถ้าเลยวันล่าสุดที่บันทึกแล้ว → โชว์ร่างยกยอดอัตโนมัติ
        const today = todayBangkok();
        setDate(today > ds[0] ? today : ds[0]);
      } else setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    (async () => {
      const r = await getReport(date);
      if (r) {
        setReport(r);
        setDraftFrom("");
      } else {
        // ยังไม่มีข้อมูลวันนี้ → ยกยอดจากวันก่อนหน้ามาแสดงเป็นร่าง (auto)
        const prev = await getPrevReport(date);
        if (prev?.rows?.length) {
          const rows = carryOverRows(prev.rows);
          setReport({ date, rows, totals: sumRows(rows), _draft: true });
          setDraftFrom(prev.date);
        } else {
          setReport(null);
          setDraftFrom("");
        }
      }
      setLoading(false);
    })();
  }, [date]);

  const rows = report?.rows || [];
  const owners = useMemo(
    () => ["ทั้งหมด", ...OWNERS.filter((o) => rows.some((r) => r.owner === o))],
    [rows],
  );
  const shown = ownerFilter === "ทั้งหมด" ? rows : rows.filter((r) => r.owner === ownerFilter);
  const totals = useMemo(() => sumRows(shown), [shown]);

  const groups = useMemo(() => {
    const map = {};
    for (const r of shown) (map[r.owner || "อื่นๆ"] ||= []).push(r);
    return Object.entries(map)
      .sort((a, b) => OWNERS.indexOf(a[0]) - OWNERS.indexOf(b[0]))
      .map(([owner, rs]) => ({ owner, rows: rs, totals: sumRows(rs), emoji: rs[0]?.emoji }));
  }, [shown]);

  const noData = !loading && dates.length > 0 && !report;

  return (
    <div className="p-4 lg:p-8 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">รายงานยอดธนาคาร</h1>
          <p className="text-sm text-gray-600 font-bold">ยอดรับ-ถอน-คงเหลือ รายวัน แยกตามบัญชี</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/reports/entry${date ? `?date=${date}` : ""}`} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-95">
            <PencilLine className="w-4 h-4" /> กรอกข้อมูล
          </Link>
          <NavBtn href="/reports/import" icon={Upload} label="นำเข้า" />
          <NavBtn href="/reports/summary" icon={Users} label="สรุปรายคน" />
        </div>
      </div>

      {/* empty (no reports at all) */}
      {!loading && dates.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-orange-500" />
          </div>
          <p className="font-black text-gray-700 mb-1">ยังไม่มีรายงาน</p>
          <p className="text-sm text-gray-600 font-bold mb-5">เริ่มจากนำเข้าไฟล์ Excel เดิม หรือกรอกข้อมูลวันนี้</p>
          <div className="flex justify-center gap-2">
            <Link href="/reports/import" className="px-5 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm">นำเข้า Excel</Link>
            <Link href="/reports/entry" className="px-5 py-3 bg-orange-500 text-white rounded-2xl font-black text-sm">กรอกวันนี้</Link>
          </div>
        </div>
      )}

      {dates.length > 0 && (
        <>
          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* calendar date picker (native, fully clickable) */}
            <div
              onClick={() => { const el = dateRef.current; el?.showPicker ? el.showPicker() : el?.focus(); }}
              className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl pl-3.5 pr-3 py-2.5 shadow-sm hover:border-orange-300 cursor-pointer transition-colors"
            >
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <input
                ref={dateRef}
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="font-black text-gray-800 tabular-nums bg-transparent outline-none cursor-pointer"
              />
            </div>

            {/* owner segmented control */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {owners.map((o) => (
                <button key={o} onClick={() => setOwnerFilter(o)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-black transition-all ${
                    ownerFilter === o ? "bg-orange-500 text-white shadow" : "text-gray-600 hover:bg-gray-100"
                  }`}>{o}</button>
              ))}
            </div>

            <button onClick={() => setDetailed((v) => !v)} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-700 font-black text-sm transition-colors">
              {detailed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {detailed ? "ย่อ" : "ทุกคอลัมน์"}
            </button>
          </div>

          {/* ── Draft (auto carried-over) banner ── */}
          {draftFrom && !loading && (
            <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <span className="flex items-center gap-2 text-amber-700 font-black text-sm">
                <CalendarPlus className="w-4 h-4" /> ยกยอดอัตโนมัติจาก {draftFrom} · ยังไม่ได้กรอกยอดรับ-ถอน (ร่าง)
              </span>
              <Link href={`/reports/entry?date=${date}`} className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm transition-all active:scale-95">
                <PencilLine className="w-4 h-4" /> กรอกยอดวันนี้
              </Link>
            </div>
          )}

          {/* ── Summary cards ── */}
          {!noData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SumCard label="ยอดรับโอน" value={totals.received} accent="#10b981" sign="+" />
              <SumCard label="ยอดหักถอน" value={totals.withdrawn} accent="#f43f5e" sign="−" />
              <SumCard label="ยอดคงเหลือ" value={totals.closing} accent="#3b82f6" />
              <SumCard label="ยอดสะสมคงเหลือ" value={totals.cumRemaining} accent="#f97316" />
            </div>
          )}

          {/* ── Body ── */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
          ) : noData ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <CalendarX className="w-8 h-8 text-gray-500" />
              </div>
              <p className="font-black text-gray-700 mb-1">ไม่มีข้อมูลวันที่ {date}</p>
              <p className="text-sm text-gray-600 font-bold mb-5">เลือกวันอื่น หรือกรอกข้อมูลของวันนี้</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setDate(dates[0])} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm">ไปวันล่าสุด ({dates[0]})</button>
                <Link href="/reports/entry" className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm">กรอกวันนี้</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.owner} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{g.emoji}</span>
                      <span className="font-black text-gray-800">{g.owner || "อื่นๆ"}</span>
                      <span className="text-[11px] font-black text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">{g.rows.length} บัญชี</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">คงเหลือรวม</p>
                      <p className="font-black text-gray-800 tabular-nums">฿{fmt(g.totals.closing)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[15px] whitespace-nowrap">
                      <thead>
                        <tr className="text-gray-500 text-[11px] font-black uppercase">
                          <th className="text-left px-5 py-2.5">ธนาคาร</th>
                          {detailed && <th className="text-right px-4 py-2.5">ยกมา</th>}
                          <th className="text-right px-4 py-2.5">รับโอน</th>
                          <th className="text-right px-4 py-2.5">หักถอน</th>
                          <th className="text-right px-4 py-2.5">คงเหลือ</th>
                          {detailed && <th className="text-right px-4 py-2.5">ครั้งยกมา</th>}
                          {detailed && <th className="text-right px-4 py-2.5">ครั้งนี้</th>}
                          {detailed && <th className="text-right px-4 py-2.5">ครั้งสะสม</th>}
                          {detailed && <th className="text-right px-4 py-2.5">สะสม</th>}
                          <th className="text-right px-5 py-2.5">สะสมคงเหลือ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {g.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-orange-50/40 transition-colors">
                            <td className="px-5 py-3.5 font-black text-gray-800">{r.emoji} {r.bank}</td>
                            {detailed && <td className="px-4 py-3.5 text-right tabular-nums text-gray-500">{fmt(r.opening)}</td>}
                            <td className="px-4 py-3.5 text-right tabular-nums text-emerald-600 font-bold">{fmt(r.received)}</td>
                            <td className="px-4 py-3.5 text-right tabular-nums text-rose-600 font-bold">{fmt(r.withdrawn)}</td>
                            <td className="px-4 py-3.5 text-right tabular-nums font-black text-gray-800">{fmt(r.closing)}</td>
                            {detailed && <td className="px-4 py-3.5 text-right tabular-nums text-gray-500">{r.countCarry}</td>}
                            {detailed && <td className="px-4 py-3.5 text-right tabular-nums text-gray-500">{r.count}</td>}
                            {detailed && <td className="px-4 py-3.5 text-right tabular-nums text-gray-500">{r.countCum}</td>}
                            {detailed && <td className="px-4 py-3.5 text-right tabular-nums text-gray-500">{fmt(r.cumAmount)}</td>}
                            <td className="px-5 py-3.5 text-right tabular-nums text-blue-600 font-bold">{fmt(r.cumRemaining)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/70 font-black text-gray-600">
                          <td className="px-5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500">รวม {g.owner}</td>
                          {detailed && <td className="px-4 py-2.5 text-right tabular-nums">{fmt(g.totals.opening)}</td>}
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{fmt(g.totals.received)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-rose-600">{fmt(g.totals.withdrawn)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{fmt(g.totals.closing)}</td>
                          {detailed && <td className="px-4 py-2.5 text-right tabular-nums">{g.totals.countCarry}</td>}
                          {detailed && <td className="px-4 py-2.5 text-right tabular-nums">{g.totals.count}</td>}
                          {detailed && <td className="px-4 py-2.5 text-right tabular-nums">{g.totals.countCum}</td>}
                          {detailed && <td className="px-4 py-2.5 text-right tabular-nums">{fmt(g.totals.cumAmount)}</td>}
                          <td className="px-5 py-2.5 text-right tabular-nums text-blue-600">{fmt(g.totals.cumRemaining)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* grand total */}
              <div className="bg-gray-900 text-white rounded-2xl shadow-lg px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <span className="font-black text-sm">รวมทั้งหมด · {shown.length} บัญชี</span>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-black tabular-nums">
                  <span className="text-gray-400">รับ <span className="text-emerald-300">฿{fmt(totals.received)}</span></span>
                  <span className="text-gray-400">ถอน <span className="text-rose-300">฿{fmt(totals.withdrawn)}</span></span>
                  <span className="text-gray-400">คงเหลือ <span className="text-blue-300">฿{fmt(totals.closing)}</span></span>
                  <span className="text-gray-400">สะสม <span className="text-orange-300">฿{fmt(totals.cumRemaining)}</span></span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NavBtn({ href, icon: Icon, label }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 rounded-xl font-black text-sm transition-all">
      <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function SumCard({ label, value, accent, sign }) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 pl-5 overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: accent }} />
      <p className="text-xs font-bold text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-black tabular-nums tracking-tight" style={{ color: accent }}>
        {sign || ""}฿{fmt(value)}
      </p>
    </div>
  );
}
