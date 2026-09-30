"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../utils/supabase";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [role, setRole] = useState(null);
  const [student, setStudent] = useState(null);

  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    father_name: "",
    photo_url: "",
    dob: "",
    gender: "",
    admission_date: "",
    program_id: "",
    batch_id: "",
    primary_teacher_id: "",
    monthly_fee: "",
    whatsapp: "",
    phone: "",
    alternate_phone: "",
    address: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    if (studentId) {
      loadStudent();
    }
  }, [studentId]);

  async function loadStudent() {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in.");

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) {
        throw new Error("No organization found for this user.");
      }

      const currentRole = orgMember.role;
      setRole(currentRole);

      // Teachers are not allowed to open student profiles.
      if (currentRole === "teacher") {
        router.replace("/dashboard/students");
        return;
      }

      const orgId = orgMember.organization_id;

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(
          `
          id,
          organization_id,
          name,
          father_name,
          photo_url,
          dob,
          gender,
          admission_date,
          program_id,
          batch_id,
          primary_teacher_id,
          monthly_fee,
          whatsapp,
          phone,
          alternate_phone,
          address,
          notes,
          status,
          created_at,
          updated_at,
          programs(name),
          batches(name)
          `
        )
        .eq("id", studentId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!studentData) {
        throw new Error("Student not found.");
      }

      setStudent(studentData);

      setFormData({
        name: studentData.name || "",
        father_name: studentData.father_name || "",
        photo_url: studentData.photo_url || "",
        dob: studentData.dob || "",
        gender: studentData.gender || "",
        admission_date: studentData.admission_date || "",
        program_id: studentData.program_id || "",
        batch_id: studentData.batch_id || "",
        primary_teacher_id: studentData.primary_teacher_id || "",
        monthly_fee:
          studentData.monthly_fee !== null &&
          studentData.monthly_fee !== undefined
            ? String(studentData.monthly_fee)
            : "",
        whatsapp: studentData.whatsapp || "",
        phone: studentData.phone || "",
        alternate_phone: studentData.alternate_phone || "",
        address: studentData.address || "",
        notes: studentData.notes || "",
        status: studentData.status || "active",
      });

      const { data: programsData, error: programsError } = await supabase
        .from("programs")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("name");

      if (programsError) throw programsError;

      setPrograms(programsData || []);

      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, name, start_time, end_time")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("name");

      if (batchesError) throw batchesError;

      setBatches(batchesData || []);

      const { data: teachersData, error: teachersError } =
        await supabase
          .from("organization_members")
          .select(
            "user_id, profiles(full_name)"
          )
          .eq("organization_id", orgId)
          .eq("role", "teacher");

      if (teachersError) throw teachersError;

      setTeachers(teachersData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load student.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (role === "teacher") {
      setErrorMsg("Teachers are not allowed to edit students.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (!formData.name.trim()) {
        throw new Error("Student name is required.");
      }

      if (formData.monthly_fee !== "") {
        const fee = Number(formData.monthly_fee);

        if (Number.isNaN(fee) || fee < 0) {
          throw new Error("Monthly fee must be a valid non-negative number.");
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in.");

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) {
        throw new Error("No organization found for this user.");
      }

      if (
        orgMember.role !== "owner" &&
        orgMember.role !== "admin"
      ) {
        throw new Error("You are not allowed to edit students.");
      }

      const updateData = {
        name: formData.name.trim(),
        father_name: formData.father_name.trim() || null,
        photo_url: formData.photo_url.trim() || null,
        dob: formData.dob || null,
        gender: formData.gender || null,
        admission_date: formData.admission_date || null,
        program_id: formData.program_id || null,
        batch_id: formData.batch_id || null,
        primary_teacher_id:
          formData.primary_teacher_id || null,
        monthly_fee:
          formData.monthly_fee === ""
            ? 0
            : Number(formData.monthly_fee),
        whatsapp: formData.whatsapp.trim() || null,
        phone: formData.phone.trim() || null,
        alternate_phone:
          formData.alternate_phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status || "active",
      };

      const { data: updatedStudent, error: updateError } =
        await supabase
          .from("students")
          .update(updateData)
          .eq("id", studentId)
          .eq("organization_id", orgMember.organization_id)
          .select()
          .single();

      if (updateError) throw updateError;

      setStudent((prev) => ({
        ...prev,
        ...updatedStudent,
      }));

      setSuccessMsg("Student updated successfully.");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update student.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (role === "teacher") {
      setErrorMsg("Teachers are not allowed to change student status.");
      return;
    }

    if (!student) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const newStatus =
        student.status === "active" ? "inactive" : "active";

      const { data: updatedStudent, error: updateError } =
        await supabase
          .from("students")
          .update({ status: newStatus })
          .eq("id", studentId)
          .select()
          .single();

      if (updateError) throw updateError;

      setStudent((prev) => ({
        ...prev,
        ...updatedStudent,
      }));

      setFormData((prev) => ({
        ...prev,
        status: newStatus,
      }));

      setSuccessMsg(
        `Student marked as ${newStatus}.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to change student status."
      );
    } finally {
      setSaving(false);
    }
    }
    return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      {loading ? (
        <p>Loading student...</p>
      ) : errorMsg ? (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            color: "#991b1b",
          }}
        >
          {errorMsg}
        </div>
      ) : !student ? (
        <p>Student not found.</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                {student.name}
              </h1>

              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                }}
              >
                Student Profile
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/dashboard/students"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#f3f4f6",
                  color: "#111827",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ← Students
              </Link>

              {role !== "teacher" && (
                <Link
                  href={`/dashboard/students/${student.id}/slip`}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "white",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Fee Slip
                </Link>
              )}
            </div>
          </div>

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

          <form onSubmit={handleSave}>
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Basic Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label="Student Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                  required
                />

                <Field
                  label="Father Name"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />

                <Field
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Gender

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={role === "teacher"}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 15,
                      background:
                        role === "teacher"
                          ? "#f3f4f6"
                          : "white",
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <Field
                  label="Admission Date"
                  name="admission_date"
                  type="date"
                  value={formData.admission_date}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />

                <Field
                  label="Photo URL"
                  name="photo_url"
                  value={formData.photo_url}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />
              </div>
            </div>

            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Academic Information
              </h2>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Program

                <select
                  name="program_id"
                  value={formData.program_id}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                    background:
                      role === "teacher"
                        ? "#f3f4f6"
                        : "white",
                  }}
                >
                  <option value="">Select Program</option>

                  {programs.map((program) => (
                    <option
                      key={program.id}
                      value={program.id}
                    >
                      {program.name}
                    </option>
                  ))}
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Batch / Timing

                <select
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                    background:
                      role === "teacher"
                        ? "#f3f4f6"
                        : "white",
                  }}
                >
                  <option value="">Select Batch / Timing</option>

                  {batches.map((batch) => (
                    <option
                      key={batch.id}
                      value={batch.id}
                    >
                      {batch.name}
                      {batch.start_time && batch.end_time
                        ? ` (${batch.start_time} - ${batch.end_time})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Primary Teacher

                <select
                  name="primary_teacher_id"
                  value={formData.primary_teacher_id}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                    background:
                      role === "teacher"
                        ? "#f3f4f6"
                        : "white",
                  }}
                >
                  <option value="">Select Teacher</option>

                  {teachers.map((teacher) => (
                    <option
                      key={teacher.user_id}
                      value={teacher.user_id}
                    >
                      {teacher.profiles?.full_name ||
                        "Unnamed Teacher"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {role !== "teacher" && (
              <div
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  Fee Information
                </h2>

                <Field
                  label="Monthly Fee"
                  name="monthly_fee"
                  type="number"
                  value={formData.monthly_fee}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            )}

            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                Contact Information
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label="WhatsApp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />

                <Field
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />

                <Field
                  label="Alternate Phone"
                  name="alternate_phone"
                  value={formData.alternate_phone}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 12,
                }}
              >
                Address

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={role === "teacher"}
                  rows={3}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                    resize: "vertical",
                    background:
                      role === "teacher"
                        ? "#f3f4f6"
                        : "white",
                  }}
                />
              </label>
            </div>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                marginTop: 12,
              }}
            >
              Notes

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={role === "teacher"}
                rows={4}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  resize: "vertical",
                  background:
                    role === "teacher"
                      ? "#f3f4f6"
                      : "white",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                marginTop: 12,
              }}
            >
              Status

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={role === "teacher"}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  background:
                    role === "teacher"
                      ? "#f3f4f6"
                      : "white",
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          {role !== "teacher" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: saving ? "#9ca3af" : "#16a34a",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={saving}
                style={{
                  padding: "10px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                  color: "#111827",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {student.status === "active"
                  ? "Mark Inactive"
                  : "Mark Active"}
              </button>
            </div>
          )}
        </form>

        {role !== "teacher" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 17,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Student Summary
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: "#6b7280" }}>
                  Program
                </span>
                <div style={{ fontWeight: 600 }}>
                  {student.programs?.name || "No Program"}
                </div>
              </div>

              <div>
                <span style={{ color: "#6b7280" }}>
                  Batch
                </span>
                <div style={{ fontWeight: 600 }}>
                  {student.batches?.name || "No Batch"}
                </div>
              </div>

              <div>
                <span style={{ color: "#6b7280" }}>
                  Monthly Fee
                </span>
                <div style={{ fontWeight: 600 }}>
                  Rs {student.monthly_fee || 0}
                </div>
              </div>

              <div>
                <span style={{ color: "#6b7280" }}>
                  Status
                </span>
                <div style={{ fontWeight: 600 }}>
                  {student.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {role !== "teacher" && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Student ID: {student.id}
          </div>
        )}
      )}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
  min,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {label}

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        min={min}
        style={{
          padding: 10,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          fontSize: 15,
          background: disabled ? "#f3f4f6" : "white",
        }}
      />
    </label>
  );
                  }
