"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/students", label: "Students", icon: "🎓" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "✅" },
  { href: "/dashboard/fees", label: "Fees", icon: "💰" },
  { href: "/dashboard/more", label: "More", icon: "⋯" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 70, background: "#f9fafb" }}>
      <div>{children}</div>

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                textDecoration: "none",
                color: isActive ? "#16a34a" : "#9ca3af",
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                minWidth: 60,
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
