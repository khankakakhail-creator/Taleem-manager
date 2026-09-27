"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

export default function StudentsListPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
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

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(
          "id, name, father_name, phone, whatsapp, status, monthly_fee, program_id, batch_id, programs(name), batches(name)"
        )
        .eq("organization_id", orgMember.organization_id)
        .order("name");

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;

    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      s.name?.toLowerCase().includes(term) ||
      s.father_name?.toLowerCase().includes(term) ||
      s.phone?.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Students</h1>
        <Link
          href="/dashboard/students/add"
          style={{
            background: "#16a34a",
            color: "white",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Add Student
        </Link>
      </div>

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

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, father name, or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <p>Loading students...</p>
      ) : filteredStudents.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No students found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {s.father_name ? `S/O ${s.father_name}` : ""}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {s.programs?.name || "No Program"} · {s.batches?.name || "No Batch"}
                </div>
                {s.phone && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{s.phone}</div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: s.status === "active" ? "#dcfce7" : "#f3f4f6",
                    color: s.status === "active" ? "#166534" : "#6b7280",
                  }}
                >
                  {s.status}
                </span>

                {s.whatsapp && (
                  <a
                    href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: "#16a34a", textDecoration: "none" }}
                  >
                    WhatsApp
                  </a>
                )}

                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}
                  >
                    Call
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
