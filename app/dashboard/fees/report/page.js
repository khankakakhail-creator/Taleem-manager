"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../utils/supabase";

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthToBillingDate(monthStr) {
  return `${monthStr}-01`;
}

function monthLabel(monthStr) {
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function FeeCollectionReportPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [orgName, setOrgName] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthString());

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function loadReport() {
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
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      setOrgName(orgMember.organizations?.name || "Taleem Manager");

      const orgId = orgMember.organization_id;
      const billingMonth = monthToBillingDate(selectedMonth);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, father_name, monthly_fee")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("name");

      if (studentsError) throw studentsError;

      const { data: feeData, error: feeError } = await supabase
        .from("fee_records")
        .select("student_id, amount_due, amount_paid")
        .eq("organization_id", orgId)
        .eq("billing_month", billingMonth);

      if (feeError) throw feeError;

      const combined = (studentsData || []).map((s) => {
        const record = (feeData || []).find((f) => f.student_id === s.id);
        const due = record ? Number(record.amount_due || 0) : Number(s.monthly_fee || 0);
        const paid = record ? Number(record.amount_paid || 0) : 0;
        const remaining = due - paid;

        let status = "Not Generated";
        if (record) {
          if (paid >= due && due > 0) status = "Paid";
          else if (paid > 0) status = "Partial";
          else status = "Unpaid";
        }

        return {
          name: s.name,
          father_name: s.father_name,
          due,
          paid,
          remaining: remaining > 0 ? remaining : 0,
          status,
        };
      });

      setRows(combined);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.due += r.due;
      acc.paid += r.paid;
      acc.remaining += r.remaining;
      return acc;
    },
    { due: 0, paid: 0, remaining: 0 }
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
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
          onClick={() => window.print()}
          style={{
            padding: "10px 16px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{orgName}</h1>
        <p style={{ fontSize: 15, color: "#374151", margin: "4px 0 0" }}>
          Fee Collection Report — {monthLabel(selectedMonth)}
        </p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #111827" }}>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Due</th>
                <th style={thStyle}>Paid</th>
                <th style={thStyle}>Remaining</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={tdStyle}>
                    {r.name}
                    {r.father_name && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>S/O {r.father_name}</div>
                    )}
                  </td>
                  <td style={tdStyle}>Rs {r.due}</td>
                  <td style={tdStyle}>Rs {r.paid}</td>
                  <td style={tdStyle}>Rs {r.remaining}</td>
                  <td style={tdStyle}>{r.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #111827", fontWeight: 700 }}>
                <td style={tdStyle}>Total</td>
                <td style={tdStyle}>Rs {totals.due}</td>
                <td style={tdStyle}>Rs {totals.paid}</td>
                <td style={tdStyle}>Rs {totals.remaining}</td>
                <td style={tdStyle}></td>
              </tr>
            </tfoot>
          </table>

          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 20, textAlign: "center" }}>
            Generated on {new Date().toLocaleDateString()}
          </p>
        </>
      )}
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "8px 6px" };
const tdStyle = { padding: "8px 6px" };
            
