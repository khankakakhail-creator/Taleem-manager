"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../utils/supabase";
import { useRole } from "../../../utils/role-context";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonth() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
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

const STANDARD_REASONS = [
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
];

export default function AttendanceHistoryPage() {
  const { orgId } = useRole();

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [students, setStudents] = useState([]);

  const [viewMode, setViewMode] = useState("day");

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [dayRecords, setDayRecords] = useState([]);

  const [startDate, setStartDate] = useState(
    getFirstDayOfMonth()
  );
  const [endDate, setEndDate] = useState(getToday());

  const [summary, setSummary] = useState([]);

  const [overview, setOverview] = useState({
    totalStudents: 0,
    markedStudents: 0,
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    percentage: null,
  });

  const [reasonBreakdown, setReasonBreakdown] = useState([]);
  const [customReasons, setCustomReasons] = useState([]);
  const [lateBreakdown, setLateBreakdown] = useState([]);

  useEffect(() => {
    if (!orgId) return;

    loadStudents();
  }, [orgId]);

  useEffect(() => {
    if (!orgId || students.length === 0) return;

    if (viewMode === "day") {
      loadDayRecords();
    } else {
      loadOverview();
    }
  }, [
    orgId,
    students,
    viewMode,
    selectedDate,
    startDate,
    endDate,
  ]);

  async function loadStudents() {
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");

      if (error) throw error;

      setStudents(data || []);
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error.message || "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDayRecords() {
    setReportLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "student_id, status, notes, attendance_date"
        )
        .eq("organization_id", orgId)
        .eq("attendance_date", selectedDate);

      if (error) throw error;

      const records = data || [];

      const merged = students.map((student) => {
        const record = records.find(
          (item) => item.student_id === student.id
        );

        return {
          student_id: student.id,
          name: student.name,
          status: record?.status || null,
          notes: record?.notes || "",
        };
      });

      setDayRecords(merged);
    } catch (error) {
      console.error(error);
      setErrorMsg(
        error.message ||
          "Failed to load attendance for this date."
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function loadOverview() {
    setReportLoading(true);
    setErrorMsg("");

    if (startDate > endDate) {
      setSummary([]);

      setOverview({
        totalStudents: students.length,
        markedStudents: 0,
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        percentage: null,
      });

      setReasonBreakdown([]);
      setCustomReasons([]);
      setLateBreakdown([]);

      setErrorMsg(
        "From date cannot be after To date."
      );

      setReportLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "student_id, status, notes, attendance_date"
        )
        .eq("organization_id", orgId)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      if (error) throw error;

      const rows = data || [];

      /*
       * ------------------------------------------------
       * STUDENT-BY-STUDENT STATISTICS
       * ------------------------------------------------
       */

      const studentStats = students.map((student) => {
        const records = rows.filter(
          (record) =>
            record.student_id === student.id
        );

        const present = records.filter(
          (record) => record.status === "present"
        ).length;

        const absent = records.filter(
          (record) => record.status === "absent"
        ).length;

        const leave = records.filter(
          (record) => record.status === "leave"
        ).length;

        const late = records.filter(
          (record) => record.status === "late"
        ).length;

        const total = records.length;

        /*
         * Late is counted as attendance.
         * Formula:
         * Present + Late / Total Marked
         */

        const percentage =
          total > 0
            ? Math.round(
                ((present + late) / total) * 100
              )
            : null;

        return {
          id: student.id,
          name: student.name,
          present,
          absent,
          leave,
          late,
          total,
          percentage,
        };
      });

      /*
       * ------------------------------------------------
       * OVERALL STATISTICS
       * ------------------------------------------------
       */

      const present = rows.filter(
        (row) => row.status === "present"
      ).length;

      const absent = rows.filter(
        (row) => row.status === "absent"
      ).length;

      const leave = rows.filter(
        (row) => row.status === "leave"
      ).length;

      const late = rows.filter(
        (row) => row.status === "late"
      ).length;

      const totalMarked =
        present + absent + leave + late;

      const markedStudentIds = new Set(
        rows.map((row) => row.student_id)
      );

      const overallPercentage =
        totalMarked > 0
          ? Math.round(
              ((present + late) / totalMarked) * 100
            )
          : null;

      /*
       * ------------------------------------------------
       * REASON BREAKDOWN
       * ------------------------------------------------
       */

      const standardReasonCounts = {};
      const customReasonCounts = {};
      const lateCounts = {};

      rows.forEach((row) => {
        const notes = (row.notes || "").trim();

        /*
         * Absent / Leave reasons
         */
        if (
          (row.status === "absent" ||
            row.status === "leave") &&
          notes
        ) {
          let reason = "";

          if (notes.startsWith("Reason: ")) {
            reason = notes
              .replace("Reason: ", "")
              .trim();
          } else {
            /*
             * Compatibility with older records.
             * If the old format contains Reason:
             * somewhere inside the note, try to read it.
             */
            const reasonIndex =
              notes.indexOf("Reason:");

            if (reasonIndex !== -1) {
              reason = notes
                .slice(reasonIndex + 7)
                .split("|")[0]
                .trim();
            }
          }

          if (reason) {
            if (
              STANDARD_REASONS.includes(reason)
            ) {
              standardReasonCounts[reason] =
                (standardReasonCounts[reason] || 0) +
                1;
            } else {
              customReasonCounts[reason] =
                (customReasonCounts[reason] || 0) +
                1;
            }
          }
        }

        /*
         * Late duration breakdown
         */
        if (row.status === "late" && notes) {
          let duration = "";

          if (notes.startsWith("Late: ")) {
            duration = notes
              .replace("Late: ", "")
              .trim();
          } else {
            const lateIndex =
              notes.indexOf("Late:");

            if (lateIndex !== -1) {
              duration = notes
                .slice(lateIndex + 5)
                .split("|")[0]
                .trim();
            }
          }

          if (duration) {
            lateCounts[duration] =
              (lateCounts[duration] || 0) + 1;
          }
        }
      });

      /*
       * Convert objects to arrays
       */
      const standardReasons = Object.entries(
        standardReasonCounts
      )
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const customReasonsList = Object.entries(
        customReasonCounts
      )
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const lateList = Object.entries(
        lateCounts
      )
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      setSummary(studentStats);

      setOverview({
        totalStudents: students.length,
        markedStudents: markedStudentIds.size,
        present,
        absent,
        leave,
        late,
        percentage: overallPercentage,
      });

      setReasonBreakdown(standardReasons);
      setCustomReasons(customReasonsList);
      setLateBreakdown(lateList);
    } catch (error) {
      console.error(error);

      setErrorMsg(
        error.message ||
          "Failed to load attendance overview."
      );
    } finally {
      setReportLoading(false);
    }
  }

  const dayStats = useMemo(() => {
    const marked = dayRecords.filter(
      (record) => record.status
    ).length;

    const notMarked =
      dayRecords.length - marked;

    const present = dayRecords.filter(
      (record) => record.status === "present"
    ).length;

    const absent = dayRecords.filter(
      (record) => record.status === "absent"
    ).length;

    const leave = dayRecords.filter(
      (record) => record.status === "leave"
    ).length;

    const late = dayRecords.filter(
      (record) => record.status === "late"
    ).length;

    return {
      marked,
      notMarked,
      present,
      absent,
      leave,
      late,
    };
  }, [dayRecords]);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        paddingBottom: 40,
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        Attendance Report
      </h1>

      <p
        style={{
          marginTop: 0,
          marginBottom: 16,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Review daily attendance and attendance
        overview.
      </p>

      {/* VIEW TABS */}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("day")}
          style={tabStyle(viewMode === "day")}
        >
          By Date
        </button>

        <button
          type="button"
          onClick={() =>
            setViewMode("overview")
          }
          style={tabStyle(
            viewMode === "overview"
          )}
        >
          Attendance Overview
        </button>
      </div>

      {/* ERROR */}

      {errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 9,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={loadingStyle}>
          Loading attendance...
        </div>
      ) : viewMode === "day" ? (
        <>
          {/* DAILY DATE */}

          <label>
            <div style={labelStyle}>
              Select Date
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
              style={inputStyle}
            />
          </label>

          {reportLoading ? (
            <div style={loadingStyle}>
              Loading attendance...
            </div>
          ) : (
            <>
              {/* DAILY SUMMARY */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <SummaryCard
                  label="Present"
                  value={dayStats.present}
                  accent="#16a34a"
                />

                <SummaryCard
                  label="Absent"
                  value={dayStats.absent}
                  accent="#dc2626"
                />

                <SummaryCard
                  label="Leave"
                  value={dayStats.leave}
                  accent="#d97706"
                />

                <SummaryCard
                  label="Late"
                  value={dayStats.late}
                  accent="#2563eb"
                />

                <SummaryCard
                  label="Marked"
                  value={dayStats.marked}
                />

                <SummaryCard
                  label="Not Marked"
                  value={dayStats.notMarked}
                />
              </div>

              {/* DAILY STUDENT LIST */}

              <h2 style={sectionTitleStyle}>
                Daily Attendance
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {dayRecords.length === 0 ? (
                  <div style={emptyBoxStyle}>
                    No students found.
                  </div>
                ) : (
                  dayRecords.map((record) => (
                    <div
                      key={record.student_id}
                      style={cardStyle}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                          }}
                        >
                          {record.name}
                        </span>

                        {record.status ? (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding:
                                "5px 10px",
                              borderRadius: 999,
                              background:
                                STATUS_COLORS[
                                  record.status
                                ] + "18",
                              color:
                                STATUS_COLORS[
                                  record.status
                                ],
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              STATUS_LABELS[
                                record.status
                              ]
                            }
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#9ca3af",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            Not marked
                          </span>
                        )}
                      </div>

                      {record.notes && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 9,
                            borderRadius: 7,
                            background: "#f9fafb",
                            color: "#4b5563",
                            fontSize: 13,
                          }}
                        >
                          {record.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* DATE RANGE */}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <label style={{ flex: 1 }}>
              <div style={labelStyle}>
                From
              </div>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </label>

            <label style={{ flex: 1 }}>
              <div style={labelStyle}>
                To
              </div>

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </label>
          </div>

          {reportLoading ? (
            <div style={loadingStyle}>
              Loading attendance overview...
            </div>
          ) : (
            <>
              {/* OVERVIEW CARDS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <OverviewCard
                  label="Total Students"
                  value={
                    overview.totalStudents
                  }
                />

                <OverviewCard
                  label="Students Marked"
                  value={
                    overview.markedStudents
                  }
                />

                <OverviewCard
                  label="Present"
                  value={overview.present}
                  accent="#16a34a"
                />

                <OverviewCard
                  label="Absent"
                  value={overview.absent}
                  accent="#dc2626"
                />

                <OverviewCard
                  label="Leave"
                  value={overview.leave}
                  accent="#d97706"
                />

                  <OverviewCard
                  label="Late"
                  value={overview.late}
                  accent="#2563eb"
                />
              </div>

              {/* OVERALL PERCENTAGE */}

              <div
                style={{
                  marginTop: 8,
                  padding: 18,
                  borderRadius: 11,
                  border:
                    "1px solid #e5e7eb",
                  background: "#ffffff",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  Overall Attendance
                </div>

                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    marginTop: 3,
                  }}
                >
                  {overview.percentage ===
                  null
                    ? "No data"
                    : `${overview.percentage}%`}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 3,
                  }}
                >
                  Present + Late ÷ Total
                  Marked
                </div>
              </div>

              {/* STUDENT ATTENDANCE */}

              <h2 style={sectionTitleStyle}>
                Student Attendance
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {summary.length === 0 ? (
                  <div style={emptyBoxStyle}>
                    No attendance records found
                    for this period.
                  </div>
                ) : (
                  summary.map((student) => (
                    <div
                      key={student.id}
                      style={cardStyle}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                          }}
                        >
                          {student.name}
                        </span>

                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                          }}
                        >
                          {student.percentage ===
                          null
                            ? "No data"
                            : `${student.percentage}%`}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: 6,
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        <span>
                          Present:{" "}
                          {student.present}
                        </span>

                        <span>
                          Absent:{" "}
                          {student.absent}
                        </span>

                        <span>
                          Leave:{" "}
                          {student.leave}
                        </span>

                        <span>
                          Late:{" "}
                          {student.late}
                        </span>

                        <span>
                          Total:{" "}
                          {student.total}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* REASON BREAKDOWN */}

              <h2 style={sectionTitleStyle}>
                Reason Breakdown
              </h2>

              {reasonBreakdown.length ===
                0 &&
              customReasons.length === 0 ? (
                <div style={emptyBoxStyle}>
                  No absence or leave reasons
                  recorded in this period.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  {reasonBreakdown.map(
                    (item) => (
                      <BreakdownRow
                        key={item.name}
                        label={item.name}
                        count={item.count}
                      />
                    )
                  )}

                  {customReasons.map(
                    (item) => (
                      <BreakdownRow
                        key={`custom-${item.name}`}
                        label={`${item.name} (Custom)`}
                        count={item.count}
                      />
                    )
                  )}
                </div>
              )}

              {/* LATE BREAKDOWN */}

              <h2 style={sectionTitleStyle}>
                Late Breakdown
              </h2>

              {lateBreakdown.length ===
              0 ? (
                <div style={emptyBoxStyle}>
                  No late records in this
                  period.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  {lateBreakdown.map(
                    (item) => (
                      <BreakdownRow
                        key={item.name}
                        label={item.name}
                        count={item.count}
                      />
                    )
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

/* -------------------------------------------------
   SMALL COMPONENTS
------------------------------------------------- */

function SummaryCard({
  label,
  value,
  accent,
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 10,
        border:
          "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 23,
          fontWeight: 800,
          color: accent || "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  accent,
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 10,
        border:
          "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 23,
          fontWeight: 800,
          color: accent || "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        border:
          "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff",
      }}
    >
      <span
        style={{
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <span
        style={{
          minWidth: 28,
          textAlign: "center",
          padding: "3px 7px",
          borderRadius: 999,
          background: "#f3f4f6",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </div>
  );
}

/* -------------------------------------------------
   STYLES
------------------------------------------------- */

function tabStyle(active) {
  return {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border:
      "1px solid #d1d5db",
    background: active
      ? "#111827"
      : "#ffffff",
    color: active
      ? "#ffffff"
      : "#374151",
    fontWeight: 600,
    fontSize: 13,
  };
}

const cardStyle = {
  background: "#ffffff",
  border:
    "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
};

const emptyBoxStyle = {
  padding: 13,
  borderRadius: 9,
  border:
    "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#6b7280",
  fontSize: 13,
};

const loadingStyle = {
  padding: 20,
  textAlign: "center",
  color: "#6b7280",
  fontSize: 14,
};

const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 6,
};

const sectionTitleStyle = {
  fontSize: 17,
  fontWeight: 700,
  marginTop: 20,
  marginBottom: 9,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  borderRadius: 8,
  border:
    "1px solid #d1d5db",
  fontSize: 16,
  background: "#ffffff",
};
