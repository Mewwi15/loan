import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(request) {
  try {
    // 1. เช็คเวลาปัจจุบัน (ตั้งเป็นโซนเวลาไทยเสมอ)
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
    );
    const hour = now.getHours();

    // จัดฟอร์แมตวันที่ YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // ดึงข้อมูลจากไฟล์ .env
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    const adminEmail = process.env.ADMIN_EMAIL; // รองรับอีเมลที่คั่นด้วยลูกน้ำ (,)

    if (!gmailUser || !gmailPass || !adminEmail) {
      throw new Error("ยังไม่ได้ตั้งค่าตัวแปรในไฟล์ .env.local ให้ครบถ้วน");
    }

    let subject = "";
    let htmlContent = "";

    // ==========================================
    // 🌅 ภารกิจรอบเช้า (ทำงานตอนช่วง 06:00 - 12:00)
    // ==========================================
    if (hour >= 6 && hour <= 12) {
      // ดึงเป้าเก็บรายวัน
      const scheduleQ = query(
        collection(db, "schedules"),
        where("dueDate", "==", todayStr),
      );
      const scheduleSnap = await getDocs(scheduleQ);
      let targetAmount = 0;
      let pendingCount = 0;

      scheduleSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending") {
          targetAmount += data.amount || 0;
          pendingCount++;
        }
      });

      // ดึงวงแชร์ที่ต้องหมุน
      const sharesQ = query(
        collection(db, "shares"),
        where("status", "==", "active"),
      );
      const sharesSnap = await getDocs(sharesQ);
      let dueSharesCount = 0;

      sharesSnap.forEach((docSnap) => {
        const s = docSnap.data();
        if (s.startDate) {
          const d = new Date(s.startDate);
          const periodsToAdd = (s.currentPeriod || 1) - 1;
          if (s.frequencyType === "day") {
            d.setDate(d.getDate() + periodsToAdd * Number(s.frequency || 1));
          } else if (s.frequencyType === "month") {
            d.setMonth(d.getMonth() + periodsToAdd * Number(s.frequency || 1));
          }
          const sYear = d.getFullYear();
          const sMonth = String(d.getMonth() + 1).padStart(2, "0");
          const sDay = String(d.getDate()).padStart(2, "0");
          const calcDueDate = `${sYear}-${sMonth}-${sDay}`;

          if (calcDueDate <= todayStr) {
            dueSharesCount++;
          }
        }
      });

      subject = `🌅 ภารกิจประจำวัน: ${todayStr}`;
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #f97316; padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0;">สรุปภารกิจยามเช้า ☕</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">ประจำวันที่ ${todayStr}</p>
          </div>
          <div style="padding: 32px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #374151;">อรุณสวัสดิ์ครับบอส! นี่คือรายการที่คุณต้องจัดการในวันนี้:</p>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 12px 0; color: #9a3412;">🎯 เป้าหมายที่ต้องเก็บวันนี้</h3>
              <p style="margin: 4px 0; font-size: 24px; font-weight: bold; color: #ea580c;">฿${targetAmount.toLocaleString()}</p>
              <p style="margin: 0; color: #ea580c; font-size: 14px;">จำนวนลูกค้าที่ต้องตาม: ${pendingCount} บิล</p>
            </div>

            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 12px 0; color: #1e40af;">🎰 วงแชร์ที่ต้องหมุน</h3>
              <p style="margin: 4px 0; font-size: 20px; font-weight: bold; color: #2563eb;">${dueSharesCount} วง</p>
            </div>

            <p style="text-align: center; margin-top: 32px;">
              <a href="https://your-website.com" style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">เข้าสู่ระบบ Dashboard</a>
            </p>
          </div>
        </div>
      `;
    }
    // ==========================================
    // 🌙 สรุปผลรอบเย็น (ทำงานตอนช่วง 18:00 - 23:59)
    // ==========================================
    else if (hour >= 18 && hour <= 23) {
      const scheduleQ = query(
        collection(db, "schedules"),
        where("dueDate", "==", todayStr),
      );
      const scheduleSnap = await getDocs(scheduleQ);
      let collectedAmount = 0;
      let profitToday = 0;

      scheduleSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "paid") {
          collectedAmount += data.amount || 0;
          profitToday += data.profitShare || 0;
        }
      });

      subject = `🌙 สรุปผลประกอบการ: ${todayStr}`;
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #1f2937; padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0;">สรุปยอดก่อนนอน 🌙</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">ประจำวันที่ ${todayStr}</p>
          </div>
          <div style="padding: 32px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #374151;">หมดเวลาทำการแล้วครับ! นี่คือผลประกอบการของคุณวันนี้:</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 12px 0; color: #166534;">✅ ยอดเงินกู้ที่จัดเก็บได้จริง</h3>
              <p style="margin: 4px 0; font-size: 24px; font-weight: bold; color: #15803d;">฿${collectedAmount.toLocaleString()}</p>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 12px 0; color: #1e40af;">💰 กำไรสุทธิของวันนี้</h3>
              <p style="margin: 4px 0; font-size: 24px; font-weight: bold; color: #1d4ed8;">+ ฿${profitToday.toLocaleString()}</p>
            </div>

            <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 32px;">พักผ่อนให้เต็มที่นะครับ เจอกันพรุ่งนี้!</p>
          </div>
        </div>
      `;
    }
    // กรณีที่เรียกใช้งานนอกเวลา (เอาไว้ทดสอบ)
    else {
      return NextResponse.json({
        message: "ไม่ใช่เวลาส่งรายงาน (เช้า: 06:00-12:00, เย็น: 18:00-23:59)",
        currentHour: hour,
      });
    }

    // 2. ตั้งค่าระบบส่งอีเมล (Nodemailer)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // 3. สั่งส่งอีเมลแบบกลุ่ม (ใช้ bcc เพื่อปิดบังอีเมลระหว่างผู้รับ)
    await transporter.sendMail({
      from: `"LoanTrack Assistant" <${gmailUser}>`,
      bcc: adminEmail, // รองรับผู้รับหลายคน (ใส่คอมม่าคั่นใน .env.local)
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json({
      success: true,
      message: "ส่งอีเมลสรุปยอดสำเร็จ!",
    });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
