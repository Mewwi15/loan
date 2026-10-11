// src/lib/deviceToken.js — เก็บ/อ่าน token ของ "อุปกรณ์ที่เชื่อถือได้"
//
// เดิมเก็บไว้ใน localStorage อย่างเดียว ซึ่งมีปัญหา 2 ข้อ:
//   1. Safari (ITP) ล้าง localStorage ทิ้งเมื่อไม่ได้เข้าเว็บเกิน 7 วัน → เครื่องถูกลืม → ต้องกรอก OTP ใหม่
//   2. localStorage แยกตาม origin ถ้าเข้าเว็บคนละ host (เช่น IP วง LAN กับชื่อโดเมน) จะคนละชุดกัน
// จึงเก็บคู่ไว้ในคุกกี้ด้วย แล้วอ่านแบบ fallback หากันเอง

const KEY = "deviceToken";
const MAX_AGE = 60 * 60 * 24 * 400; // ~13 เดือน

export function readDeviceToken() {
  try {
    const fromLocal = localStorage.getItem(KEY);
    if (fromLocal) return fromLocal;
  } catch {
    // localStorage ถูกปิด (private mode บางเบราว์เซอร์) — ตกไปอ่านคุกกี้แทน
  }

  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)deviceToken=([^;]+)/);
  const fromCookie = m ? decodeURIComponent(m[1]) : "";

  // กู้กลับเข้า localStorage เผื่อรอบหน้าอ่านได้เร็วขึ้น
  if (fromCookie) {
    try {
      localStorage.setItem(KEY, fromCookie);
    } catch {}
  }
  return fromCookie;
}

export function writeDeviceToken(token) {
  try {
    localStorage.setItem(KEY, token);
  } catch {}
  if (typeof document !== "undefined") {
    document.cookie = `${KEY}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  }
}

export function clearDeviceToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  if (typeof document !== "undefined") {
    document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

// crypto.randomUUID() มีเฉพาะ secure context (https:// หรือ localhost)
// ถ้าเปิดผ่าน http://<ip> ในวง LAN มันจะเป็น undefined แล้ว throw
// ทำให้บรรทัดที่บันทึก token ไม่ได้รัน → เครื่องไม่เคยถูกจำ → วนกรอก OTP
export function newDeviceToken() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    }
  }
  // ทางสุดท้าย: อ่อนกว่าสองแบบบน แต่ดีกว่าล็อกอินไม่ผ่านเลย
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
