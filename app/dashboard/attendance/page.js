"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { useRole } from "../../utils/role-context";

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
  { value: "late", label: "Late" },
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

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [notes, setNotes] = useState({});
  const [reasons, setReasons] = useState({});
  const [customReasons, setCustomReasons] = useState({});
  const [lateTimes, setLateTimes] = useState({});
  const [customLateTimes, setCustomLateTimes] = useState({});

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!orgId || !userId) {
      return;
    }

    loadStudents();
  }, [orgId, userId]);

  useEffect(() => {
    if (!orgId) {
      return;
    }

    loadAttendance();
  }, [orgId, selectedDate]);

  async function loadStudents() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("students")
      .select("id, name, father_name")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setStudents([]);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  async function loadAttendance() {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status, notes")
      .eq("organization_id", orgId)
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      return;
    }

    const newAttendance = {};
    const newNotes = {};
    const newReasons = {};
    const newCustomReasons = {};
    const newLateTimes = {};
    const newCustomLateTimes = {};

    (data || []).forEach((record) => {
      const studentId = record.student_id;
      const note = record.notes || "";

      newAttendance[studentId] = record.status;
      newNotes[studentId] = "";

      if (
        record.status === "absent" ||
        record.status === "leave"
      ) {
        if (note.startsWith("Reason: ")) {
          const text = note
            .replace("Reason: ", "")
            .split(" | Note: ")[0];

          const isKnownReason = REASON_OPTIONS.some(
            (item) =>
              item.value === text &&
              item.value !== "custom"
          );

          if (isKnownReason) {
            newReasons[studentId] = text;
          } else {
            newReasons[studentId] = "custom";
            newCustomReasons[studentId] = text;
          }

          if (note.includes(" | Note: ")) {
            newNotes[studentId] =
              note.split(" | Note: ")[1];
          }
        }
      }

      if (record.status === "late") {
        if (note.startsWith("Late: ")) {
          const text = note
            .replace("Late: ", "")
            .split(" | Note: ")[0];

          const isKnownLate = LATE_OPTIONS.some(
            (item) =>
              item.value === text &&
              item.value !== "custom"
          );

          if (isKnownLate) {
            newLateTimes[studentId] = text;
          } else {
            newLateTimes[studentId] = "custom";
            newCustomLateTimes[studentId] = text;
          }

          if (note.includes(" | Note: ")) {
            newNotes[studentId] =
              note.split(" | Note: ")[1];
          }
        }
      }

      if (record.status === "present") {
        newNotes[studentId] = note;
      }
    });

    setAttendance(newAttendance);
    setNotes(newNotes);
    setReasons(newReasons);
    setCustomReasons(newCustomReasons);
    setLateTimes(newLateTimes);
    setCustomLateTimes(newCustomLateTimes);
  }

  function changeStatus(studentId, status) {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));

    if (status !== "absent" && status !== "leave") {
      setReasons((previous) => ({
        ...previous,
        [studentId]: "",
      }));

      setCustomReasons((previous) => ({
        ...previous,
        [studentId]: "",
      }));
    }

    if (status !== "late") {
      setLateTimes((previous) => ({
        ...previous,
        [studentId]: "",
      }));

      setCustomLateTimes((previous) => ({
        ...previous,
        [studentId]: "",
      }));
    }
  }

  function getNote(studentId, status) {
    const extraNote = (notes[studentId] || "").trim();

    if (status === "absent" || status === "leave") {
      const selectedReason = reasons[studentId];

      if (!selectedReason) {
        return null;
      }

      const reason =
        selectedReason === "custom"
          ? (customReasons[studentId] || "").trim()
          : selectedReason;

      if (!reason) {
        return null;
      }

      if (extraNote) {
        return `Reason: ${reason} | Note: ${extraNote}`;
      }

      return `Reason: ${reason}`;
    }

    if (status === "late") {
      const selectedLate = lateTimes[studentId];

      if (!selectedLate) {
        return null;
      }

      const lateTime =
        selectedLate === "custom"
          ? (customLateTimes[studentId] || "").trim()
          : selectedLate;

      if (!lateTime) {
        return null;
      }

      if (extraNote) {
        return `Late: ${lateTime} | Note: ${extraNote}`;
      }

      return `Late: ${lateTime}`;
    }

    return extraNote || null;
  }

  async function saveAttendance() {
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!orgId || !userId) {
        throw new Error("Organization not found.");
      }

      const selectedStudents = Object.entries(attendance);

      if (selectedStudents.length === 0) {
        throw new Error(
          "Please mark attendance for at least one student."
        );
      }

      const rows = [];

      for (const [studentId, status] of selectedStudents) {
        const note = getNote(studentId, status);

        if (
          (status === "absent" || status === "leave") &&
          !note
        ) {
          throw new Error(
            "Please select a reason for every Absent/Leave student."
          );
        }

        if (status === "late" && !note) {
          throw new Error(
            "Please select the late duration for every Late student."
          );
        }

        rows.push({
          organization_id: orgId,
          student_id: studentId,
          attendance_date: selectedDate,
          status: status,
          notes: note,
          marked_by_user_id: userId,
        });
      }

      const { error } = await supabase
        .from("attendance")
        .upsert(rows, {
          onConflict: "student_id,attendance_date",
        });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Attendance saved successfully."
      );

      await loadAttendance();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.message || "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  const markedCount = Object.values(attendance).filter(
    Boolean
  ).length;

  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "0 auto",
        padding: "16px",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "700",
          marginBottom: "16px",
        }}
      >
        Attendance
      </h1>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "16px",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "6px",
          }}
        >
          Date
        </label>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) =>
            setSelectedDate(event.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />
      </div>

      {errorMessage && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            direction: "rtl",
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            direction: "rtl",
          }}
        >
          {successMessage}
        </div>
      )}

      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No active students found.
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "10px",
            }}
          >
            {markedCount} of {students.length} marked
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {students.map((student) => {
              const status = attendance[student.id];

              return (
                <div
                  key={student.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      marginBottom: "4px",
                    }}
                  >
                    {student.name}
                  </div>

                  {student.father_name && (
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "10px",
                      }}
                    >
                      S/O {student.father_name}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    {STATUS_OPTIONS.map((option) => {
                      const selected =
                        status === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            changeStatus(
                              student.id,
                              option.value
                            )
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: selected
                              ? "1px solid #2563eb"
                              : "1px solid #d1d5db",
                            background: selected
                              ? "#2563eb"
                              : "#ffffff",
                            color: selected
                              ? "#ffffff"
                              : "#374151",
                            fontWeight: "600",
                            fontSize: "13px",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {(status === "absent" ||
                    status === "leave") && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        background: "#f9fafb",
                        borderRadius: "10px",
                        direction: "rtl",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "14px",
                          marginBottom: "8px",
                        }}
                      >
                        وجہ منتخب کریں
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {REASON_OPTIONS.map((option) => {
                          const selected =
                            reasons[student.id] ===
                            option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setReasons((previous) => ({
                                  ...previous,
                                  [student.id]:
                                    option.value,
                                }))
                              }
                              style={{
                                padding: "7px 10px",
                                borderRadius: "7px",
                                border: selected
                                  ? "1px solid #2563eb"
                                  : "1px solid #d1d5db",
                                background: selected
                                  ? "#2563eb"
                                  : "#ffffff",
                                color: selected
                                  ? "#ffffff"
                                  : "#374151",
                                fontSize: "12px",
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {reasons[student.id] ===
                        "custom" && (
                        <input
                          type="text"
                          value={
                            customReasons[student.id] ||
                            ""
                          }
                          onChange={(event) =>
                            setCustomReasons(
                              (previous) => ({
                                ...previous,
                                [student.id]:
                                  event.target.value,
                              })
                            )
                          }
                          placeholder="اپنی وجہ لکھیں"
                          style={{
                            width: "100%",
                            marginTop: "8px",
                            padding: "9px",
                            borderRadius: "7px",
                            border:
                              "1px solid #d1d5db",
                            fontSize: "13px",
                            direction: "rtl",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {status === "late" && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        background: "#f9fafb",
                        borderRadius: "10px",
                        direction: "rtl",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "14px",
                          marginBottom: "8px",
                        }}
                      >
                        کتنی دیر سے آیا؟
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {LATE_OPTIONS.map((option) => {
                          const selected =
                            lateTimes[student.id] ===
                            option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setLateTimes(
                                  (previous) => ({
                                    ...previous,
                                    [student.id]:
                                      option.value,
                                  })
                                )
                              }
                              style={{
                                padding: "7px 10px",
                                borderRadius: "7px",
                                border: selected
                                  ? "1px solid #2563eb"
                                  : "1px solid #d1d5db",
                                background: selected
                                  ? "#2563eb"
                                  : "#ffffff",
                                color: selected
                                  ? "#ffffff"
                                  : "#374151",
                                fontSize: "12px",
                              }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

  
