// src/lib/bankReport.js
// Helpers for the bank daily report system (parse Excel, calc, format)
import * as XLSX from "xlsx";

// คนถือบัญชี (ใช้แยกชื่อจาก "กสิกร จุ๊บ 💚")
export const OWNERS = ["จุ๊บ", "มอส", "มิว", "จำปา"];

// ── number helpers ──────────────────────────────────────────
export const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[, ฿]/g, ""));
  return isNaN(n) ? 0 : n;
};
export const fmt = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
// เลขกลม (ไม่มีทศนิยม) สำหรับการ์ดสรุป
export const fmt0 = (n) =>
  Math.round(Number(n) || 0).toLocaleString("th-TH");

// ── วันนี้ตามเวลาไทย → "2026-05-31" ──────────────────────────
export function todayBangkok() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── add days to an ISO date "2026-05-31" (+1 / −1) ───────────
export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ── parse Thai date "วันที่ _31/5/69" → "2026-05-31" ───────────
export function parseThaiDate(raw) {
  const m = String(raw || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m.map(Number);
  let be = y < 100 ? 2500 + y : y; // 69 → 2569
  const ce = be - 543; // → 2026
  return `${ce.toString().padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ── parse "กสิกร จุ๊บ 💚" → {bank, owner, emoji, name} ─────────
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2764}]/gu;
export function parseAccountName(raw) {
  const name = String(raw || "").trim();
  const emoji = (name.match(EMOJI_RE) || []).join("").replace(/️/g, "");
  let txt = name.replace(EMOJI_RE, "").trim();
  const owner = OWNERS.find((o) => txt.includes(o)) || "";
  const bank = (owner ? txt.replace(owner, "") : txt).replace(/\./g, ".").trim();
  return { bank: bank || txt, owner, emoji, name };
}

// ── calc ────────────────────────────────────────────────────
export const calcClosing = (opening, received, withdrawn) =>
  toNum(opening) + toNum(received) - toNum(withdrawn);

// recompute derived fields of a row from inputs + carried base
// closing = opening + received − withdrawn
// countCum = countCarry + count ; cumRemaining = cumAmount + received
export function computeRow(r) {
  const opening = toNum(r.opening);
  const received = toNum(r.received);
  const withdrawn = toNum(r.withdrawn);
  const count = toNum(r.count);
  const countCarry = toNum(r.countCarry);
  const cumAmount = toNum(r.cumAmount);
  return {
    ...r,
    opening, received, withdrawn, count, countCarry, cumAmount,
    closing: opening + received - withdrawn,
    countCum: countCarry + count,
    cumRemaining: cumAmount + received,
  };
}

// build today's blank rows by carrying over from the previous report
//   ยกมา = คงเหลือเมื่อวาน · ครั้งยกมา = ครั้งสะสมเมื่อวาน · สะสม = สะสมคงเหลือเมื่อวาน
export function carryOverRows(prevRows) {
  return (prevRows || []).map((p) =>
    computeRow({
      name: p.name, bank: p.bank, owner: p.owner, emoji: p.emoji,
      opening: toNum(p.closing),
      received: 0,
      withdrawn: 0,
      count: 0,
      countCarry: toNum(p.countCum),
      cumAmount: toNum(p.cumRemaining),
    }),
  );
}

// ── parse one sheet grid → { date, rows[], totals } ─────────
// Layout: R1 date · R2 headers · R3+ accounts · totals row = empty name + numbers
function parseGrid(grid) {
  const date = parseThaiDate(grid[0]?.[0]);
  const rows = [];
  let totals = null;

  for (let r = 2; r < grid.length; r++) {
    const cells = grid[r] || [];
    const first = String(cells[0] || "").trim();
    const c1 = toNum(cells[1]); // ยอดยกมา
    // totals row = empty name but has numbers
    if (!first) {
      if (c1 || toNum(cells[2]) || toNum(cells[4])) {
        totals = {
          opening: toNum(cells[1]),
          received: toNum(cells[2]),
          withdrawn: toNum(cells[3]),
          closing: toNum(cells[4]),
          cumRemaining: toNum(cells[9]),
        };
      }
      continue;
    }
    const { bank, owner, emoji } = parseAccountName(first);
    rows.push({
      name: first,
      bank,
      owner,
      emoji,
      opening: toNum(cells[1]),
      received: toNum(cells[2]),
      withdrawn: toNum(cells[3]),
      closing: toNum(cells[4]),
      countCarry: toNum(cells[5]),
      count: toNum(cells[6]),
      countCum: toNum(cells[7]),
      cumAmount: toNum(cells[8]),
      cumRemaining: toNum(cells[9]),
    });
  }
  return { date, rows, totals };
}

// ── parse a workbook (ArrayBuffer) → sheet แรก { date, rows[], totals } ─
export function parseWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return parseGrid(grid);
}

// ── parse ทุก sheet ในไฟล์ → [{ sheetName, date, rows[], totals }] ─
// ไฟล์รายงานมักมี 1 sheet ต่อ 1 วัน — อ่านทุกวันเข้าทีเดียว
export function parseAllSheets(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const out = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const parsed = parseGrid(grid);
    // ข้าม sheet ที่ไม่มีวันที่หรือไม่มีบัญชี (sheet ว่าง/สรุป)
    if (!parsed.date || !parsed.rows.length) continue;
    out.push({ sheetName, ...parsed });
  }
  return out;
}

// ── sum rows → totals ───────────────────────────────────────
export function sumRows(rows) {
  const t = {
    opening: 0, received: 0, withdrawn: 0, closing: 0,
    countCarry: 0, count: 0, countCum: 0, cumAmount: 0, cumRemaining: 0,
  };
  for (const r of rows) {
    for (const k of Object.keys(t)) t[k] += toNum(r[k]);
  }
  return t;
}

// ── build Excel (export) from rows ──────────────────────────
export function rowsToWorkbook(date, rows) {
  const header = [
    "ธนาคาร", "ยอดยกมา", "ยอดรับโอน", "ยอดหักถอน", "ยอดคงเหลือ",
    "จำนวนครั้งยกมา", "จำนวนครั้ง", "จำนวนครั้งสะสม", "ยอดสะสม", "ยอดสะสมคงเหลือ",
  ];
  const body = rows.map((r) => [
    r.name || `${r.bank} ${r.owner} ${r.emoji}`.trim(),
    r.opening, r.received, r.withdrawn, r.closing,
    r.countCarry, r.count, r.countCum, r.cumAmount, r.cumRemaining,
  ]);
  const t = sumRows(rows);
  const totalRow = ["รวม", t.opening, t.received, t.withdrawn, t.closing, "", "", "", "", t.cumRemaining];
  const aoa = [[`วันที่ ${date}`], header, ...body, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "รายงาน");
  return wb;
}
