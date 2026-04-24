"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus,
  Package,
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

  const headerRef = useRef(null);
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFab(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  // 🌟 ฟังก์ชันฮีโร่: ซิงค์ยอดเป๊ะ 100% (ใช้ Logic กรองวงซ้ำแบบเดียวกับหน้า ID)
  const fixCustomerStats = async (customerList) => {
    try {
      // 1. ดึงวงกู้ "ทั้งหมด" (ทั้งปิดแล้วและกำลังเดิน) เพื่อเอามารวมและกรองวงเล็บ ()
      const loansSnap = await getDocs(collection(db, "loans"));
      const allLoans = loansSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const batch = writeBatch(db);
      let needsUpdate = false;

      for (const customer of customerList) {
        const customerId = customer.id;

        // 2. สร้างเงื่อนไขชื่อรูปแบบต่างๆ เพื่อหาประวัติวงเก่า
        const formattedName =
          customer.nickname && customer.name
            ? `${customer.nickname} (${customer.name})`
            : customer.nickname || customer.name || "";

        const searchNames = [];
        if (customer.name) searchNames.push(customer.name);
        if (customer.nickname) searchNames.push(customer.nickname);
        if (formattedName && !searchNames.includes(formattedName))
          searchNames.push(formattedName);

        // 3. กรองหาวงกู้ของคนนี้ (หาทั้งจาก ID และจากชื่อเก่าๆ)
        const myLoans = allLoans.filter(
          (l) =>
            l.customerId === customerId || searchNames.includes(l.customerName),
        );

        // 4. ลอจิกกรองวงซ้ำ (Deduplicate) ให้ความสำคัญกับวงที่มี () ก่อน และยึดสถานะ Active
        const loanMap = new Map();
        myLoans.forEach((data) => {
          const key = String(data.loanNumber || data.id).trim();
          if (loanMap.has(key)) {
            const existing = loanMap.get(key);
            if (existing.status === "closed" && data.status === "active") {
              loanMap.set(key, data);
            } else if (existing.status === data.status) {
              if (
                !existing.customerName?.includes("(") &&
                data.customerName?.includes("(")
              ) {
                loanMap.set(key, data);
              }
            }
          } else {
            loanMap.set(key, data);
          }
        });

        // 5. เลือกเฉพาะวงที่ยัง Active จริงๆ หลังจากการกรองซ้ำแล้ว
        const finalActiveLoans = Array.from(loanMap.values()).filter(
          (l) => l.status !== "closed",
        );

        let activeCount = finalActiveLoans.length; // จำนวนวงกู้ล้วนๆ ไม่รวมวงแชร์
        let debtNormal = 0;
        let debtPD = 0;

        // คำนวณยอดหนี้แยกประเภท
        finalActiveLoans.forEach((data) => {
          if (data.category === "PD") {
            debtPD += data.remainingBalance || 0;
          } else {
            debtNormal += data.remainingBalance || 0;
          }
        });

        // ตรวจสอบว่ามีข้อมูลเปลี่ยนไหม ถ้าเปลี่ยนให้บันทึกลง Database
        if (
          customer.activeLoans !== activeCount ||
          customer.totalDebt !== debtNormal ||
          customer.totalDebtPD !== debtPD
        ) {
          batch.update(doc(db, "customers", customerId), {
            activeLoans: activeCount,
            totalDebt: debtNormal,
            totalDebtPD: debtPD,
          });
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await batch.commit();
        console.log("✅ Auto-Sync: ซิงค์ยอดวงกู้สำเร็จตรงกันกับหน้า ID 100%");
      }
    } catch (error) {
      console.error("Error fixing customer stats:", error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "customers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      fixCustomerStats(customerList);

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

  // 🌟 UX: Scroll Restoration (จำตำแหน่งเลื่อน)
  useEffect(() => {
    if (!loading && customers.length > 0) {
      const lastViewedId = sessionStorage.getItem("lastViewedCustomer");
      if (lastViewedId) {
        setTimeout(() => {
          const element = document.getElementById(`customer-${lastViewedId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-4", "ring-orange-200", "scale-[1.01]");
            setTimeout(
              () =>
                element.classList.remove(
                  "ring-4",
                  "ring-orange-200",
                  "scale-[1.01]",
                ),
              1500,
            );
            sessionStorage.removeItem("lastViewedCustomer");
          }
        }, 300);
      }
    }
  }, [loading, customers]);

  const handleCustomerClick = (customerId) => {
    sessionStorage.setItem("lastViewedCustomer", customerId);
    router.push(`/customers/${customerId}`);
  };

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
        const checkSnap = await getDocs(
          query(
            collection(db, "customers"),
            where("code", "==", newCustomer.code.trim().toUpperCase()),
          ),
        );
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
        totalDebtPD: 0,
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
      console.error("Add Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setLoading(true);
    const batch = writeBatch(db);
    try {
      batch.delete(doc(db, "customers", customerToDelete.id));
      const loansSnapshot = await getDocs(
        query(
          collection(db, "loans"),
          where("customerId", "==", customerToDelete.id),
        ),
      );
      for (const loanDoc of loansSnapshot.docs) {
        batch.delete(loanDoc.ref);
        const schSnap = await getDocs(
          query(collection(db, "schedules"), where("loanId", "==", loanDoc.id)),
        );
        schSnap.forEach((s) => batch.delete(s.ref));
        const trSnap = await getDocs(
          query(
            collection(db, "transactions"),
            where("loanId", "==", loanDoc.id),
          ),
        );
        trSnap.forEach((t) => batch.delete(t.ref));
      }
      await batch.commit();
      setDeleteModalOpen(false);
      alert("ลบข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Delete Error:", error);
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
      const customerRef = doc(db, "customers", customerToEdit.id);
      batch.update(customerRef, {
        code: editCustomerData.code.trim().toUpperCase(),
        nickname: editCustomerData.nickname.trim(),
        name: editCustomerData.name.trim(),
        phone: editCustomerData.phone.trim(),
        facebook: editCustomerData.facebook.trim(),
      });
      await batch.commit();
      alert("✅ อัปเดตสำเร็จ!");
      setEditModalOpen(false);
    } catch (error) {
      console.error("Update Error:", error);
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

  const getCustomerDisplayName = (nickname, name) => {
    if (nickname && name) return `${nickname} (${name})`;
    if (nickname) return nickname;
    return name;
  };

  return (
    <div className="pb-24 px-4 sm:px-10 font-sans animate-in fade-in duration-500 relative min-h-screen">
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-8 right-8 z-50 flex items-center justify-center w-14 h-14 bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl transition-all duration-300 active:scale-95 border border-gray-700 ${showFab ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}
      >
        <Plus className="w-7 h-7 text-orange-500" />
      </button>

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
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl shadow-xl transition-all font-black uppercase tracking-widest text-sm"
        >
          <UserPlus className="w-5 h-5 text-orange-500" /> เพิ่มลูกค้าใหม่
        </button>
      </div>

      <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-gray-100 mb-10 flex flex-col xl:flex-row items-center gap-2">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="ค้นหาลูกค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-bold text-gray-700 placeholder:text-gray-300"
          />
        </div>
        <div className="flex w-full xl:w-auto items-center gap-2 px-2 pb-2 xl:pb-0">
          <div className="relative flex-1">
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
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-orange-500 shadow-sm" : "text-gray-400"}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-orange-500 shadow-sm" : "text-gray-400"}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          <p className="font-black text-[10px] uppercase">กำลังดึงข้อมูล...</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "list"
              ? "flex flex-col gap-4"
              : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          }
        >
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              id={`customer-${customer.id}`}
              onClick={() => handleCustomerClick(customer.id)}
              className={`bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative group ${viewMode === "list" ? "flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4" : "flex flex-col gap-5"}`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-[3.5rem] h-14 bg-orange-50 rounded-xl flex items-center justify-center text-lg font-black text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300 shadow-inner">
                  {customer.code ||
                    (customer.nickname || customer.name).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-gray-800 truncate">
                    {getCustomerDisplayName(customer.nickname, customer.name)}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-500">
                    <span>📞 {customer.phone || "-"}</span>
                    {customer.facebook && (
                      <span className="flex items-center gap-1 text-[#1877F2] truncate">
                        <MessageCircle className="w-3 h-3" />{" "}
                        {customer.facebook}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 🌟 แสดงยอดหนี้ ปกติ และ PD */}
              <div
                className={`grid grid-cols-2 md:flex items-start md:items-center gap-y-4 gap-x-8 border-t lg:border-t-0 lg:border-l-2 border-orange-100 pt-4 lg:pt-0 lg:pl-6 relative ${viewMode === "grid" ? "border-t border-l-0 pt-4 pl-0" : ""}`}
              >
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                    ยอดหนี้ปกติ
                  </p>
                  <p
                    className={`text-base font-black ${customer.totalDebt < 0 ? "text-red-500" : "text-gray-800"}`}
                  >
                    ฿{(customer.totalDebt || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                    <Package className="w-3 h-3" /> ยอดหนี้ PD
                  </p>
                  <p className="text-base font-black text-rose-500">
                    ฿{(customer.totalDebtPD || 0).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2 md:border-l md:border-gray-100 md:pl-6">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">
                    รวมวงกู้ทั้งหมด
                  </p>
                  <p className="text-base font-black text-blue-600">
                    {customer.activeLoans || 0} วง
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 w-full lg:w-auto">
                <span
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${customer.status === "ปกติ" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}
                >
                  {customer.status}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/loans/new?name=${encodeURIComponent(customer.nickname || customer.name)}&id=${customer.id}`,
                      );
                    }}
                    className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-xl transition-all shadow-sm"
                  >
                    <FileSignature className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => openEditModal(e, customer)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <UserCog className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToDelete(customer);
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALS --- */}
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
                    รหัสลูกค้า
                  </label>
                  <input
                    type="text"
                    value={newCustomer.code}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, code: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-orange-50/50 rounded-2xl outline-none font-black text-orange-500 text-sm transition-all uppercase placeholder:normal-case"
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
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                    placeholder="จูน"
                  />
                </div>
              </div>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm transition-all text-gray-700"
                placeholder="ชื่อจริง-นามสกุล"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                  placeholder="เบอร์โทรศัพท์"
                />
                <input
                  type="text"
                  value={newCustomer.facebook}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, facebook: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                  placeholder="ชื่อเฟสบุ๊ค"
                />
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block mb-2">
                  เอกสารประกอบการกู้ (PDF)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-xs font-black text-green-700">
                        {selectedFile.name}
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
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200"
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
                  )}{" "}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setEditModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 mb-6">
              <UserCog className="w-6 h-6 text-blue-500" /> แก้ไขข้อมูลลูกค้า
            </h2>
            <form onSubmit={handleUpdateCustomer} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={editCustomerData.code}
                  onChange={(e) =>
                    setEditCustomerData({
                      ...editCustomerData,
                      code: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 bg-orange-50/50 rounded-2xl outline-none font-black text-orange-500 text-sm transition-all uppercase"
                  placeholder="รหัสลูกค้า"
                />
                <input
                  type="text"
                  value={editCustomerData.nickname}
                  onChange={(e) =>
                    setEditCustomerData({
                      ...editCustomerData,
                      nickname: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                  placeholder="ชื่อเล่น"
                />
              </div>
              <input
                type="text"
                value={editCustomerData.name}
                onChange={(e) =>
                  setEditCustomerData({
                    ...editCustomerData,
                    name: e.target.value,
                  })
                }
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                placeholder="ชื่อจริง-นามสกุล"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="tel"
                  value={editCustomerData.phone}
                  onChange={(e) =>
                    setEditCustomerData({
                      ...editCustomerData,
                      phone: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                  placeholder="เบอร์โทรศัพท์"
                />
                <input
                  type="text"
                  value={editCustomerData.facebook}
                  onChange={(e) =>
                    setEditCustomerData({
                      ...editCustomerData,
                      facebook: e.target.value,
                    })
                  }
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm text-gray-700"
                  placeholder="เฟสบุ๊ค"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isUpdating}
                  className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {customerToDelete?.nickname || customerToDelete?.name}
              </span>{" "}
              จะหายไปถาวร
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="w-full py-4 rounded-2xl font-black text-gray-600 bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="w-full py-4 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
