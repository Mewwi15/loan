"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getReport, getPrevReport, saveReport } from "@/lib/bankData";
import { computeRow, sumRows, carryOverRows, fmt, addDays, OWNERS } from "@/lib/bankReport";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, Calendar, Info,
  ChevronLeft, ChevronRight, Plus, Trash2, X,
} from "lucide-react";

const today = () => new Date().toISOString().split("T")[0];
const EMOJI_BY_OWNER = { จุ๊บ: "💚", มอส: "🩶", มิว: "💙", จำปา: "💛" };

export default function EntryPage() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState("");
  const [adding, setAdding] = useState(false);
  const [newAcc, setNewAcc] = useState({ bank: "", owner: OWNERS[0] });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("date");
    if (p) setDate(p);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setSaved(false);
      const existing = await getReport(date);
      if (existing?.rows?.length) {
        setRows(existing.rows.map(computeRow));
        setSource("แก้ไขรายงานเดิมของวันนี้");
      } else {
        const prev = await getPrevReport(date);
        if (prev?.rows?.length) {
          setRows(carryOverRows(prev.rows));
          setSource(`ยกยอดมาจากวันที่ ${prev.date}`);
        } else {
          setRows([]);
          setSource("ยังไม่มีข้อมูลก่อนหน้า — นำเข้า Excel ก่อน หรือเพิ่มบัญชีเอง");
        }
      }
      setLoading(false);
    })();
  }, [date]);

  const update = (idx, field, val) =>
    setRows((prev) => {
      const next = [...prev];
      next[idx] = computeRow({ ...next[idx], [field]: val });
      return next;
    });

  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const addAccount = () => {
    if (!newAcc.bank.trim()) return;
    const emoji = EMOJI_BY_OWNER[newAcc.owner] || "🏦";
    setRows((prev) => [
      ...prev,
      computeRow({
        name: `${newAcc.bank.trim()} ${newAcc.owner} ${emoji}`,
        bank: newAcc.bank.trim(), owner: newAcc.owner, emoji,
        opening: 0, received: 0, withdrawn: 0, count: 0, countCarry: 0, cumAmount: 0,
        _isNew: true,
      }),
    ]);
    setNewAcc({ bank: "", owner: newAcc.owner });
    setAdding(false);
  };

  const totals = sumRows(rows);

  // group by owner
  const groups = useMemo(() => {
    const map = {};
    rows.forEach((r, idx) => (map[r.owner || "อื่นๆ"] ||= []).push({ r, idx }));
    return Object.entries(map)
      .sort((a, b) => OWNERS.indexOf(a[0]) - OWNERS.indexOf(b[0]))
      .map(([owner, items]) => ({ owner, items, emoji: items[0]?.r.emoji }));
  }, [rows]);

  const save = async () => {
    setSaving(true);
    await saveReport(date, rows.map(computeRow));
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="p-4 lg:p-8 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 shrink-0"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-800 truncate">กรอกยอดประจำวัน</h1>
          <p className="text-sm text-gray-500 font-bold">ใส่ยอดรับ-ถอน ระบบคำนวณคงเหลือ/สะสมให้</p>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setDate(addDays(date, -1))} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
          <div onClick={(e) => { const el = e.currentTarget.querySelector("input"); el?.showPicker ? el.showPicker() : el?.focus(); }}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-orange-300 transition-colors">
            <Calendar className="w-4 h-4 text-orange-500" />
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="font-black text-gray-800 outline-none bg-transparent tabular-nums cursor-pointer" />
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all active:scale-95"><ChevronRight className="w-5 h-5" /></button>
        </div>
        {source && (
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl">
            <Info className="w-4 h-4 shrink-0" /> {source}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          {/* account cards grouped by owner */}
          {groups.map((g) => (
            <div key={g.owner} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">{g.emoji}</span>
                <span className="font-black text-gray-700">{g.owner || "อื่นๆ"}</span>
                <span className="text-[11px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{g.items.length}</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                {g.items.map(({ r, idx }) => (
                  <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    {/* card head */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-black text-gray-800 truncate">{r.emoji} {r.bank}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400 font-bold">ยกมา <span className="text-gray-700">{fmt(r.opening)}</span></span>
                        {r._isNew && (
                          <button onClick={() => removeRow(idx)} className="p-1 text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>

                    {/* inputs */}
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="รับโอน" value={r.received} onChange={(v) => update(idx, "received", v)} accent="emerald" />
                      <Field label="หักถอน" value={r.withdrawn} onChange={(v) => update(idx, "withdrawn", v)} accent="rose" />
                      <Field label="ครั้ง" value={r.count} onChange={(v) => update(idx, "count", v)} accent="gray" />
                    </div>

                    {/* computed */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-sm">
                      <span className="text-gray-500 font-bold">คงเหลือ <span className="text-gray-900 font-black tabular-nums">{fmt(r.closing)}</span></span>
                      <span className="text-gray-500 font-bold">สะสมคงเหลือ <span className="text-blue-600 font-black tabular-nums">{fmt(r.cumRemaining)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* add new account */}
          {adding ? (
            <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-black text-gray-400 uppercase">ชื่อธนาคาร</label>
                <input autoFocus value={newAcc.bank} onChange={(e) => setNewAcc({ ...newAcc, bank: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addAccount()}
                  placeholder="เช่น กสิกร, scb, TTB"
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-800 outline-none focus:border-orange-400 focus:bg-white" />
              </div>
              <div className="min-w-[120px]">
                <label className="text-[11px] font-black text-gray-400 uppercase">เจ้าของ</label>
                <select value={newAcc.owner} onChange={(e) => setNewAcc({ ...newAcc, owner: e.target.value })}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-black text-gray-800 outline-none focus:border-orange-400">
                  {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <button onClick={addAccount} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm">เพิ่ม</button>
              <button onClick={() => setAdding(false)} className="p-2.5 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-dashed border-gray-200 hover:border-orange-300 text-gray-500 hover:text-orange-600 rounded-2xl font-black text-sm transition-all">
              <Plus className="w-5 h-5" /> เพิ่มบัญชีใหม่
            </button>
          )}

          {rows.length === 0 && !adding && (
            <p className="text-center text-sm text-gray-400 font-bold">นำเข้า Excel ก่อน หรือกด &quot;เพิ่มบัญชีใหม่&quot;</p>
          )}
        </>
      )}

      {/* sticky save bar */}
      {!loading && rows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 xl:left-64 bg-white/90 backdrop-blur border-t border-gray-100 px-4 py-3 z-20">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="hidden sm:flex flex-wrap gap-x-5 gap-y-0.5 text-xs font-black tabular-nums">
              <span className="text-gray-400">รับ <span className="text-emerald-600">{fmt(totals.received)}</span></span>
              <span className="text-gray-400">ถอน <span className="text-rose-600">{fmt(totals.withdrawn)}</span></span>
              <span className="text-gray-400">คงเหลือ <span className="text-gray-800">{fmt(totals.closing)}</span></span>
            </div>
            <button onClick={save} disabled={saving}
              className="ml-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {saved ? "บันทึกแล้ว ✓" : `บันทึก ${date}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, accent }) {
  const focus = {
    emerald: "focus:border-emerald-400 text-emerald-700",
    rose: "focus:border-rose-400 text-rose-700",
    gray: "focus:border-gray-400 text-gray-700",
  }[accent];
  return (
    <div>
      <label className="block text-[11px] font-black text-gray-400 mb-1">{label}</label>
      <input
        type="number" inputMode="decimal"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-right tabular-nums font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:bg-white transition-all ${focus}`}
      />
    </div>
  );
}
