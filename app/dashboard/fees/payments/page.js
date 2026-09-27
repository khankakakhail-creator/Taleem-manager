"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

const METHOD_COLORS = {
  cash: "#16a34a",
  easypaisa: "#059669",
  jazzcash: "#d97706",
  bank: "#2563eb",
  other: "#6b7280",
};

export default function PaymentsHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayDateString());

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  async function loadPayments() {
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

      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method, notes, students(name, father_name)")
        .eq("organization_id", orgMember.organization_id)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      setPayments(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.students?.name?.toLowerCase().includes(term) ||
      p.students?.father_name?.toLowerCase().includes(term)
    );
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Payments History</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>From</div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 13, marginBottom: 4 }}>To</div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <input
        type="text"
        placeholder="Search by student or father name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      {errorMsg && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, color: "#166534" }}>
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>
              Total: Rs {totalAmount}
            </span>
          </div>

          {filteredPayments.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No payments found in this range.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.students?.name || "Unknown"}</div>
                    {p.students?.father_name && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>S/O {p.students.father_name}</div>
                    )}
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{p.payment_date}</div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Rs {p.amount}</div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: (METHOD_COLORS[p.payment_method] || "#6b7280") + "22",
                        color: METHOD_COLORS[p.payment_method] || "#6b7280",
                      }}
                    >
                      {p.payment_method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 16,
};
          
