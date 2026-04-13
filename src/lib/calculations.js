// src/lib/calculations.js

export function generateLoanSchedule(data) {
  const {
    principal,
    interest,
    installments,
    startDate,
    frequency,
    frequencyType,
  } = data;

  const totalAmount = Number(principal) + Number(interest);
  const count = Number(installments);

  // 1. คำนวณยอดต่องวดแบบปัดเศษลงทั้งหมด
  const baseInstallment = Math.floor(totalAmount / count);

  // 2. หายอดเศษที่เหลือเพื่อไปโปะงวดสุดท้าย
  const remainder = totalAmount - baseInstallment * count;

  let schedules = [];
  let currentDate = new Date(startDate);
  const targetDay = currentDate.getDate();

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amount = isLast ? baseInstallment + remainder : baseInstallment;

    schedules.push({
      installmentNo: i,
      dueDate: currentDate.toISOString().split("T")[0],
      amount: amount,
    });

    // 3. คำนวณวันที่ของงวดถัดไป
    if (frequencyType === "daily") {
      currentDate.setDate(currentDate.getDate() + Number(frequency));
    } else {
      // รายเดือน: เลื่อนไปเดือนถัดไปและคุมวันที่ให้ตรงกัน
      currentDate.setMonth(currentDate.getMonth() + 1);
      // กรณีวันที่ 31 แต่เดือนถัดไปไม่มี ให้ปัดลงเป็นวันสุดท้ายของเดือนนั้น
      if (currentDate.getDate() !== targetDay) {
        currentDate.setDate(0);
      }
    }
  }

  return { schedules, totalAmount };
}
