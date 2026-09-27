"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../utils/supabase";

function monthLabel(billingMonthDate) {
  const d = new Date(billingMonthDate);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const MONTH_OPTIONS = [1, 3, 5, 10, 20];

export default function StudentFeeSlipPage() {
  const params = useParams();
  const studentId = params.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [orgName, setOrgName] = useState("");
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [monthsCount, setMonthsCount] = useState(5);

  useEffect(() => {
    loadSlip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsCount]);

  async function loadSlip() {
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

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, name, father_name, phone, whatsapp")
        .eq("id", studentId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (studentError) throw studentError;
      if (!studentData) throw new Error("Student not found.");

      setStudent(studentData);

      const { data: feeData, error: feeError } = await supabase
        .from("fee_records")
        .select("billing_month, amount_due, amount_paid")
        .eq("organization_id", orgId)
        .eq("student_id", studentId)
        .order("billing_month", { ascending: false })
        .limit(monthsCount);

      if (feeError) throw feeError;

      setRecords((feeData || []).reverse());
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load fee slip.");
    } finally {
      setLoading(false);
    }
  }

  const totals = records.reduce(
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

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
        <label style={{ flex: 1 }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Number of Months</div>
          <select
            value={monthsCount}
            onChange={(e) => setMonthsCount(Number(e.target.value))}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 16,
            }}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                Last {m} month{m > 1 ? "s" : ""}
              </option>
            ))}
          </select>
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

      {loading ? (
        <p>Loading...</p>
      ) : student ? (
        <>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{orgName}</h1>
            <p style={{ fontSize: 14, color: "#374151", margin: "4px 0 0" }}>Fee Slip</p>
          </div>

          <div style={{ marginBottom: 16, fontSize: 14 }}>
            <div>
              <strong>Student:</strong> {student.name}
            </div>
            {student.father_name && (
              <div>
                <strong>Father Name:</strong> {student.father_name}
              </div>
            )}
            {student.phone && (
              <div>
                <strong>Phone:</strong> {student.phone}
              </div>
            )}
          </div>

          {records.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No fee records found for this student.</p>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #111827" }}>
                    <th style={thStyle}>Month</th>
                    <th style={thStyle}>Due</th>
                    <th style={thStyle}>Paid</th>
                    <th style={thStyle}>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const due = Number(r.amount_due || 0);
                    const paid = Number(r.amount_paid || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={tdStyle}>{monthLabel(r.billing_month)}</td>
                        <td style={tdStyle}>Rs {due}</td>
                        <td style={tdStyle}>Rs {paid}</td>
                        <td style={tdStyle}>Rs {due - paid > 0 ? due - paid : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #111827", fontWeight: 700 }}>
                    <td style={tdStyle}>Total</td>
                    <td style={tdStyle}>Rs {totals.due}</td>
                    <td style={tdStyle}>Rs {totals.paid}</td>
                    <td style={tdStyle}>Rs {totals.remaining}</td>
                  </tr>
                </tfoot>
              </table>

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 20, textAlign: "center" }}>
                Generated on {new Date().toLocaleDateString()}
              </p>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "8px 6px" };
const tdStyle = { padding: "8px 6px" };
            
