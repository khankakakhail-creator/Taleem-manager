"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRole } from "../../utils/role-context";

const STATUS = [
  ["present", "Present"],
  ["absent", "Absent"],
  ["leave", "Leave"],
  ["late", "Late"],
];

const REASONS = [
  "Illness",
  "Medical Appointment",
  "Travel",
  "Family Work",
  "Personal Work",
  "Family Event",
  "Bereavement",
  "Emergency",
  "Weather",
  "No Notice",
  "Other / Custom",
];

const LATE_TIMES = [
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "2 hours",
  "Custom",
];

function today() {
  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export default function AttendancePage() {
  const { orgId, userId } = useRole();

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(today());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    loadStudents();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !date) return;
    loadAttendance();
  }, [orgId, date]);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select("id, name, father_name")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("name");

    if (error) {
      setError(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  async function loadAttendance() {
    setError("");

    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status, notes")
      .eq("organization_id", orgId)
      .eq("attendance_date", date);

    if (error) {
      setError(error.message);
      return;
    }

    const next = {};

    (data || []).forEach((row) => {
      const item = {
        status: row.status,
        reason: "",
        customReason: "",
        late: "",
        customLate: "",
      };

      const text = row.notes || "";

      if (row.status === "absent" || row.status === "leave") {
        if (text.startsWith("Reason: ")) {
          const reason = text.replace("Reason: ", "").trim();

          if (REASONS.includes(reason)) {
            item.reason = reason;
          } else {
            item.reason = "Other / Custom";
            item.customReason = reason;
          }
        }
      }

      if (row.status === "late") {
        if (text.startsWith("Late: ")) {
          const late = text.replace("Late: ", "").trim();

          if (LATE_TIMES.includes(late)) {
            item.late = late;
          } else {
            item.late = "Custom";
            item.customLate = late;
          }
        }
      }

      next[row.student_id] = item;
    });

    setRecords(next);
  }

  function updateRecord(studentId, field, value) {
    setRecords((old) => ({
      ...old,
      [studentId]: {
        ...(old[studentId] || {}),
        [field]: value,
      },
    }));
  }

  function changeStatus(studentId, status) {
    setRecords((old) => ({
      ...old,
      [studentId]: {
        ...(old[studentId] || {}),
        status,

        reason:
          status === "absent" || status === "leave"
            ? old[studentId]?.reason || ""
            : "",

        customReason:
          status === "absent" || status === "leave"
            ? old[studentId]?.customReason || ""
            : "",

        late:
          status === "late"
            ? old[studentId]?.late || ""
            : "",

        customLate:
          status === "late"
            ? old[studentId]?.customLate || ""
            : "",
      },
    }));

    setMessage("");
    setError("");
  }

  function markAllPresent() {
    setRecords((old) => {
      const next = { ...old };

      students.forEach((student) => {
        next[student.id] = {
          status: "present",
          reason: "",
          customReason: "",
          late: "",
          customLate: "",
        };
      });

      return next;
    });

    setMessage(
      "All students marked as Present. Review exceptions, then save."
    );
    setError("");
  }

  function buildNote(item) {
    if (!item) return null;

    if (item.status === "absent" || item.status === "leave") {
      const reason =
        item.reason === "Other / Custom"
          ? (item.customReason || "").trim()
          : item.reason;

      if (!reason) return null;

      return "Reason: " + reason;
    }

    if (item.status === "late") {
      const late =
        item.late === "Custom"
          ? (item.customLate || "").trim()
          : item.late;

      if (!late) return null;

      return "Late: " + late;
    }

    return null;
  }

  async function saveAttendance() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!orgId || !userId) {
        throw new Error("Organization or user not found.");
      }

      const rows = [];

      for (const student of students) {
        const item = records[student.id];

        if (!item || !item.status) {
          continue;
        }

        const note = buildNote(item);

        if (
          (item.status === "absent" ||
            item.status === "leave") &&
          !note
        ) {
          throw new Error(
            `${student.name}: reason is required.`
          );
        }

        if (item.status === "late" && !note) {
          throw new Error(
            `${student.name}: late duration is required.`
          );
        }

        rows.push({
          organization_id: orgId,
          student_id: student.id,
          attendance_date: date,
          status: item.status,
          notes: note,
          marked_by_user_id: userId,
        });
      }

      if (rows.length === 0) {
        throw new Error(
          "Please mark at least one student."
        );
      }

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict: "student_id,attendance_date",
        });

      if (error) {
        throw error;
      }

      setMessage("Attendance saved successfully.");

      await loadAttendance();
    } catch (err) {
      setError(
        err.message || "Failed to save attendance."
      );
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Attendance</h1>
        <p>Loading students...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Attendance
      </h1>

      {/* Date + Mark All Present */}

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          Date
        </label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <button
          type="button"
          onClick={markAllPresent}
          disabled={students.length === 0}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 12,
            border: "1px solid #15803d",
            borderRadius: 8,
            background: "#f0fdf4",
            color: "#166534",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✓ Mark All Present
        </button>
      </div>

      {/* Error */}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Success */}

      {message && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {message}
        </div>
      )}

      {students.length === 0 ? (
        <p>No active students found.</p>
      ) : (
        <>
          {students.map((student) => {
            const item = records[student.id] || {};
            const status = item.status || "";

            return (
              <div
                key={student.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                {/* Student */}

                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  {student.name}
                </div>

                {student.father_name && (
                  <div
                    style={{
                      color: "#666",
                      fontSize: 13,
                      marginTop: 3,
                      marginBottom: 10,
                    }}
                  >
                    S/O {student.father_name}
                  </div>
                )}

                {/* Status */}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {STATUS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        changeStatus(
                          student.id,
                          value
                        )
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        background:
                          status === value
                            ? "#2563eb"
                            : "#fff",
                        color:
                          status === value
                            ? "#fff"
                            : "#333",
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Absent / Leave */}

                {(status === "absent" ||
                  status === "leave") && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#f7f7f7",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Reason
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() =>
                            updateRecord(
                              student.id,
                              "reason",
                              reason
                            )
                          }
                          style={{
                            padding: "7px 10px",
                            borderRadius: 7,
                            border: "1px solid #ccc",
                            background:
                              item.reason === reason
                                ? "#2563eb"
                                : "#fff",
                            color:
                              item.reason === reason
                                ? "#fff"
                                : "#333",
                          }}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {item.reason ===
                      "Other / Custom" && (
                      <input
                        type="text"
                        value={
                          item.customReason || ""
                        }
                        onChange={(e) =>
                          updateRecord(
                            student.id,
                            "customReason",
                            e.target.value
                          )
                        }
                        placeholder="Enter custom reason"
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: 9,
                          border: "1px solid #ccc",
                          borderRadius: 7,
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Late */}

                {status === "late" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#f7f7f7",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      Late Duration
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {LATE_TIMES.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() =>
                            updateRecord(
                              student.id,
                              "late",
                              time
                            )
                          }
                          style={{
                            padding: "7px 10px",
                            borderRadius: 7,
                            border: "1px solid #ccc",
                            background:
                              item.late === time
                                ? "#2563eb"
                                : "#fff",
                            color:
                              item.late === time
                                ? "#fff"
                                : "#333",
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>

                    {item.late === "Custom" && (
                      <input
                        type="text"
                        value={
                          item.customLate || ""
                        }
                        onChange={(e) =>
                          updateRecord(
                            student.id,
                            "customLate",
                            e.target.value
                          )
                        }
                        placeholder="Enter custom duration"
                        style={{
                          width: "100%",
                          marginTop: 8,
                          padding: 9,
                          border: "1px solid #ccc",
                          borderRadius: 7,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Save */}

          <button
            type="button"
            onClick={saveAttendance}
            disabled={saving}
            style={{
              width: "100%",
              padding: 14,
              border: 0,
              borderRadius: 10,
              background: saving
                ? "#86efac"
                : "#16a34a",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {saving
              ? "Saving..."
              : "Save Attendance"}
          </button>
        </>
      )}
    </main>
  );
}
