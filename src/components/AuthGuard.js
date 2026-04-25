"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import {
  Lock,
  Loader2,
  KeyRound,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  QrCode,
  MonitorCheck,
} from "lucide-react";

export default function AuthGuard({ children }) {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState("password");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  const [authData, setAuthData] = useState(null);
  const [tempSecret, setTempSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const SESSION_TIMEOUT = 12 * 60 * 60 * 1000;

  const handleLogout = useCallback(() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loginTimestamp");
    setIsAuth(false);
    setStep("password");
    setPassword("");
    setOtp("");
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const checkSession = useCallback(async () => {
    const loginTime = localStorage.getItem("loginTimestamp");
    const isLogged = localStorage.getItem("isLoggedIn");
    const deviceToken = localStorage.getItem("deviceToken");

    if (isLogged === "true" && loginTime) {
      const now = new Date().getTime();
      if (now - parseInt(loginTime) > SESSION_TIMEOUT) {
        handleLogout();
      } else {
        setIsAuth(true);

        if (deviceToken) {
          try {
            const docRef = doc(db, "settings", "auth");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const trustedDevices = docSnap.data().trustedDevices || [];
              if (!trustedDevices.includes(deviceToken)) {
                localStorage.removeItem("deviceToken");
                handleLogout();
              }
            }
          } catch (err) {
            console.error("Token verification error:", err);
          }
        }
      }
    }
    setLoading(false);
  }, [handleLogout, SESSION_TIMEOUT]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const docRef = doc(db, "settings", "auth");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (password === data.password) {
          setAuthData(data);
          const localToken = localStorage.getItem("deviceToken");

          if (data.totpSecret) {
            if (localToken && data.trustedDevices?.includes(localToken)) {
              completeLogin();
            } else {
              setStep("otp");
            }
          } else {
            // 🌟 สร้างระบบ Google Authenticator ด้วย otpauth (รองรับเบราว์เซอร์ 100%)
            const newSecret = new OTPAuth.Secret({ size: 20 });
            const totp = new OTPAuth.TOTP({
              issuer: "ระบบจัดการแชร์",
              label: "Boss",
              algorithm: "SHA1",
              digits: 6,
              period: 30,
              secret: newSecret,
            });

            const secretBase32 = newSecret.base32;
            const uri = totp.toString();
            const qr = await QRCode.toDataURL(uri);

            setTempSecret(secretBase32);
            setQrCodeUrl(qr);
            setStep("setup");
          }
        } else {
          setError("รหัสผ่านไม่ถูกต้อง");
        }
      } else {
        setError("ไม่พบการตั้งค่าในระบบ กรุณาสร้างเอกสาร settings/auth");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsChecking(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const secretToUse = tempSecret || authData.totpSecret;

      // 🌟 โค้ดสำหรับตรวจสอบ OTP ด้วย otpauth
      const totpVerify = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secretToUse),
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      // เผื่อเวลาให้บอสพิมพ์ช้าได้นิดหน่อย (บวกลบ 30 วินาที)
      const delta = totpVerify.validate({ token: otp, window: 1 });
      const isValid = delta !== null;

      if (isValid) {
        const docRef = doc(db, "settings", "auth");

        if (tempSecret) {
          await updateDoc(docRef, { totpSecret: tempSecret });
        }

        if (rememberDevice) {
          const newToken = crypto.randomUUID();
          localStorage.setItem("deviceToken", newToken);
          await updateDoc(docRef, {
            trustedDevices: arrayUnion(newToken),
          });
        }

        completeLogin();
      } else {
        setError("รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่");
      }
    } catch (err) {
      console.error("OTP Error:", err);
      setError("เกิดข้อผิดพลาดในการยืนยัน OTP");
    } finally {
      setIsChecking(false);
    }
  };

  const completeLogin = () => {
    const now = new Date().getTime();
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loginTimestamp", now.toString());
    setIsAuth(true);
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
      <div className="min-h-screen flex items-center justify-center bg-[#1F2335] px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-10 relative z-10 animate-in zoom-in-95 duration-300">
          {step === "password" && (
            <>
              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-20 h-20 bg-orange-50 rounded-[2.2rem] flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-orange-500" />
                </div>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">
                  ระบบแผงควบคุม
                </h1>
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">
                  Security Access Point
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Master Password
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
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl text-xs font-bold border border-rose-100 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <button
                  disabled={isChecking || !password}
                  className="w-full bg-gray-900 hover:bg-black text-white py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isChecking ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "เข้าสู่ระบบ"
                  )}
                </button>
              </form>
            </>
          )}

          {step === "setup" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-black text-gray-800">
                  เชื่อมต่อแอป Authenticator
                </h2>
                <p className="text-xs font-bold text-gray-500 mt-2 leading-relaxed px-4">
                  สแกน QR Code นี้ด้วยแอป{" "}
                  <span className="text-blue-600">Google Authenticator</span>{" "}
                  เพื่อเปิดใช้งานระบบความปลอดภัย 2 ชั้น
                </p>
              </div>

              <div className="flex justify-center mb-8 p-4 bg-white border-2 border-dashed border-gray-200 rounded-3xl">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                )}
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2 text-center">
                    กรอกเลข 6 หลักที่ได้จากแอป
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white font-black text-3xl text-center tracking-[0.5em] transition-all"
                    placeholder="000000"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl text-xs font-bold border border-rose-100 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <button
                  disabled={isChecking || otp.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isChecking ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "ยืนยันและเปิดใช้งาน"
                  )}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mb-4">
                  <Smartphone className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">
                  ยืนยันตัวตน 2 ชั้น (2FA)
                </h2>
                <p className="text-xs font-bold text-gray-400 mt-2 px-2">
                  เปิดแอป Google Authenticator แล้วนำรหัส 6 หลักมากรอก
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white font-black text-3xl text-center tracking-[0.5em] transition-all"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>

                <label className="flex items-center gap-3 p-4 border border-gray-100 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                      <MonitorCheck className="w-4 h-4 text-blue-500" />{" "}
                      จดจำอุปกรณ์นี้ไว้ (Trusted Device)
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                      ครั้งต่อไปไม่ต้องกรอก OTP ในเครื่องนี้อีก
                    </p>
                  </div>
                </label>

                {error && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-xl text-xs font-bold border border-rose-100 animate-in fade-in">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("password");
                      setOtp("");
                      setError("");
                    }}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 sm:py-5 rounded-2xl font-black text-sm transition-all active:scale-95"
                  >
                    กลับ
                  </button>
                  <button
                    type="submit"
                    disabled={isChecking || otp.length !== 6}
                    className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isChecking ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "ยืนยันตัวตน"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
