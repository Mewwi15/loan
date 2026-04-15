"use client";

import { useState, useEffect, useRef } from "react"; // 🌟 เพิ่ม useRef
import { db, storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
  query,
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
  FileSignature,
  UserCog,
  LayoutGrid,
  List,
  Plus, // 🌟 เพิ่มไอคอน Plus
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    code: "",
    nickname: "",
    name: "",
    phone: "",
    facebook: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [editCustomerData, setEditCustomerData] = useState({
    code: "",
    nickname: "",
    name: "",
    phone: "",
    facebook: "",
  });

  // 🌟 State & Ref สำหรับจัดการปุ่มลอย (Floating Button)
  const headerRef = useRef(null);
  const [showFab, setShowFab] = useState(false);

  // 🌟 เซ็นเซอร์ตรวจจับว่าปุ่มหลักด้านบนเลื่อนหายไปหรือยัง
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // ถ้า Header หายไปจากหน้าจอ (isIntersecting = false) ให้แสดงปุ่มลอย
        setShowFab(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      customerList.sort((a, b) => {
        const codeA = (a.code || "").trim();
        const codeB = (b.code || "").trim();

        if (codeA && codeB) {
          return codeA.localeCompare(codeB, "en", { numeric: true });
        }
        if (codeA && !codeB) return -1;
        if (!codeA && codeB) return 1;

        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setCustomers(customerList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (newCustomer.code.trim()) {
        const checkQuery = query(
          collection(db, "customers"),
          where("code", "==", newCustomer.code.trim().toUpperCase()),
        );
        const checkSnap = await getDocs(checkQuery);
        if (!checkSnap.empty) {
          alert("❌ รหัสลูกค้านี้มีในระบบแล้ว กรุณาใช้รหัสอื่นครับ");
          setIsSaving(false);
          return;
        }
      }

      if (!newCustomer.nickname.trim() && !newCustomer.name.trim()) {
        alert("กรุณากรอกชื่อเล่น หรือ ชื่อจริง อย่างน้อย 1 อย่างครับ");
        setIsSaving(false);
        return;
      }

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
        code: newCustomer.code.trim().toUpperCase(),
        nickname: newCustomer.nickname.trim(),
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        facebook: newCustomer.facebook.trim(),
        documentUrl: documentUrl,
        activeLoans: 0,
        totalDebt: 0,
        status: "ปกติ",
        createdAt: serverTimestamp(),
      });

      setIsModalOpen(false);
      setNewCustomer({
        code: "",
        nickname: "",
        name: "",
        phone: "",
        facebook: "",
      });
      setSelectedFile(null);
      alert("เพิ่มข้อมูลลูกค้าสำเร็จ!");
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("ไม่สามารถเพิ่มข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setLoading(true);
    const batch = writeBatch(db);

    try {
      const customerRef = doc(db, "customers", customerToDelete.id);
      batch.delete(customerRef);

      const searchNames = [];
      if (customerToDelete.name) searchNames.push(customerToDelete.name);
      if (customerToDelete.nickname)
        searchNames.push(customerToDelete.nickname);

      if (searchNames.length > 0) {
        const loansQuery = query(
          collection(db, "loans"),
          where("customerName", "in", searchNames),
        );
        const loansSnapshot = await getDocs(loansQuery);

        for (const loanDoc of loansSnapshot.docs) {
          const loanId = loanDoc.id;
          batch.delete(loanDoc.ref);

          const schedulesQuery = query(
            collection(db, "schedules"),
            where("loanId", "==", loanId),
          );
          const schedulesSnapshot = await getDocs(schedulesQuery);
          schedulesSnapshot.forEach((sDoc) => batch.delete(sDoc.ref));

          const transQuery = query(
            collection(db, "transactions"),
            where("loanId", "==", loanId),
          );
          const transSnapshot = await getDocs(transQuery);
          transSnapshot.forEach((tDoc) => batch.delete(tDoc.ref));
        }
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

  const openEditModal = (e, customer) => {
    e.stopPropagation();
    setCustomerToEdit(customer);
    setEditCustomerData({
      code: customer.code || "",
      nickname: customer.nickname || "",
      name: customer.name || "",
      phone: customer.phone || "",
      facebook: customer.facebook || "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const batch = writeBatch(db);

    try {
      if (editCustomerData.code.trim()) {
        const checkQuery = query(
          collection(db, "customers"),
          where("code", "==", editCustomerData.code.trim().toUpperCase()),
        );
        const checkSnap = await getDocs(checkQuery);
        const isDuplicate = checkSnap.docs.some(
          (doc) => doc.id !== customerToEdit.id,
        );

        if (isDuplicate) {
          alert("❌ รหัสลูกค้านี้มีในระบบแล้ว กรุณาใช้รหัสอื่นครับ");
          setIsUpdating(false);
          return;
        }
      }

      if (!editCustomerData.nickname.trim() && !editCustomerData.name.trim()) {
        alert("กรุณากรอกชื่อเล่น หรือ ชื่อจริง อย่างน้อย 1 อย่างครับ");
        setIsUpdating(false);
        return;
      }

      const newDisplayName = editCustomerData.nickname || editCustomerData.name;

      const customerRef = doc(db, "customers", customerToEdit.id);
      batch.update(customerRef, {
        code: editCustomerData.code.trim().toUpperCase(),
        nickname: editCustomerData.nickname.trim(),
        name: editCustomerData.name.trim(),
        phone: editCustomerData.phone.trim(),
        facebook: editCustomerData.facebook.trim(),
      });

      const loansQ = query(
        collection(db, "loans"),
        where("customerId", "==", customerToEdit.id),
      );
      const loansSnap = await getDocs(loansQ);
      loansSnap.forEach((d) =>
        batch.update(d.ref, { customerName: newDisplayName }),
      );

      const schQ = query(
        collection(db, "schedules"),
        where("customerId", "==", customerToEdit.id),
      );
      const schSnap = await getDocs(schQ);
      schSnap.forEach((d) =>
        batch.update(d.ref, { customerName: newDisplayName }),
      );

      const transQ = query(
        collection(db, "transactions"),
        where("customerId", "==", customerToEdit.id),
      );
      const transSnap = await getDocs(transQ);
      transSnap.forEach((d) =>
        batch.update(d.ref, { customerName: newDisplayName }),
      );

      await batch.commit();
      alert("✅ อัปเดตข้อมูลลูกค้าสำเร็จ!");
      setEditModalOpen(false);
      setCustomerToEdit(null);
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      (customer.code && customer.code.toLowerCase().includes(search)) ||
      (customer.name && customer.name.toLowerCase().includes(search)) ||
      (customer.nickname && customer.nickname.toLowerCase().includes(search)) ||
      (customer.phone && customer.phone.includes(search));
    const matchStatus =
      statusFilter === "ทั้งหมด" || customer.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmDelete = (e, customer) => {
    e.stopPropagation();
    e.preventDefault();
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  const getCustomerDisplayName = (nickname, name) => {
    if (nickname && name) return `${nickname} (${name})`;
    if (nickname) return nickname;
    return name;
  };

  return (
    <div className="pb-24 px-4 sm:px-10 font-sans animate-in fade-in duration-500 relative min-h-screen">
      {/* 🌟 ปุ่ม Floating Button (จะโผล่มาเฉพาะตอนเลื่อนจอลง) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-gray-900 hover:bg-black text-white rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-95 border border-gray-700 ${
          showFab
            ? "scale-100 opacity-100"
            : "scale-0 opacity-0 pointer-events-none"
        }`}
        title="เพิ่มลูกค้าใหม่"
      >
        <Plus className="w-7 h-7 text-orange-500" />
      </button>

      {/* 🌟 แนบ ref ไว้ที่ Header เพื่อให้เซ็นเซอร์รู้ว่าส่วนนี้หายไปจากจอหรือยัง */}
      <div
        ref={headerRef}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 pt-10"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 tracking-tight">
            ระบบจัดการลูกค้า
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2">
            ข้อมูลลูกค้าทั้งหมด{" "}
            <span className="text-orange-500">{customers.length}</span> รายการ
          </p>
        </div>

        {/* 🌟 ปุ่มใหญ่ดั้งเดิม */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-sm font-black uppercase tracking-widest"
        >
          <UserPlus className="w-5 h-5 text-orange-500" /> เพิ่มลูกค้าใหม่
        </button>
      </div>

      <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-gray-100 mb-10 flex flex-col xl:flex-row items-center gap-2">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหารหัส, ชื่อ, ชื่อเล่น หรือ เบอร์โทรศัพท์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-bold text-gray-700 placeholder:text-gray-300"
          />
        </div>
        <div className="hidden xl:block w-px h-8 bg-gray-100 mx-2"></div>

        <div className="flex w-full xl:w-auto items-center gap-2 px-2 pb-2 xl:pb-0">
          <div className="relative flex-1 xl:w-auto">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full xl:w-48 pl-10 pr-8 py-3 bg-transparent outline-none font-black text-gray-600 text-[10px] uppercase tracking-widest cursor-pointer appearance-none"
            >
              <option value="ทั้งหมด">แสดงทุกสถานะ</option>
              <option value="ปกติ">🟢 ปกติ</option>
              <option value="ค้างชำระ">🔴 ค้างชำระ</option>
            </select>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              title="มุมมองแบบรายการแนวยาว"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-orange-500 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              title="มุมมองแบบการ์ด"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          <p className="font-black text-[10px] uppercase tracking-[0.2em]">
            กำลังดึงข้อมูล...
          </p>
        </div>
      ) : (
        <>
          {viewMode === "list" && (
            <div className="flex flex-col gap-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="group flex flex-col lg:flex-row items-start lg:items-center justify-between bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-4 w-full lg:w-1/3">
                    <div className="min-w-[4rem] px-2 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-lg font-black text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-inner tracking-wider">
                      {customer.code
                        ? customer.code
                        : (customer.nickname || customer.name).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                        {getCustomerDisplayName(
                          customer.nickname,
                          customer.name,
                        )}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-500">
                        <span>📞 {customer.phone || "-"}</span>
                        {customer.facebook && (
                          <span className="flex items-center gap-1 text-[#1877F2]">
                            <MessageCircle className="w-3 h-3" />{" "}
                            {customer.facebook}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full lg:w-1/3 border-l-2 border-orange-100 pl-6 relative">
                    {customer.documentUrl && (
                      <div className="absolute -left-[11px] bg-white rounded-full p-1 border border-orange-200">
                        <FileText className="w-3 h-3 text-orange-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        ยอดหนี้รวม
                      </p>
                      <p className="text-base font-black text-gray-800">
                        ฿{(customer.totalDebt || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        วงกู้ปัจจุบัน
                      </p>
                      <p className="text-base font-black text-gray-500">
                        {customer.activeLoans || 0} วง
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                    <span
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shrink-0 ${customer.status === "ปกติ" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}
                    >
                      {customer.status}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const displayName =
                            customer.nickname || customer.name;
                          router.push(
                            `/loans/new?name=${encodeURIComponent(displayName)}&id=${customer.id}`,
                          );
                        }}
                        className="text-[10px] font-black text-orange-500 bg-orange-50 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-xl uppercase tracking-widest transition-all flex items-center gap-1 shadow-sm"
                      >
                        <FileSignature className="w-4 h-4" />{" "}
                        <span className="hidden xl:inline">สร้างสัญญา</span>
                      </button>
                      <button
                        onClick={(e) => openEditModal(e, customer)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                        title="แก้ไขข้อมูลลูกค้า"
                      >
                        <UserCog className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => confirmDelete(e, customer)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="ลบข้อมูลลูกค้า"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="group block bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 hover:border-orange-200 transition-all duration-300 relative space-y-6 cursor-pointer"
                >
                  <div className="absolute top-6 right-6 flex gap-2 z-10">
                    <button
                      onClick={(e) => openEditModal(e, customer)}
                      className="p-2.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                      title="แก้ไขข้อมูลลูกค้า"
                    >
                      <UserCog className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => confirmDelete(e, customer)}
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="ลบข้อมูลลูกค้า"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="min-w-[4rem] px-2 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-xl font-black text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-inner tracking-wider">
                      {customer.code
                        ? customer.code
                        : (customer.nickname || customer.name).charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0 pr-16">
                      <h3 className="text-xl font-black text-gray-800 group-hover:text-orange-500 transition-colors truncate">
                        {getCustomerDisplayName(
                          customer.nickname,
                          customer.name,
                        )}
                      </h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[11px] font-bold text-gray-500 tracking-wider">
                          📞 {customer.phone || "-"}
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

                  <div className="flex gap-8 border-l-2 border-orange-100 pl-6 py-1 relative">
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

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 z-10">
                      <span
                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${customer.status === "ปกติ" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}
                      >
                        {customer.status}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const displayName =
                            customer.nickname || customer.name;
                          router.push(
                            `/loans/new?name=${encodeURIComponent(displayName)}&id=${customer.id}`,
                          );
                        }}
                        className="text-[10px] font-black text-orange-500 bg-orange-50 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all flex items-center gap-1 shadow-sm"
                      >
                        <FileSignature className="w-3 h-3" /> สร้างสัญญา
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-black text-gray-300 group-hover:text-orange-500 uppercase tracking-widest transition-colors">
                      ดูรายละเอียด <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
                    รหัสลูกค้า (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.code}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        code: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-orange-50/50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-black text-orange-500 text-sm transition-all uppercase placeholder:normal-case"
                    placeholder="เช่น A01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    ชื่อเล่น *
                  </label>
                  <input
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
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                  ชื่อจริง-นามสกุล (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  placeholder="ชื่อ-สกุล"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="08X-XXX"
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
                      setNewCustomer({
                        ...newCustomer,
                        facebook: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-[#1877F2] focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                    placeholder="ชื่อเฟส"
                  />
                </div>
              </div>

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

      {/* 🌟 MODAL: แก้ไขข้อมูลลูกค้า */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setEditModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                  <UserCog className="w-6 h-6 text-blue-500" />{" "}
                  แก้ไขข้อมูลลูกค้า
                </h2>
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  การแก้ไขชื่อจะอัปเดตไปยังทุกวงกู้และทุกประวัติการจ่าย
                </p>
              </div>
              <button
                onClick={() => !isUpdating && setEditModalOpen(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    รหัสลูกค้า
                  </label>
                  <input
                    type="text"
                    value={editCustomerData.code}
                    onChange={(e) =>
                      setEditCustomerData({
                        ...editCustomerData,
                        code: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-orange-50/50 border border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none font-black text-orange-500 text-sm transition-all uppercase"
                    placeholder="เช่น A01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    ชื่อเล่น *
                  </label>
                  <input
                    type="text"
                    value={editCustomerData.nickname}
                    onChange={(e) =>
                      setEditCustomerData({
                        ...editCustomerData,
                        nickname: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                  ชื่อจริง-นามสกุล (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={editCustomerData.name}
                  onChange={(e) =>
                    setEditCustomerData({
                      ...editCustomerData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editCustomerData.phone}
                    onChange={(e) =>
                      setEditCustomerData({
                        ...editCustomerData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-1">
                    ชื่อเฟสบุ๊ค
                  </label>
                  <input
                    type="text"
                    value={editCustomerData.facebook}
                    onChange={(e) =>
                      setEditCustomerData({
                        ...editCustomerData,
                        facebook: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isUpdating}
                  className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  บันทึกการแก้ไข
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
              <span className="text-gray-800">
                {customerToDelete?.name || customerToDelete?.nickname}
              </span>{" "}
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
