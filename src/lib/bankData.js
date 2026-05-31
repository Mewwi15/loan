// src/lib/bankData.js — Firestore access for bank daily reports
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, setDoc, getDocs, query, orderBy, limit, where,
} from "firebase/firestore";
import { sumRows } from "@/lib/bankReport";

const COL = "bankReports"; // doc id = YYYY-MM-DD

// save / overwrite a day's report
export async function saveReport(date, rows) {
  const totals = sumRows(rows);
  await setDoc(doc(db, COL, date), {
    date,
    rows,
    totals,
    updatedAt: new Date().toISOString(),
  });
  return { date, rows, totals };
}

export async function getReport(date) {
  const snap = await getDoc(doc(db, COL, date));
  return snap.exists() ? snap.data() : null;
}

// list all dates that have reports (newest first)
export async function listReportDates() {
  const q = query(collection(db, COL), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

// load all reports (for history/summary/graphs) — newest first
export async function listReports(max = 400) {
  const q = query(collection(db, COL), orderBy("date", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// the most recent report strictly BEFORE `date` (for carry-over)
export async function getPrevReport(date) {
  const q = query(
    collection(db, COL),
    where("date", "<", date),
    orderBy("date", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}
