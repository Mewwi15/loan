import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 🟢 1. เพิ่มการ Import Storage
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ป้องกันการ Initialize ซ้ำ (Server-side rendering check)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firestore เพื่อใช้งานในหน้าต่างๆ
export const db = getFirestore(app);

// 🟢 2. Export Storage เพื่อเอาไปใช้เก็บไฟล์ PDF ในหน้า Customers
export const storage = getStorage(app);

// Analytics ต้องเช็คว่ารันบน Browser หรือไม่
export const analytics =
  typeof window !== "undefined"
    ? isSupported().then((yes) => (yes ? getAnalytics(app) : null))
    : null;

export default app;
