"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRole } from "../../utils/role-context";

function todayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const STATUS_OPTIONS = [
  {
    value: "present",
    label: "Present",
    color: "#16a34a",
  },
  {
    value: "absent",
    label: "Absent",
    color: "#dc2626",
  },
  {
    value: "leave",
    label: "Leave",
    color: "#d97706",
  },
  {
    value: "late",
    label: "Late",
    color: "#2563eb",
  },
];

const REASON_OPTIONS = [
  { value: "بیماری", label: "بیماری" },
  { value: "سفر", label: "سفر" },
  { value: "گھر کا کام", label: "گھر کا کام" },
  { value: "خوشی/غم", label: "خوشی/غم" },
  { value: "موسم", label: "موسم" },
  { value: "بغیر اطلاع", label: "بغیر اطلاع" },
  { value: "ذاتی کام", label: "ذاتی کام" },
  { value: "custom", label: "Custom" },
];

const LATE_OPTIONS = [
  { value: "5 منٹ", label: "5 منٹ" },
  { value: "10 منٹ", label: "10 منٹ" },
  { value: "15 منٹ", label: "15 منٹ" },
  { value: "30 منٹ", label: "30 منٹ" },
  { value: "1 گھنٹہ", label: "1 گھنٹہ" },
  { value: "2 گھنٹے", label: "2 گھنٹے" },
  { value: "custom", label: "Custom" },
];

