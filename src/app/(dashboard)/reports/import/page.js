"use client";

import { useState } from "react";
import Link from "next/link";
import { parseWorkbook, sumRows, fmt } from "@/lib/bankReport";
import { saveReport } from "@/lib/bankData";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, Save, X,
} from "lucide-react";

export default function ImportReportPage() {
  const [parsed, setParsed] = useState([]); // [{file, date, rows, totals, error}]
  const [saving, setSaving] = useState(false);
  const [savedDates, setSavedDates] = useState([]);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (files) => {
    const results = [];
    for (const f of files) {
      try {
        const buf = await f.arrayBuffer();
        const { date, rows, totals } = parseWorkbook(buf);
        if (!date) {
          results.push({ file: f.name, error: "อ่านวันที่ไม่ได้ (แถวแรกต้องมี 'วันที่ ..')" });
        } else if (!rows.length) {
          results.push({ file: f.name, error: "ไม่พบข้อมูลบัญชี" });
        } else {
          results.push({ file: f.name, date, rows, totals: totals || sumRows(rows) });
        }
      } catch (e) {
        results.push({ file: f.name, error: "อ่านไฟล์ไม่ได้: " + e.message });
      }
    }
    setParsed((prev) => [...prev, ...results]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) handleFiles([...e.dataTransfer.files]);
  };

  const saveAll = async () => {
    setSaving(true);
    const ok = [];
    for (const p of parsed) {
      if (p.error) continue;
      try {
        await saveReport(p.date, p.rows);
        ok.push(p.date);
      } catch (e) {
        console.error(e);
      }
    }
    setSavedDates(ok);
    setSaving(false);
  };

  const valid = parsed.filter((p) => !p.error);

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-800">นำเข้ารายงานจาก Excel</h1>
          <p className="text-sm text-gray-500 font-bold">อัปไฟล์ .xlsx ได้หลายเดือนพร้อมกัน</p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
          drag ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-8 h-8 text-orange-500" />
        </div>
        <p className="font-black text-gray-700 mb-1">ลากไฟล์ Excel มาวาง หรือกดเลือกไฟล์</p>
        <p className="text-xs text-gray-400 font-bold mb-5">
          รองรับหลายไฟล์ · แถวแรกต้องมี &quot;วันที่ DD/M/YY&quot;
        </p>
        <label className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm cursor-pointer transition-all active:scale-95">
          <Upload className="w-4 h-4" /> เลือกไฟล์
          <input
            type="file" accept=".xlsx,.xls" multiple hidden
            onChange={(e) => { handleFiles([...e.target.files]); e.target.value = ""; }}
          />
        </label>
      </div>

      {/* Preview list */}
      {parsed.length > 0 && (
        <div className="space-y-3">
          {parsed.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                {p.error ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 truncate">{p.file}</p>
                  {p.error ? (
                    <p className="text-xs text-rose-500 font-bold">{p.error}</p>
                  ) : (
                    <p className="text-xs text-gray-500 font-bold">
                      วันที่ <span className="text-orange-600">{p.date}</span> · {p.rows.length} บัญชี ·
                      รับ {fmt(p.totals.received)} · ถอน {fmt(p.totals.withdrawn)} · คงเหลือ {fmt(p.totals.closing)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setParsed(parsed.filter((_, j) => j !== i))}
                  className="p-1.5 text-gray-300 hover:text-rose-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {savedDates.length > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="font-black text-emerald-700">
                บันทึกสำเร็จ {savedDates.length} วัน — <Link href="/reports" className="underline">ดูรายงาน</Link>
              </p>
            </div>
          ) : (
            <button
              onClick={saveAll}
              disabled={saving || valid.length === 0}
              className="w-full flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกเข้าระบบ {valid.length} วัน
            </button>
          )}
        </div>
      )}
    </div>
  );
}
