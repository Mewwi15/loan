import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // 1. รับไฟล์รูปภาพจากหน้าบ้านที่ส่งมา
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
    }

    // 2. เตรียมแพ็กเกจส่งไปหา Easy Slip
    const easyslipFormData = new FormData();
    easyslipFormData.append("file", file);

    // 🌟 นำ API Key ที่บอสให้มาใส่ไว้ตรงนี้ครับ (ปลอดภัยเพราะรันบน Server Vercel)
    const API_KEY = "7bfce0dc-acde-484a-9c2f-9121e16a777b";

    // 3. ยิงไปหา Easy Slip API v1 (รองรับการตรวจด้วยรูปภาพ)
    const response = await fetch(
      "https://developer.easyslip.com/api/v1/verify",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        body: easyslipFormData,
      },
    );

    const data = await response.json();

    // 4. ส่งข้อมูลกลับไปให้หน้าเว็บเรา
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error verifying slip:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 },
    );
  }
}
