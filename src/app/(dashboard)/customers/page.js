"use client";

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  writeBatch,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Search,
  UserPlus,
  ArrowUpRight,
  X,
  Filter,
  Trash2,
  AlertTriangle,
  Loader2,
  FileText,
  MessageCircle,
  UploadCloud,
  CheckCircle2,
  Save,
} from "lucide-react";
import Link from "next/link";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับเพิ่มลูกค้าใหม่
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    nickname: "",
    name: "",
    phone: "",
    facebook: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // State สำหรับลบลูกค้า
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // --- 1. ดึงข้อมูลลูกค้าแบบ Real-time จาก Firebase ---
  useEffect(() => {
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customerList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. ฟังก์ชันจัดการเลือกไฟล์ PDF ---
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        alert("กรุณาอัปโหลดไฟล์ประเภท PDF เท่านั้นครับ");
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  // --- 3. ฟังก์ชันเพิ่มลูกค้าใหม่ (พร้อมอัปโหลดไฟล์) ---
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let documentUrl = "";

      if (selectedFile) {
        const fileRef = ref(
          storage,
          `customer_documents/${Date.now()}_${selectedFile.name}`,
        );
        await uploadBytes(fileRef, selectedFile);
        documentUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "customers"), {
        nickname: newCustomer.nickname,
        name: newCustomer.name,
        phone: newCustomer.phone,
        facebook: newCustomer.facebook,
        documentUrl: documentUrl,
        activeLoans: 0,
        totalDebt: 0,
        status: "ปกติ",
        createdAt: serverTimestamp(),
      });

      setIsModalOpen(false);
      setNewCustomer({ nickname: "", name: "", phone: "", facebook: "" });
      setSelectedFile(null);
      alert("เพิ่มข้อมูลลูกค้าสำเร็จ!");
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("ไม่สามารถเพิ่มข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. ฟังก์ชันลบข้อมูลลูกค้าแบบ Cascading ---
  const handleDelete = async () => {
    if (!customerToDelete) return;
    setLoading(true);
    const batch = writeBatch(db);

    try {
      // A. ลบตัวลูกค้า
      const customerRef = doc(db, "customers", customerToDelete.id);
      batch.delete(customerRef);

      // 🌟 B. ไฮไลท์วิธีแก้: ดึงทั้งชื่อจริงและชื่อเล่นมาค้นหา
      const searchNames = [customerToDelete.name];
      if (customerToDelete.nickname) {
        searchNames.push(customerToDelete.nickname);
      }

      // ค้นหาวงกู้ทั้งหมดที่ตรงกับรายชื่อที่หามาได้
      const loansQuery = query(
        collection(db, "loans"),
        where("customerName", "in", searchNames),
      );
      const loansSnapshot = await getDocs(loansQuery);

      for (const loanDoc of loansSnapshot.docs) {
        const loanId = loanDoc.id;
        batch.delete(loanDoc.ref); // ลบ Loan

        // ลบ Schedules
        const schedulesQuery = query(
          collection(db, "schedules"),
          where("loanId", "==", loanId),
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        schedulesSnapshot.forEach((sDoc) => batch.delete(sDoc.ref));

        // ลบ Transactions
        const transQuery = query(
          collection(db, "transactions"),
          where("loanId", "==", loanId),
        );
        const transSnapshot = await getDocs(transQuery);
        transSnapshot.forEach((tDoc) => batch.delete(tDoc.ref));
      }

      await batch.commit();

      setDeleteModalOpen(false);
      setCustomerToDelete(null);
      alert("ลบข้อมูลลูกค้าและประวัติทั้งหมดเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Delete Error:", error);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูลตามคำค้นหาและสถานะ
  const filteredCustomers = customers.filter((customer) => {
    const matchSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.nickname &&
        customer.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      customer.phone.includes(searchTerm);
    const matchStatus =
      statusFilter === "ทั้งหมด" || customer.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmDelete = (e, customer) => {
    e.preventDefault();
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  return (
    <div className="pb-20 px-4 sm:px-10 font-sans animate-in fade-in duration-500">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pt-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 tracking-tight">
            ระบบจัดการลูกค้า
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2">
            ข้อมูลลูกค้าทั้งหมด{" "}
            <span className="text-orange-500">{customers.length}</span> รายการ
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-sm font-black uppercase tracking-widest"
        >
          <UserPlus className="w-5 h-5 text-orange-500" /> เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* --- Control Bar --- */}
      <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row items-center gap-2">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ชื่อเล่น หรือ เบอร์โทรศัพท์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-bold text-gray-700 placeholder:text-gray-300"
          />
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-100 mx-2"></div>
        <div className="relative w-full md:w-auto flex items-center px-2">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 pl-10 pr-8 py-3 bg-transparent outline-none font-black text-gray-600 text-[10px] uppercase tracking-widest cursor-pointer appearance-none"
          >
            <option value="ทั้งหมด">แสดงทุกสถานะ</option>
            <option value="ปกติ">🟢 ปกติ</option>
            <option value="ค้างชำระ">🔴 ค้างชำระ</option>
          </select>
        </div>
      </div>

      {/* --- Customer Grid --- */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em]">
            กำลังดึงข้อมูล...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredCustomers.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="group block bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 hover:border-orange-200 transition-all duration-300 relative space-y-6"
            >
              {/* ปุ่มลบ */}
              <button
                onClick={(e) => confirmDelete(e, customer)}
                className="absolute top-6 right-6 p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors z-10"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* ข้อมูล Header การ์ด */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl font-black text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-inner">
                  {(customer.nickname || customer.name).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                    {customer.nickname
                      ? `${customer.nickname} (${customer.name})`
                      : customer.name}
                  </h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-[11px] font-bold text-gray-500 tracking-wider">
                      📞 {customer.phone}
                    </p>
                    {customer.facebook && (
                      <p className="text-[10px] font-bold text-[#1877F2] truncate flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />{" "}
                        {customer.facebook}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ข้อมูลตัวเลขยอดหนี้ */}
              <div className="flex gap-8 border-l-2 border-orange-100 pl-6 py-1 relative">
                {/* ไอคอนแสดงเอกสาร PDF (ถ้ามี) */}
                {customer.documentUrl && (
                  <div
                    className="absolute -left-[11px] top-1/2 -translate-y-1/2 bg-white rounded-full p-1 border border-orange-200"
                    title="มีเอกสารแนบ"
                  >
                    <FileText className="w-3 h-3 text-orange-500" />
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    ยอดหนี้รวม
                  </p>
                  <p className="text-xl font-black text-gray-800">
                    ฿{(customer.totalDebt || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[14px] font-black text-gray-500 uppercase tracking-widest mb-1">
                    วงกู้
                  </p>
                  <p className="text-xl font-black text-gray-500">
                    {customer.activeLoans || 0}{" "}
                    <span className="text-xs">วง</span>
                  </p>
                </div>
              </div>

              {/* Footer การ์ด */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${customer.status === "ปกติ" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}
                >
                  {customer.status}
                </span>
                <div className="flex items-center gap-1 text-[11px] font-black text-gray-300 group-hover:text-orange-500 uppercase tracking-widest transition-colors">
                  ดูรายละเอียด <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* --- MODAL: เพิ่มลูกค้าใหม่ --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isSaving && setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-800">
                  เพิ่มลูกค้าใหม่
                </h2>
                <p className="text-[14px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  กรอกข้อมูลส่วนตัวและแนบเอกสาร
                </p>
              </div>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    ชื่อเล่น *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomer.nickname}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        nickname: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                    placeholder="เช่น จูน"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    ชื่อจริง-นามสกุล *
                  </label>
                  <input
                    required
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                    placeholder="ชื่อ-สกุล"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  placeholder="08X-XXX-XXXX"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-[#1877F2]" />{" "}
                  ชื่อเฟสบุ๊ค
                </label>
                <input
                  type="text"
                  value={newCustomer.facebook}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, facebook: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  placeholder="ชื่อเฟส"
                />
              </div>

              {/* โซนอัปโหลดไฟล์ PDF */}
              <div className="pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  เอกสารประกอบการกู้ (PDF เท่านั้น)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-orange-300"}`}
                  >
                    {selectedFile ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-xs font-black text-green-700">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] font-bold text-green-600/70 mt-1">
                          อัปโหลดไฟล์เรียบร้อย เปลี่ยนไฟล์คลิกที่นี่
                        </p>
                      </div>
                    ) : (
                      <div className="text-center opacity-60">
                        <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs font-black text-gray-600">
                          คลิกเพื่อเลือกไฟล์ PDF
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* ปุ่ม Action */}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isSaving ? "กำลังบันทึกและอัปโหลด..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setDeleteModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">
              ลบข้อมูลลูกค้า?
            </h2>
            <p className="text-sm font-bold text-gray-500 mb-8">
              ข้อมูลและประวัติเงินกู้ทั้งหมดของ{" "}
              <span className="text-gray-800">{customerToDelete?.name}</span>{" "}
              จะหายไปถาวร
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="w-full py-4 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 shadow-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "ยืนยันการลบ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
