"use client";

import { useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Database,
  Table,
  RefreshCcw,
  Loader2,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertOctagon,
  Edit,
  Save,
  X,
} from "lucide-react";

const DUPLICATE_COLORS = [
  "bg-rose-100/80 hover:bg-rose-200 border-rose-200",
  "bg-blue-100/80 hover:bg-blue-200 border-blue-200",
  "bg-amber-100/80 hover:bg-amber-200 border-amber-200",
  "bg-emerald-100/80 hover:bg-emerald-200 border-emerald-200",
  "bg-purple-100/80 hover:bg-purple-200 border-purple-200",
  "bg-cyan-100/80 hover:bg-cyan-200 border-cyan-200",
  "bg-fuchsia-100/80 hover:bg-fuchsia-200 border-fuchsia-200",
];

// 🌟 ตัวเลือกสถานะด่วนสำหรับให้กดคลิก
const QUICK_STATUSES = [
  { label: "มือตาย", value: "dead", color: "bg-red-500" },
  { label: "มือเป็น", value: "alive", color: "bg-blue-500" },
  { label: "ปิดบัญชี", value: "closed", color: "bg-emerald-500" },
  { label: "ใช้งานอยู่", value: "active", color: "bg-orange-500" },
  { label: "จบแล้ว", value: "completed", color: "bg-green-500" },
  { label: "ค้างชำระ", value: "pending", color: "bg-gray-500" },
  { label: "จ่ายแล้ว", value: "paid", color: "bg-emerald-600" },
];

