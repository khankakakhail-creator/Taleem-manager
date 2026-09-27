"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthToBillingDate(monthStr) {
  return `${monthStr}-01`;
}

const PAYMENT_METHODS = ["cash", "easypaisa", "jazzcash", "bank", "other"];

export default function FeesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [students, setStudents] = useState([]);
  const [feeRecords, setFeeRecords] = useState({});

  const [selectedMonth, setSelectedMonth] = useState(currentMonthString());
  const [generating, setGenerating] = useState(false);

  const [payingStudentId, setPayingStudentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", payment_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (orgId) {
      loadFeeRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, selectedMonth]);

  async function loadInitialData() {
    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in.");
      setUserId(user.id);

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      setOrgId(orgMember.organization_id);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, father_name, monthly_fee")
        .eq("organization_id", orgMember.organization_id)
        .eq("status", "active")
        .order("name");

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeeRecords() {
    setErrorMsg("");

    try {
      const billingMonth = monthToBillingDate(selectedMonth);

      const { data, error } = await supabase
        .from("fee_records")
        .select("id, student_id, billing_month, amount_due, amount_paid")
        .eq("organization_id", orgId)
        .eq("billing_month", billingMonth);

      if (error) throw error;

      const map = {};
      (data || []).forEach((r) => {
        map[r.student_id] = r;
      });
      setFeeRecords(map);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load fee records.");
    }
  }

  async function handleGenerateFees() {
    setGenerating(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const billingMonth = monthToBillingDate(selectedMonth);

      const rowsToCreate = students
        .filter((s) => !feeRecords[s.id])
        .map((s) => ({
          organization_id: orgId,
          student_id: s.id,
          billing_month: billingMonth,
          amount_due: s.monthly_fee || 0,
          amount_paid: 0,
        }));

      if (rowsToCreate.length === 0) {
        setSuccessMsg("Fee records already exist for all students this month.");
        setGenerating(false);
        return;
      }

      const { error: insertError } = await supabase.from("fee_records").insert(rowsToCreate);

      if (insertError) throw insertError;

      setSuccessMsg(`Generated fee records for ${rowsToCreate.length} student(s).`);
      loadFeeRecords();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate fee records.");
    } finally {
      setGenerating(false);
    }
  }

  function openPaymentForm(studentId) {
    setPayingStudentId(studentId);
    setPaymentForm({
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().slice(0, 10),
    });
    setErrorMsg("");
    setSuccessMsg("");
  }

  function handlePaymentChange(e) {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const feeRecord = feeRecords[payingStudentId];
    if (!feeRecord) {
      setErrorMsg("Fee record not found. Please generate fees for this month first.");
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setErrorMsg("Please enter a valid payment amount.");
      return;
    }

    setSaving(true);

    try {
      const { error: paymentError } = await supabase.from("payments").insert([
        {
          organization_id: orgId,
          fee_record_id: feeRecord.id,
          student_id: payingStudentId,
          amount: amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          recorded_by_user_id: userId,
        },
      ]);

      if (paymentError) throw paymentError;

      const newAmountPaid = Number(feeRecord.amount_paid || 0) + amount;

      const { error: updateError } = await supabase
        .from("fee_records")
        .update({ amount_paid: newAmountPaid })
        .eq("id", feeRecord.id);

      if (updateError) throw updateError;

      setSuccessMsg("Payment recorded successfully!");
      setPayingStudentId(null);
      loadFeeRecords();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  function getStatus(record) {
    if (!record) return { label: "Not Generated", color: "#9ca3af" };
    const due = Number(record.amount_due || 0);
    const paid = Number(record.amount_paid || 0);
    if (paid >= due && due > 0) return { label: "Paid", color: "#16a34a" };
    if (paid > 0) return { label: "Partial", color: "#d97706" };
    return { label: "Unpaid", color: "#dc2626" };
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
  <h1 style={{ fontSize: 22, fontWeight: 700 }}>Fees</h1>
  <Link
    href="/dashboard/fees/report"
    style={{
      fontSize: 13,
      color: "#2563eb",
      textDecoration: "none",
      fontWeight: 600,
    }}
  >
    📄 Monthly Report
  </Link>
</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Month</div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 16,
            }}
          />
        </label>

        <button
          onClick={handleGenerateFees}
          disabled={generating}
          style={{
            padding: "10px 14px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {generating ? "Generating..." : "Generate Fees"}
        </button>
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

      {loading ? (
        <p>Loading...</p>
      ) : students.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No active students found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {students.map((s) => {
            const record = feeRecords[s.id];
            const status = getStatus(record);
            const due = record ? Number(record.amount_due || 0) : Number(s.monthly_fee || 0);
            const paid = record ? Number(record.amount_paid || 0) : 0;
            const remaining = due - paid;

            return (
              <div
                key={s.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{s.name}</div>
                    {s.father_name && (
                      <div style={{ fontSize: 13, color: "#6b7280" }}>S/O {s.father_name}</div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: status.color + "22",
                      color: status.color,
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                  <span>Due: Rs {due}</span>
                  <span>Paid: Rs {paid}</span>
                  <span style={{ fontWeight: 600, color: remaining > 0 ? "#dc2626" : "#16a34a" }}>
                    Remaining: Rs {remaining > 0 ? remaining : 0}
                  </span>
                </div>

                {record && remaining > 0 && (
                  <button
                    onClick={() => openPaymentForm(s.id)}
                    style={{
                      padding: "8px 14px",
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Record Payment
                  </button>
                )}

                {!record && (
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>
                    Fee record not generated for this month yet.
                  </p>
                )}

                {payingStudentId === s.id && (
                  <form
                    onSubmit={handleRecordPayment}
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: "#f9fafb",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <label>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Amount (Remaining: Rs {remaining})</div>
                      <input
                        type="number"
                        name="amount"
                        value={paymentForm.amount}
                        onChange={handlePaymentChange}
                        required
                        style={inputStyle}
                      />
                    </label>

                    <label>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Payment Method</div>
                      <select
                        name="payment_method"
                        value={paymentForm.payment_method}
                        onChange={handlePaymentChange}
                        style={inputStyle}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>Payment Date</div>
                      <input
                        type="date"
                        name="payment_date"
                        value={paymentForm.payment_date}
                        onChange={handlePaymentChange}
                        required
                        style={inputStyle}
                      />
                    </label>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {saving ? "Saving..." : "Confirm Payment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayingStudentId(null)}
                        style={{
                          padding: "10px 14px",
                          background: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 14,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
};
  
