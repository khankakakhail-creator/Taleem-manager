"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

function todayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "#16a34a" },
  { value: "absent", label: "Absent", color: "#dc2626" },
  { value: "leave", label: "Leave", color: "#d97706" },
  { value: "late", label: "Late", color: "#2563eb" },
];

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});

  const [selectedDate, setSelectedDate] = useState(todayDateString());

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (orgId) {
      loadAttendanceForDate(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, orgId]);

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
        .select("id, name, father_name")
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

  async function loadAttendanceForDate(date) {
    setErrorMsg("");

    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("student_id, status, notes")
        .eq("organization_id", orgId)
        .eq("attendance_date", date);

      if (attendanceError) throw attendanceError;

      const map = {};
      (attendanceData || []).forEach((a) => {
        map[a.student_id] = a.status;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load attendance.");
    }
  }

  function setStatus(studentId, status) {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const rows = Object.entries(attendanceMap)
        .filter(([, status]) => status)
        .map(([studentId, status]) => ({
          organization_id: orgId,
          student_id: studentId,
          attendance_date: selectedDate,
          status,
          marked_by_user_id: userId,
        }));

      if (rows.length === 0) {
        setErrorMsg("Please mark attendance for at least one student.");
        setSaving(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "student_id,attendance_date" });

      if (upsertError) throw upsertError;

      setSuccessMsg("Attendance saved successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  const markedCount = Object.values(attendanceMap).filter(Boolean).length;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Attendance</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Date</div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 16,
            }}
          />
        </label>
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
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No active students found.</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            {markedCount} of {students.length} marked
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {students.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                  {s.name}
                  {s.father_name ? (
                    <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 13 }}>
                      {" "}
                      · S/O {s.father_name}
                    </span>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = attendanceMap[s.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(s.id, opt.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? opt.color : "#d1d5db"}`,
                          background: isSelected ? opt.color : "white",
                          color: isSelected ? "white" : "#374151",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </>
      )}
    </div>
  );
}
