"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function currentBillingMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [role, setRole] = useState(null);

  const [totalStudents, setTotalStudents] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [feesCollected, setFeesCollected] = useState(0);
  const [feesDue, setFeesDue] = useState(0);
  const [recentPayments, setRecentPayments] = useState([]);
  const [absentStudentNames, setAbsentStudentNames] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      const orgId = orgMember.organization_id;
      setRole(orgMember.role);

      const today = todayDateString();
      const billingMonth = currentBillingMonth();

      const { count: studentCount, error: studentCountError } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active");

      if (studentCountError) throw studentCountError;
      setTotalStudents(studentCount || 0);

      const { data: todayAttendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("status, students(name)")
        .eq("organization_id", orgId)
        .eq("attendance_date", today);

      if (attendanceError) throw attendanceError;

      const present = (todayAttendance || []).filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;

      const absentList = (todayAttendance || []).filter(
        (a) => a.status === "absent"
      );

      setPresentToday(present);
      setAbsentToday(absentList.length);
      setAbsentStudentNames(
        absentList.map((a) => a.students?.name).filter(Boolean)
      );

      const { data: feeRecords, error: feeError } = await supabase
        .from("fee_records")
        .select("amount_due, amount_paid")
        .eq("organization_id", orgId)
        .eq("billing_month", billingMonth);

      if (feeError) throw feeError;

      const collected = (feeRecords || []).reduce(
        (sum, r) => sum + Number(r.amount_paid || 0),
        0
      );

      const due = (feeRecords || []).reduce(
        (sum, r) =>
          sum +
          (Number(r.amount_due || 0) - Number(r.amount_paid || 0)),
        0
      );

      setFeesCollected(collected);
      setFeesDue(due > 0 ? due : 0);

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, payment_date, students(name)")
        .eq("organization_id", orgId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (paymentsError) throw paymentsError;

      setRecentPayments(payments || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        Taleem Manager
      </h1>

      <p
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 20,
        }}
      >
        {todayDateString()}
      </p>

      {errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="Total Students"
              value={totalStudents}
              color="#111827"
            />

            <StatCard
              label="Present Today"
              value={presentToday}
              color="#16a34a"
            />

            <StatCard
              label="Absent Today"
              value={absentToday}
              color="#dc2626"
            />

            <StatCard
              label="Fees Collected"
              value={`Rs ${feesCollected}`}
              color="#2563eb"
            />
          </div>

          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#991b1b",
                marginBottom: 6,
              }}
            >
              Fees Due This Month: Rs {feesDue}
            </div>

            {absentStudentNames.length > 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "#991b1b",
                }}
              >
                Absent today: {absentStudentNames.join(", ")}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            {role !== "teacher" && (
              <QuickAction
                href="/dashboard/students/add"
                label="+ Add Student"
              />
            )}

            <QuickAction
              href="/dashboard/attendance"
              label="✓ Mark Attendance"
            />

            {role !== "teacher" && (
              <QuickAction
                href="/dashboard/fees"
                label="💰 Collect Fee"
              />
            )}
          </div>

          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Recent Payments
          </h2>

          {recentPayments.length === 0 ? (
            <p
              style={{
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              No payments recorded yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                  }}
                >
                  <span>{p.students?.name || "Unknown"}</span>

                  <span style={{ color: "#6b7280" }}>
                    {p.payment_date}
                  </span>

                  <span style={{ fontWeight: 600 }}>
                    Rs {p.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({ href, label }) {
  return (
    <Link
      href={href}
      style={{
        padding: "10px 14px",
        background: "#111827",
        color: "white",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}
