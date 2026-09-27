"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../utils/supabase";

const STATUS_LABELS = {
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  late: "Late",
};

const STATUS_COLORS = {
  present: "#16a34a",
  absent: "#dc2626",
  leave: "#d97706",
  late: "#2563eb",
};

function monthLabel(billingMonthDate) {
  const d = new Date(billingMonthDate);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState(null);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [feeRecords, setFeeRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feeLoading, setFeeLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadAttendance();
    loadFeeHistory();
  }, [studentId]);

  async function loadData() {
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
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      const currentOrgId = orgMember.organization_id;

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("organization_id", currentOrgId)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) throw new Error("Student not found.");

      setForm(studentData);

      const { data: programsData } = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", currentOrgId)
        .eq("active", true)
        .order("name");
      setPrograms(programsData || []);

      const { data: batchesData } = await supabase
        .from("batches")
        .select("id, name")
        .eq("organization_id", currentOrgId)
        .eq("active", true)
        .order("name");
      setBatches(batchesData || []);

      const { data: membersData } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", currentOrgId);

      const memberIds = (membersData || []).map((m) => m.user_id);
      let teachersList = [];
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        teachersList = (membersData || []).map((m) => {
          const profile = (profilesData || []).find((p) => p.id === m.user_id);
          return {
            user_id: m.user_id,
            full_name: profile?.full_name || "Unnamed User",
          };
        });
      }
      setTeachers(teachersList);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load student.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    setAttendanceLoading(true);

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("attendance_date, status, notes")
        .eq("student_id", studentId)
        .order("attendance_date", { ascending: false });

      if (error) throw error;

      setAttendanceRecords(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadFeeHistory() {
    setFeeLoading(true);

    try {
      const { data: feeData, error: feeError } = await supabase
        .from("fee_records")
        .select("id, billing_month, amount_due, amount_paid")
        .eq("student_id", studentId)
        .order("billing_month", { ascending: false });

      if (feeError) throw feeError;
      setFeeRecords(feeData || []);

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method")
        .eq("student_id", studentId)
        .order("payment_date", { ascending: false });

      if (paymentError) throw paymentError;
      setPayments(paymentData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFeeLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const payload = {
        name: form.name?.trim(),
        father_name: form.father_name?.trim() || null,
        photo_url: form.photo_url?.trim() || null,
        dob: form.dob || null,
        admission_date: form.admission_date || null,
        gender: form.gender || null,
        program_id: form.program_id || null,
        batch_id: form.batch_id || null,
        primary_teacher_id: form.primary_teacher_id || null,
        monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
        whatsapp: form.whatsapp?.trim() || null,
        phone: form.phone?.trim() || null,
        alternate_phone: form.alternate_phone?.trim() || null,
        address: form.address?.trim() || null,
        notes: form.notes?.trim() || null,
        status: form.status || "active",
      };

      const { error: updateError } = await supabase
        .from("students")
        .update(payload)
        .eq("id", studentId);

      if (updateError) throw updateError;

      setSuccessMsg("Student updated successfully!");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update student.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    const newStatus = form.status === "active" ? "inactive" : "active";
    setSaving(true);
    setErrorMsg("");

    try {
      const { error: updateError } = await supabase
        .from("students")
        .update({ status: newStatus })
        .eq("id", studentId);

      if (updateError) throw updateError;

      setForm((prev) => ({ ...prev, status: newStatus }));
      setSuccessMsg(`Student marked as ${newStatus}.`);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  const attendanceStats = (() => {
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    const absent = attendanceRecords.filter((r) => r.status === "absent").length;
    const leave = attendanceRecords.filter((r) => r.status === "leave").length;
    const late = attendanceRecords.filter((r) => r.status === "late").length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : null;
    return { present, absent, leave, late, total, percentage };
  })();

  const feeTotals = feeRecords.reduce(
    (acc, r) => {
      const due = Number(r.amount_due || 0);
      const paid = Number(r.amount_paid || 0);
      acc.due += due;
      acc.paid += paid;
      acc.remaining += due - paid;
      return acc;
    },
    { due: 0, paid: 0, remaining: 0 }
  );

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (errorMsg && !form) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8 }}>
          {errorMsg}
        </div>
        <Link href="/dashboard/students" style={{ display: "inline-block", marginTop: 16 }}>
          ← Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Link href="/dashboard/students" style={{ fontSize: 14, color: "#2563eb", textDecoration: "none" }}>
        ← Back to Students
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{form.name}</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/dashboard/students/${studentId}/slip`}
            style={{
              padding: "8px 14px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              alignSelf: "center",
            }}
          >
            📄 Fee Slip
          </Link>

          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: "8px 14px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Edit
            </button>
          )}

          <button
            onClick={handleToggleStatus}
            disabled={saving}
            style={{
              padding: "8px 14px",
              background: form.status === "active" ? "#f3f4f6" : "#dcfce7",
              color: form.status === "active" ? "#374151" : "#166534",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {form.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {!editMode ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <InfoRow label="Father Name" value={form.father_name} />
            <InfoRow label="Status" value={form.status} />
            <InfoRow label="Program" value={programs.find((p) => p.id === form.program_id)?.name} />
            <InfoRow label="Batch" value={batches.find((b) => b.id === form.batch_id)?.name} />
            <InfoRow
              label="Primary Teacher"
              value={teachers.find((t) => t.user_id === form.primary_teacher_id)?.full_name}
            />
            <InfoRow label="Monthly Fee" value={form.monthly_fee ? `Rs ${form.monthly_fee}` : ""} />
            <InfoRow label="WhatsApp" value={form.whatsapp} />
            <InfoRow label="Phone" value={form.phone} />
            <InfoRow label="Alternate Phone" value={form.alternate_phone} />
            <InfoRow label="Date of Birth" value={form.dob} />
            <InfoRow label="Admission Date" value={form.admission_date} />
            <InfoRow label="Address" value={form.address} />
            <InfoRow label="Notes" value={form.notes} />
          </div>

          {/* ATTENDANCE HISTORY */}
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Attendance History</h2>

          {attendanceLoading ? (
            <p>Loading attendance...</p>
          ) : attendanceRecords.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No attendance recorded yet.</p>
          ) : (
            <>
              <div
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#6b7280", flexWrap: "wrap" }}>
                  <span>Present: {attendanceStats.present}</span>
                  <span>Absent: {attendanceStats.absent}</span>
                  <span>Leave: {attendanceStats.leave}</span>
                  <span>Late: {attendanceStats.late}</span>
                  <span>Total: {attendanceStats.total}</span>
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color:
                      attendanceStats.percentage === null
                        ? "#9ca3af"
                        : attendanceStats.percentage >= 75
                        ? "#16a34a"
                        : "#dc2626",
                  }}
                >
                  {attendanceStats.percentage === null ? "—" : `${attendanceStats.percentage}%`}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                {attendanceRecords.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "white",
                      border: "1px solid #f3f4f6",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{r.attendance_date}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: STATUS_COLORS[r.status] + "22",
                        color: STATUS_COLORS[r.status],
                      }}
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* FEE HISTORY */}
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Fee History</h2>

          {feeLoading ? (
            <p>Loading fee history...</p>
          ) : feeRecords.length === 0 ? (
            <p style={{ color: "#6b7280", marginBottom: 24 }}>No fee records yet.</p>
          ) : (
            <>
              <div
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                  display: "flex",
                  gap: 12,
                  fontSize: 12,
                  color: "#6b7280",
                  flexWrap: "wrap",
                }}
              >
                <span>Total Due: Rs {feeTotals.due}</span>
                <span>Total Paid: Rs {feeTotals.paid}</span>
                <span style={{ fontWeight: 700, color: feeTotals.remaining > 0 ? "#dc2626" : "#16a34a" }}>
                  Total Remaining: Rs {feeTotals.remaining > 0 ? feeTotals.remaining : 0}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {feeRecords.map((r) => {
                  const due = Number(r.amount_due || 0);
                  const paid = Number(r.amount_paid || 0);
                  const remaining = due - paid;
                  let status = "Unpaid";
                  let color = "#dc2626";
                  if (paid >= due && due > 0) {
                    status = "Paid";
                    color = "#16a34a";
                  } else if (paid > 0) {
                    status = "Partial";
                    color = "#d97706";
                  }

                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "white",
                        border: "1px solid #f3f4f6",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{monthLabel(r.billing_month)}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Due: Rs {due} · Paid: Rs {paid} · Remaining: Rs {remaining > 0 ? remaining : 0}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: color + "22",
                          color: color,
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* PAYMENT HISTORY */}
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Payment History</h2>

          {feeLoading ? (
            <p>Loading payments...</p>
          ) : payments.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No payments recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "white",
                    border: "1px solid #f3f4f6",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{p.payment_date}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Rs {p.amount}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{p.payment_method}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label>
            Student Name *
            <input name="name" value={form.name || ""} onChange={handle
