"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

export default function MorePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [info, setInfo] = useState(null);

  useEffect(() => {
    loadInfo();
  }, []);

  async function loadInfo() {
    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in.");

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("role, organizations(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      setInfo({
        email: user.email,
        fullName: profile?.full_name || "",
        phone: profile?.phone || "",
        role: orgMember?.role || "—",
        orgName: orgMember?.organizations?.name || "—",
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMsg(error.message || "Logout failed.");
      setLoggingOut(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>More</h1>

      {errorMsg && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : info ? (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>Logged in as</div>

          {info.fullName && (
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{info.fullName}</div>
          )}
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{info.email}</div>

          <InfoRow label="Role" value={info.role} />
          <InfoRow label="Organization" value={info.orgName} />
          {info.phone && <InfoRow label="Phone" value={info.phone} />}
        </div>
      ) : null}

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Quick Links</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        <MenuLink href="/dashboard/batches" label="🕒 Batches" />
        <MenuLink href="/dashboard/attendance/history" label="📊 Attendance Report" />
        <MenuLink href="/dashboard/fees/report" label="📄 Monthly Fee Report" />
        <MenuLink href="/dashboard/fees/payments" label="💰 Payments History" />
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderTop: "1px solid #f3f4f6",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function MenuLink({ href, label }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "14px 16px",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 600,
        color: "#111827",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
                  }