export default function DatabaseExplorerPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetCollection, setTargetCollection] = useState("share_hands"); // เริ่มต้นที่ share_hands ให้บอสแก้ได้เลย
  const [searchTerm, setSearchTerm] = useState("");

  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, targetCollection));
      const result = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert(
        "❌ ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อหรือชื่อตารางครับ",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirm = window.confirm(
      `⚠️ บอสแน่ใจนะครับว่าจะลบข้อมูล ID:\n${id}\n\nลบแล้วกู้คืนไม่ได้นะครับ!`,
    );
    if (!isConfirm) return;

    try {
      await deleteDoc(doc(db, targetCollection, id));
      setData((prevData) => prevData.filter((item) => item.id !== id));
      alert("🗑️ ลบข้อมูลเรียบร้อยแล้วครับบอส!");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("❌ เกิดข้อผิดพลาด ไม่สามารถลบข้อมูลได้ครับ");
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const { id, ...rest } = item;
    setEditFormData(rest);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, targetCollection, editingItem.id);
      const dataToSave = { ...editFormData };

      await updateDoc(docRef, dataToSave);

      setData((prevData) =>
        prevData.map((d) =>
          d.id === editingItem.id ? { id: editingItem.id, ...dataToSave } : d,
        ),
      );

      alert("✅ บันทึกการแก้ไขเรียบร้อยแล้วครับ!");
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating document:", error);
      alert("❌ ไม่สามารถบันทึกข้อมูลได้: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const processedData = useMemo(() => {
    if (data.length === 0) return { list: [], dupCount: 0, duplicateMap: {} };

    const generateKey = (item) => {
      if (targetCollection === "loans") {
        return `${item.loanNumber}-${item.customerName}-${item.principal}`
          .toLowerCase()
          .trim();
      } else if (targetCollection === "customers") {
        return `${item.name}-${item.phone}`.toLowerCase().trim();
      } else if (targetCollection === "schedules") {
        return `${item.loanId || item.shareId}-${item.installmentNo}`
          .toLowerCase()
          .trim();
      } else if (targetCollection === "shares") {
        return `${item.name}`.toLowerCase().trim();
      } else if (targetCollection === "share_hands") {
        return `${item.shareId}-${item.handNumber}`.toLowerCase().trim();
      }
      const { id, createdAt, updatedAt, ...rest } = item;
      return JSON.stringify(rest);
    };

    const groups = {};
    data.forEach((item) => {
      const key = generateKey(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    let colorIndex = 0;
    let dupCount = 0;
    const duplicateMap = {};

    Object.entries(groups).forEach(([key, itemsArr]) => {
      if (itemsArr.length > 1) {
        dupCount += itemsArr.length;
        const assignedColor =
          DUPLICATE_COLORS[colorIndex % DUPLICATE_COLORS.length];
        itemsArr.forEach((item) => {
          duplicateMap[item.id] = assignedColor;
        });
        colorIndex++;
      }
    });

    let filteredList = data.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()),
    );

    filteredList.sort((a, b) => {
      const keyA = generateKey(a);
      const keyB = generateKey(b);
      const isDupA = duplicateMap[a.id] ? 1 : 0;
      const isDupB = duplicateMap[b.id] ? 1 : 0;

      if (isDupA !== isDupB) return isDupB - isDupA;
      return keyA.localeCompare(keyB);
    });

    return { list: filteredList, dupCount, duplicateMap };
  }, [data, targetCollection, searchTerm]);

  const allKeys = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Array.from(new Set(data.flatMap((obj) => Object.keys(obj))));
    return keys.sort((a, b) => {
      if (a === "id") return -1;
      if (b === "id") return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  const renderCellData = (value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-300 font-normal">-</span>;
    }
    if (typeof value === "boolean") {
      return value ? (
        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-[10px]">
          <CheckCircle2 className="w-3 h-3" /> จริง
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-[10px]">
          <XCircle className="w-3 h-3" /> เท็จ
        </span>
      );
    }
    if (typeof value === "object" && value.seconds) {
      const date = new Date(value.seconds * 1000);
      return (
        <span className="text-blue-600">{date.toLocaleString("th-TH")}</span>
      );
    }
    if (typeof value === "object") {
      return (
        <span className="text-gray-400 text-[10px] font-normal break-all">
          {JSON.stringify(value)}
        </span>
      );
    }
    return <span className="text-gray-700">{String(value)}</span>;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans animate-in fade-in duration-500 pb-20 relative">
      {/* 🌟 MODAL แก้ไขข้อมูล */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-500" /> แก้ไขข้อมูลดิบ
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                  ID: {editingItem.id}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              {Object.entries(editFormData).map(([key, value]) => {
                // ข้ามการแก้ไขข้อมูลที่เป็น Object ซับซ้อน
                if (typeof value === "object" && value !== null) {
                  return (
                    <div key={key}>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                        {key} (รูปแบบซับซ้อน - แก้ไขไม่ได้)
                      </label>
                      <input
                        disabled
                        value={JSON.stringify(value)}
                        className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl text-gray-400 font-bold truncate"
                      />
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">
                      {key}
                    </label>

                    {/* 🌟 ความฉลาดของช่อง Status (ให้คลิกได้) */}
                    {key === "status" ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={value === null ? "" : value}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              [key]: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-bold text-gray-800 transition-all"
                        />
                        <div className="flex flex-wrap gap-2">
                          {QUICK_STATUSES.map((qStatus) => (
                            <button
                              key={qStatus.value}
                              type="button"
                              onClick={() =>
                                setEditFormData({
                                  ...editFormData,
                                  [key]: qStatus.value,
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                                value === qStatus.value
                                  ? `${qStatus.color} text-white border-transparent shadow-md`
                                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-500"
                              }`}
                            >
                              {qStatus.value} ({qStatus.label})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={value === null ? "" : value}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 font-bold text-gray-800 transition-all"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}{" "}
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-orange-500 rounded-2xl shadow-lg shadow-orange-200">
              <Database className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">
                ตรวจเช็คฐานข้อมูล (DB Explorer)
              </h1>
              <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">
                ระบบตรวจสอบ แก้ไข และกวาดขยะฐานข้อมูล
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <select
              value={targetCollection}
              onChange={(e) => setTargetCollection(e.target.value)}
              className="w-full sm:w-auto px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="share_hands">
                📁 ตาราง: share_hands (ลูกแชร์)
              </option>
              <option value="schedules">
                📁 ตาราง: schedules (ตารางค่างวด)
              </option>
              <option value="shares">📁 ตาราง: shares (วงแชร์แม่)</option>
              <option value="loans">📁 ตาราง: loans (สัญญา/วงกู้)</option>
              <option value="customers">
                📁 ตาราง: customers (ข้อมูลลูกค้า)
              </option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1F2335] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg active:scale-95 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCcw className="w-5 h-5" />
              )}
              ดึงข้อมูล
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="พิมพ์คำค้นหา (ชื่อ, ID, สถานะ)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-xl outline-none focus:border-orange-500 shadow-sm font-bold text-gray-700 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            {processedData.dupCount > 0 && (
              <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-200 animate-pulse shadow-sm">
                <AlertOctagon className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  เจอข้อมูลซ้ำ {processedData.dupCount} รายการ!
                </span>
              </div>
            )}
            {data.length > 0 && (
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100">
                พบข้อมูล{" "}
                <span className="text-orange-500 text-sm">
                  {processedData.list.length}
                </span>{" "}
                รายการ
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden flex flex-col h-fit max-h-[65vh]">
          {data.length > 0 ? (
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 shadow-sm">
                    <th className="px-6 py-4 bg-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap border-b-2 border-gray-200">
                      ลำดับ
                    </th>
                    <th className="px-6 py-4 bg-gray-100 text-[10px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap border-b-2 border-gray-200 sticky left-0 z-20">
                      จัดการ
                    </th>
                    {allKeys.map((key) => (
                      <th
                        key={key}
                        className="px-6 py-4 bg-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap border-b-2 border-gray-200"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedData.list.map((item, idx) => {
                    const rowClass = processedData.duplicateMap[item.id]
                      ? `${processedData.duplicateMap[item.id]} border-b-2 font-black`
                      : "bg-white hover:bg-orange-50/50";

                    return (
                      <tr
                        key={item.id}
                        className={`${rowClass} transition-colors group`}
                      >
                        <td className="px-6 py-4 text-xs font-black text-gray-400 whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-2.5 bg-white text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100 flex items-center justify-center active:scale-95"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2.5 bg-white text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm border border-rose-100 flex items-center justify-center active:scale-95"
                            title="ลบข้อมูลแถวนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                        {allKeys.map((key) => (
                          <td
                            key={key}
                            className="px-6 py-4 text-xs whitespace-nowrap max-w-[300px] truncate border-r border-gray-100/50 last:border-0"
                          >
                            {renderCellData(item[key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-32 text-center text-gray-300 flex flex-col items-center gap-4 bg-gray-50/30">
              <FileText className="w-16 h-16 opacity-20" />
              <p className="font-black text-sm uppercase tracking-widest text-gray-400">
                {loading
                  ? "กำลังดึงข้อมูล..."
                  : "กรุณากดปุ่ม ดึงข้อมูล (Fetch Data) เพื่อเริ่มต้น"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
