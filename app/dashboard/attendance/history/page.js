"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";
import { useRole } from "../../../utils/role-context";

function todayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

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

export default function AttendanceReportPage() {
  const { orgId } = useRole();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [students, setStudents] = useState([]);

  const [viewMode, setViewMode] = useState("day");

  const [selectedDate, setSelectedDate] =
    useState(todayDateString());

  const [dayRecords, setDayRecords] = useState([]);

  const [startDate, setStartDate] =
    useState(firstDayOfMonth());

  const [endDate, setEndDate] =
    useState(todayDateString());

  const [summary, setSummary] = useState([]);

  useEffect(() => {
    if (!orgId) return;

    loadInitialData();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || students.length === 0) return;

    if (viewMode === "day") {
      loadDayRecords();
    } else {
      loadSummary();
    }
  }, [
    orgId,
    viewMode,
    selectedDate,
    startDate,
    endDate,
    students,
  ]);

  async function loadInitialData() {
    setLoading(true);
    setErrorMsg("");

    try {
      if (!orgId) {
        throw new Error(
          "No active organization found."
        );
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from("students")
          .select("id, name")
          .eq("organization_id", orgId)
          .order("name");

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDayRecords() {
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "student_id, status, notes"
        )
        .eq("organization_id", orgId)
        .eq("attendance_date", selectedDate);

      if (error) throw error;

      const merged = students.map((s) => {
        const record = (data || []).find(
          (a) => a.student_id === s.id
        );

        return {
          student_id: s.id,
          name: s.name,
          status: record?.status || null,
          notes: record?.notes || "",
        };
      });

      setDayRecords(merged);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message ||
          "Failed to load attendance for this date."
      );
    }
  }

  async function loadSummary() {
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "student_id, status, notes"
        )
        .eq("organization_id", orgId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      if (error) throw error;

      const stats = students.map((s) => {
        const records = (data || []).filter(
          (a) => a.student_id === s.id
        );

        const present = records.filter(
          (r) => r.status === "present"
        ).length;

        const absent = records.filter(
          (r) => r.status === "absent"
        ).length;

        const leave = records.filter(
          (r) => r.status === "leave"
        ).length;

        const late = records.filter(
          (r) => r.status === "late"
        ).length;

        const total = records.length;

        const percentage =
          total > 0
            ? Math.round(
                ((present + late) / total) * 100
              )
            : null;

        return {
          id: s.id,
          name: s.name,
          present,
          absent,
          leave,
          late,
          total,
          percentage,
        };
      });

      setSummary(stats);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message ||
          "Failed to load summary."
      );
    }
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Attendance Report
      </h1>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setViewMode("day")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background:
              viewMode === "day"
                ? "#111827"
                : "white",
            color:
              viewMode === "day"
                ? "white"
                : "#374151",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          By Date
        </button>

        <button
          onClick={() => setViewMode("range")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background:
              viewMode === "range"
                ? "#111827"
                : "white",
            color:
              viewMode === "range"
                ? "white"
                : "#374151",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Summary / %
        </button>
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

      {loading ? (
        <p>Loading...</p>
      ) : viewMode === "day" ? (
        <>
          <label>
            <div
              style={{
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Select Date
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                setSelectedDate(e.target.value)
              }
              style={inputStyle}
            />
          </label>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {dayRecords.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                No students found.
              </p>
            ) : (
              dayRecords.map((r) => (
                <div
                  key={r.student_id}
                  style={{
                    background: "white",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {r.name}
                    </span>

                    {r.status ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 999,
                          background:
                            STATUS_COLORS[
                              r.status
                            ] + "22",
                          color:
                            STATUS_COLORS[
                              r.status
                            ],
                        }}
                      >
                        {
                          STATUS_LABELS[
                            r.status
                          ]
                        }
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        Not marked
                      </span>
                    )}
                  </div>

                  {r.notes && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 9,
                        borderRadius: 7,
                        background: "#f9fafb",
                        color: "#4b5563",
                        fontSize: 13,
                        direction: "rtl",
                        textAlign: "right",
                      }}
                    >
                      {r.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <label style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                From
              </div>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                style={inputStyle}
              />
            </label>

            <label style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                To
              </div>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                style={inputStyle}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {summary.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                No students found.
              </p>
            ) : (
              summary.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "white",
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                      }}
                    >
                      {s.name}
                    </span>

                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color:
                          s.percentage === null
                            ? "#9ca3af"
                            : s.percentage >= 75
                            ? "#16a34a"
                            : "#dc2626",
                      }}
                    >
                      {s.percentage === null
                        ? "No data"
                        : `${s.percentage}%`}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 12,
                      color: "#6b7280",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      Present: {s.present}
                    </span>

                    <span>
                      Absent: {s.absent}
                    </span>

                    <span>
                      Leave: {s.leave}
                    </span>

                    <span>
                      Late: {s.late}
                    </span>

                    <span>
                      Total: {s.total}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
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
