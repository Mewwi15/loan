"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import {
  ShieldCheck,
  MonitorSmartphone,
  KeyRound,
  Trash2,
  AlertTriangle,
  Loader2,
  LogOut,
  RefreshCw,
  MapPin,
  Laptop,
  ArrowLeft,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDeviceToken, setCurrentDeviceToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("deviceToken");
      setCurrentDeviceToken(token || "");

      const docRef = doc(db, "settings", "auth");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAuthData(docSnap.data());
      }
    } catch (error) {
      console.error("Error fetching auth data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeDevice = async (tokenToRevoke) => {
    if (
      !window.confirm(
        "ยืนยันการเตะอุปกรณ์นี้ออกจากระบบ?\n(ครั้งต่อไปที่เข้าเว็บ อุปกรณ์นี้จะต้องกรอก OTP ใหม่)",
      )
    )
      return;

    setIsProcessing(true);
    try {
      const docRef = doc(db, "settings", "auth");
      const updatedDevices = (authData.trustedDevices || []).filter((d) => {
        const t = typeof d === "string" ? d : d.token;
        return t !== tokenToRevoke;
      });

      await updateDoc(docRef, { trustedDevices: updatedDevices });
      setAuthData((prev) => ({ ...prev, trustedDevices: updatedDevices }));

      alert("✅ เตะอุปกรณ์เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error revoking device:", error);
      alert("เกิดข้อผิดพลาดในการเตะอุปกรณ์");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (
      !window.confirm(
        "🚨 ยืนยันการเตะ 'ทุกเครื่อง' ยกเว้นเครื่องนี้?\n(เหมาะสำหรับตอนที่สงสัยว่าโดนแฮก ทุกเครื่องที่เหลือจะเด้งออกทันที!)",
      )
    )
      return;

    setIsProcessing(true);
    try {
      const docRef = doc(db, "settings", "auth");
      const currentDeviceRecord = (authData.trustedDevices || []).find((d) => {
        const t = typeof d === "string" ? d : d.token;
        return t === currentDeviceToken;
      });

      const updatedDevices = currentDeviceRecord ? [currentDeviceRecord] : [];

      await updateDoc(docRef, { trustedDevices: updatedDevices });
      setAuthData((prev) => ({ ...prev, trustedDevices: updatedDevices }));

      alert("✅ สั่งล้างเครื่องอื่นๆ ทั้งหมดเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error revoking all devices:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert(
        "❌ รหัสผ่านใหม่ไม่ตรงกัน กรุณาพิมพ์ให้เหมือนกันทั้ง 2 ช่อง",
      );
    }
    if (newPassword.length < 6) {
      return alert("❌ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }

    if (!window.confirm("ยืนยันการเปลี่ยนรหัสผ่านหลัก?")) return;

    setIsProcessing(true);
    try {
      const docRef = doc(db, "settings", "auth");
      await updateDoc(docRef, { password: newPassword });
      setNewPassword("");
      setConfirmPassword("");
      alert("✅ เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย!");
    } catch (error) {
      console.error("Error changing password:", error);
      alert("เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset2FA = async () => {
    if (
      !window.confirm(
        "🚨 คำเตือนขั้นสุด!\n\nคุณกำลังจะรีเซ็ต Microsoft Authenticator เก่าทิ้งทั้งหมด\nการล็อกอินครั้งต่อไป ระบบจะบังคับให้คุณ 'สแกน QR Code ใหม่' \n\nแน่ใจหรือไม่ว่าต้องการทำสิ่งนี้?",
      )
    )
      return;

    setIsProcessing(true);
    try {
      const docRef = doc(db, "settings", "auth");
      await updateDoc(docRef, {
        totpSecret: "",
        trustedDevices: [],
      });

      localStorage.removeItem("deviceToken");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("loginTimestamp");

      alert(
        "✅ รีเซ็ต 2FA สำเร็จ!\nระบบจะนำคุณกลับไปหน้า Login เพื่อสแกน QR Code ใหม่ครับ",
      );
      window.location.href = "/";
    } catch (error) {
      console.error("Error resetting 2FA:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );

  const trustedDevices = authData?.trustedDevices || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans animate-in fade-in duration-500 pb-24">
      {/* 🌟 ปุ่มย้อนกลับ */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> กลับไปหน้าแผงควบคุม (Dashboard)
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-800 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-orange-500" />
          ความปลอดภัย
        </h1>
        <p className="text-sm font-semibold text-gray-500 mt-2">
          จัดการอุปกรณ์และรหัสผ่านเพื่อปกป้องบัญชีของคุณ
        </p>
      </div>

      <div className="space-y-6">
        {/* --- ส่วนที่ 1: การจัดการอุปกรณ์ (Clean List View) --- */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  อุปกรณ์ที่จดจำไว้
                </h2>
                <p className="text-xs font-semibold text-gray-500">
                  อุปกรณ์เหล่านี้เข้าสู่ระบบได้โดยไม่ต้องใช้ OTP
                </p>
              </div>
            </div>

            {trustedDevices.length > 1 && (
              <button
                onClick={handleRevokeAllOthers}
                disabled={isProcessing}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> ออกจากระบบเครื่องอื่นทั้งหมด
              </button>
            )}
          </div>

          {trustedDevices.length > 0 ? (
            <div className="space-y-3">
              {trustedDevices.map((deviceRecord) => {
                const isObject = typeof deviceRecord === "object";
                const token = isObject ? deviceRecord.token : deviceRecord;
                const isCurrent = token === currentDeviceToken;

                const deviceName = isObject
                  ? deviceRecord.device
                  : "อุปกรณ์รุ่นเก่า";
                const location = isObject
                  ? deviceRecord.location
                  : "ไม่ทราบตำแหน่ง";
                const ipStr = isObject ? deviceRecord.ip : "";
                const dateStr =
                  isObject && deviceRecord.timestamp
                    ? new Date(deviceRecord.timestamp).toLocaleDateString(
                        "th-TH",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "-";

                return (
                  <div
                    key={token}
                    className={`p-4 rounded-xl flex justify-between items-center transition-all border ${isCurrent ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex gap-4 items-center min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-800 truncate">
                            {deviceName}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              ใช้งานอยู่ตอนนี้
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                          <MapPin className="w-3 h-3" />
                          <p className="text-[11px] font-semibold truncate">
                            {location} {ipStr ? `(${ipStr})` : ""}
                          </p>
                        </div>
                        {isObject && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                            ล็อกอินล่าสุด: {dateStr}
                          </p>
                        )}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRevokeDevice(token)}
                        disabled={isProcessing}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-4 shrink-0"
                        title="เตะเครื่องนี้ออก"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm font-semibold text-gray-400">
                ยังไม่มีอุปกรณ์ที่ถูกจดจำ
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* --- ส่วนที่ 2: เปลี่ยนรหัสผ่าน --- */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  รหัสผ่านหลัก
                </h2>
                <p className="text-xs font-semibold text-gray-500">
                  เปลี่ยนรหัสในการเข้าสู่ระบบ
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:bg-white text-sm font-medium transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:bg-white text-sm font-medium transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !newPassword || !confirmPassword}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 mt-2"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </form>
          </div>

          {/* --- ส่วนที่ 3: รีเซ็ต 2FA (Danger Zone) --- */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-rose-100">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-600">
                    รีเซ็ตระบบ 2FA
                  </h2>
                  <p className="text-xs font-semibold text-rose-400">
                    เขตอันตราย (Danger Zone)
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 leading-relaxed mb-6">
                หากคุณลบแอป Authenticator ทิ้งไป
                หรือเปลี่ยนโทรศัพท์มือถือเครื่องใหม่
                คุณสามารถกดปุ่มด้านล่างเพื่อบังคับให้ระบบ{" "}
                <span className="font-bold text-gray-900">
                  สร้าง QR Code สแกนใหม่
                </span>{" "}
                ในการล็อกอินครั้งถัดไป
              </p>
            </div>

            <button
              onClick={handleReset2FA}
              disabled={isProcessing}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> เริ่มตั้งค่า 2FA ใหม่ทั้งหมด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
