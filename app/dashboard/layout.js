"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import { RoleContext } from "../utils/role-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/students", label: "Students", icon: "🎓" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "✅" },
  { href: "/dashboard/fees", label: "Fees", icon: "💰", adminOnly: true },
  { href: "/dashboard/more", label: "More", icon: "⋯" },
];

const TEACHER_BLOCKED_PATHS = [
  "/dashboard/fees",
  "/dashboard/batches",
  "/dashboard/students/add",
];

function isBlockedForTeacher(pathname) {
  const blockedByPrefix = TEACHER_BLOCKED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isFeeSlip = /^\/dashboard\/students\/[^/]+\/slip/.test(pathname);
  return blockedByPrefix || isFeeSlip;
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [ctx, setCtx] = useState({ role: null, userId: null, orgId: null });

  useEffect(() => {
    loadRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRole() {
    try {
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      setCtx({
        role: member?.role || null,
        userId: user.id,
        orgId: member?.organization_id || null,
      });
    } catch (err) {
      console.error(err);
    }

    setReady(true);
  }

  const isTeacher = ctx.role === "teacher";
  const visibleNav = NAV_ITEMS.filter((item) => !(item.adminOnly && isTeacher));
  const blocked = isTeacher && isBlockedForTeacher(pathname);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  return (
    <RoleContext.Provider value={ctx}>
      <div style={{ minHeight: "100vh", paddingBottom: 70, background: "#f9fafb" }}>
        <div>
          {blocked ? (
            <div style={{ maxWidth: 600, margin: "0 auto", padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
                This section is only available to Admin/Owner accounts.
              </p>
              <Link
                href="/dashboard"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  background: "#111827",
                  color: "white",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Go to Home
              </Link>
            </div>
          ) : (
            children
          )}
        </div>

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
          {visibleNav.map((item) => {
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
    </RoleContext.Provider>
  );
}
