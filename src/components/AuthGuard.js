"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Lock, Loader2, KeyRound, ShieldAlert } from "lucide-react";

export default function AuthGuard({ children }) {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // ตั้งค่าเวลาหมดอายุ: 2 ชั่วโมง (7,200,000 มิลลิวินาที)
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

  const handleLogout = useCallback(() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginTimestamp");
    setIsAuth(false);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const checkSession = useCallback(() => {
    const loginTime = localStorage.getItem("loginTimestamp");
    const isLogged = localStorage.getItem("isLoggedIn");

    if (isLogged === "true" && loginTime) {
      const now = new Date().getTime();
      if (now - parseInt(loginTime) > SESSION_TIMEOUT) {
        handleLogout();
      } else {
        setIsAuth(true);
      }
    }
    setLoading(false);
  }, [handleLogout, SESSION_TIMEOUT]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const docRef = doc(db, "settings", "auth");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const correctPassword = docSnap.data().password;

        if (password === correctPassword) {
          const now = new Date().getTime();
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("loginTimestamp", now.toString());
          setIsAuth(true);
        } else {
          setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่");
        }
      } else {
        setError("ไม่พบการตั้งค่ารหัสผ่านในระบบ (Firebase)");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1F2335] px-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 relative z-10 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-orange-50 rounded-[2.2rem] flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-orange-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">
              ระบบจัดเก็บงวด
            </h1>
            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">
              Security Access Point
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-orange-500 focus:bg-white font-black text-2xl tracking-[0.3em] transition-all"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl text-xs font-bold border border-rose-100">
                <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button
              disabled={isChecking}
              className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-300 font-bold mt-10 uppercase tracking-widest">
            Automatic logout after 2 hours
          </p>
        </div>
      </div>
    );
  }

  // 🌟 ปล่อยโล่งๆ ไม่มีปุ่มลอยแล้ว
  return <>{children}</>;
}
