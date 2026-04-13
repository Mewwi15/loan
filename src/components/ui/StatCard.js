// src/components/ui/StatCard.js
import React from "react";

export default function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  trend,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 hover:shadow-md cursor-default">
      {/* ไอคอนพร้อมสีพื้นหลังที่รับค่าเข้ามา */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${colorClass}`}
      >
        <Icon className="w-7 h-7" />
      </div>

      {/* ชื่อการ์ด และ ตัวเลข */}
      <p className="text-gray-500 text-sm font-semibold mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>

      {/* ส่วนแสดงเทรนด์ (ถ้ามีข้อมูลส่งมา) เช่น +5% */}
      {trend && (
        <p
          className={`text-xs mt-2 font-bold ${trend.isUp ? "text-emerald-500" : "text-rose-500"}`}
        >
          {trend.isUp ? "↑" : "↓"} {trend.text}
        </p>
      )}
    </div>
  );
}