export default function AttendancePage() {
  const { orgId, userId } = useRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [students, setStudents] = useState([]);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [notesMap, setNotesMap] = useState({});

  const [reasonMap, setReasonMap] = useState({});
  const [customReasonMap, setCustomReasonMap] = useState({});

  const [lateMap, setLateMap] = useState({});
  const [customLateMap, setCustomLateMap] = useState({});

  const [selectedDate, setSelectedDate] = useState(
    todayDateString()
  );

  useEffect(() => {
    if (!orgId || !userId) return;

    loadInitialData();
  }, [orgId, userId]);

  useEffect(() => {
    if (!orgId) return;

    loadAttendanceForDate(selectedDate);
  }, [selectedDate, orgId]);

  async function loadInitialData() {
    setLoading(true);
    setErrorMsg("");

    try {
      if (!orgId || !userId) {
        throw new Error("No active organization found.");
      }

      const { data, error } = await supabase
        .from("students")
        .select("id, name, father_name")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      setStudents(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceForDate(date) {
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, status, notes")
        .eq("organization_id", orgId)
        .eq("attendance_date", date);

      if (error) throw error;

      const statusMap = {};
      const noteMap = {};
      const reasons = {};
      const customReasons = {};
      const lates = {};
      const customLates = {};

      (data || []).forEach((record) => {
        const studentId = record.student_id;
        const note = record.notes || "";

        statusMap[studentId] = record.status;
        noteMap[studentId] = "";

        if (
          record.status === "absent" ||
          record.status === "leave"
        ) {
          if (note.startsWith("Reason: ")) {
            const reasonText = note
              .replace("Reason: ", "")
              .split(" | Note: ")[0];

            const knownReason = REASON_OPTIONS.some(
              (option) =>
                option.value === reasonText &&
                option.value !== "custom"
            );

            if (knownReason) {
              reasons[studentId] = reasonText;
            } else {
              reasons[studentId] = "custom";
              customReasons[studentId] = reasonText;
            }

            const extraNote = note.includes(" | Note: ")
              ? note.split(" | Note: ")[1]
              : "";

            noteMap[studentId] = extraNote;
          }
        }

        if (record.status === "late") {
          if (note.startsWith("Late: ")) {
            const lateText = note
              .replace("Late: ", "")
              .split(" | Note: ")[0];

            const knownLate = LATE_OPTIONS.some(
              (option) =>
                option.value === lateText &&
                option.value !== "custom"
            );

            if (knownLate) {
              lates[studentId] = lateText;
            } else {
              lates[studentId] = "custom";
              customLates[studentId] = lateText;
            }

            const extraNote = note.includes(" | Note: ")
              ? note.split(" | Note: ")[1]
              : "";

            noteMap[studentId] = extraNote;
          }
        }

        if (record.status === "present") {
          noteMap[studentId] = note;
        }
      });

      setAttendanceMap(statusMap);
      setNotesMap(noteMap);
      setReasonMap(reasons);
      setCustomReasonMap(customReasons);
      setLateMap(lates);
      setCustomLateMap(customLates);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to load attendance."
      );
    }
  }

  function setStatus(studentId, status) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    if (status !== "absent" && status !== "leave") {
      setReasonMap((prev) => ({
        ...prev,
        [studentId]: "",
      }));
    }

    if (status !== "late") {
      setLateMap((prev) => ({
        ...prev,
        [studentId]: "",
      }));
    }
  }

  function setNote(studentId, note) {
    setNotesMap((prev) => ({
      ...prev,
      [studentId]: note,
    }));
  }

  function buildNote(studentId, status) {
    const extraNote =
      notesMap[studentId]?.trim() || "";

    if (
      status === "absent" ||
      status === "leave"
    ) {
      const selectedReason =
        reasonMap[studentId];

      if (!selectedReason) {
        return "";
      }

      const reasonText =
        selectedReason === "custom"
          ? customReasonMap[studentId]?.trim()
          : selectedReason;

      if (!reasonText) {
        return "";
      }

      return `Reason: ${reasonText}${
        extraNote
          ? ` | Note: ${extraNote}`
          : ""
      }`;
    }

    if (status === "late") {
      const selectedLate =
        lateMap[studentId];

      if (!selectedLate) {
        return "";
      }

      const lateText =
        selectedLate === "custom"
          ? customLateMap[studentId]?.trim()
          : selectedLate;

      if (!lateText) {
        return "";
      }

      return `Late: ${lateText}${
        extraNote
          ? ` | Note: ${extraNote}`
          : ""
      }`;
    }

    return extraNote;
  }

  async function handleSaveAll() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!orgId || !userId) {
        throw new Error(
          "No active organization found."
        );
      }

      const rows = Object.entries(attendanceMap)
        .filter(([, status]) => status)
        .map(([studentId, status]) => ({
          organization_id: orgId,
          student_id: studentId,
          attendance_date: selectedDate,
          status,
          notes:
            buildNote(studentId, status) ||
            null,
          marked_by_user_id: userId,
        }));

      if (rows.length === 0) {
        setErrorMsg(
          "Please mark attendance for at least one student."
        );
        return;
      }

      for (const row of rows) {
        if (
          (row.status === "absent" ||
            row.status === "leave") &&
          !row.notes?.startsWith("Reason:")
        ) {
          setErrorMsg(
            "Please select a reason for every Absent/Leave student."
          );
          return;
        }

        if (
          row.status === "late" &&
          !row.notes?.startsWith("Late:")
        ) {
          setErrorMsg(
            "Please select the late duration for every Late student."
          );
          return;
        }
      }

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict:
            "student_id,attendance_date",
        });

      if (error) throw error;

      setSuccessMsg(
        "Attendance saved successfully!"
      );

      await loadAttendanceForDate(
        selectedDate
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message ||
          "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  const markedCount =
    Object.values(attendanceMap).filter(Boolean)
      .length;

  return (
    <div
      style={{
        maxWidth: 600,
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
        Attendance
      </h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          <div
            style={{
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            Date
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border:
                "1px solid #d1d5db",
              fontSize: 16,
            }}
          />
        </label>
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

      {successMsg && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {successMsg}
        </div>
      )}

      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p
          style={{
            color: "#6b7280",
          }}
        >
          No active students found.
        </p>
      ) : (
        <>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            {markedCount} of{" "}
            {students.length} marked
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {students.map((student) => {
              const status =
                attendanceMap[
                  student.id
                ];

              return (
                <div
                  key={student.id}
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
                      fontWeight: 600,
                      fontSize: 15,
                      marginBottom: 8,
                    }}
                  >
                    {student.name}

                    {student.father_name && (
                      <span
                        style={{
                          fontWeight: 400,
                          color: "#6b7280",
                          fontSize: 13,
                        }}
                      >
                        {" "}
                        · S/O{" "}
                        {student.father_name}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {STATUS_OPTIONS.map(
                      (option) => {
                        const selected =
                          status ===
                          option.value;

                        return (
                          <button
                            key={
                              option.value
                            }
                            type="button"
                            onClick={() =>
                              setStatus(
                                student.id,
                                option.value
                              )
                            }
                            style={{
                              padding:
                                "8px 12px",
                              borderRadius: 8,
                              border: `1px solid ${
                                selected
                                  ? option.color
                                  : "#d1d5db"
                              }`,
                              background:
                                selected
                                  ? option.color
                                  : "white",
                              color:
                                selected
                                  ? "white"
                                  : "#374151",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {
                              option.label
                            }
                          </button>
                        );
                      }
                    )}
                  </div>

                  {(status ===
                    "absent" ||
                    status ===
                      "leave") && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background:
                          "#f9fafb",
                        borderRadius: 8,
                        direction:
                          "rtl",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        وجہ منتخب کریں
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        {REASON_OPTIONS.map(
                          (option) => {
                            const selected =
                              reasonMap[
                                student.id
                              ] ===
                              option.value;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                onClick={() =>
                                  setReasonMap(
                                    (prev) => ({
                                      ...prev,
                                      [student.id]:
                                        option.value,
                                    })
                                  )
                                }
                                style={{
                                  padding:
                                    "7px 10px",
                                  borderRadius:
                                    7,
                                  border: `1px solid ${
                                    selected
                                      ? "#2563eb"
                                      : "#d1d5db"
                                  }`,
                                  background:
                                    selected
                                      ? "#2563eb"
                                      : "white",
                                  color:
                                    selected
                                      ? "white"
                                      : "#374151",
                                  fontSize: 12,
                                }}
                              >
                                {
                                  option.label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>

                      {reasonMap[
                        student.id
                      ] === "custom" && (
                        <input
                          type="text"
                          placeholder="اپنی وجہ لکھیں"
                          value={
                            customReasonMap[
                              student.id
                            ] || ""
                          }
                          onChange={(e) =>
                            setCustomReasonMap(
                              (prev) => ({
                                ...prev,
                                [student.id]:
                                  e.target
                                    .value,
                              })
                            )
                          }
                          style={{
                            width: "100%",
                            marginTop: 8,
                            padding: 9,
                            borderRadius: 7,
                            border:
                              "1px solid #d1d5db",
                            fontSize: 13,
                            direction:
                              "rtl",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {status === "late" && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background:
                          "#f9fafb",
                        borderRadius: 8,
                        direction:
                          "rtl",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        کتنی دیر سے آیا؟
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap
