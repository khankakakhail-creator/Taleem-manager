"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../utils/supabase";

export default function AddStudentPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    photo_url: "",
    dob: "",
    admission_date: "",
    gender: "male",
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
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setErrorMsg("");

    try {
      // Step 1: Login session verify
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in. Please login again.");

      // Step 2: Organization membership verify
      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id, user_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      const currentOrgId = orgMember.organization_id;
      setOrgId(currentOrgId);

      // Step 3: Programs load
      const { data: programsData, error: programsError } = await supabase
        .from("programs")
        .select("id, name, active")
        .eq("organization_id", currentOrgId)
        .eq("active", true)
        .order("name");

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Step 4: Batches load
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, name, start_time, end_time, active")
        .eq("organization_id", currentOrgId)
        .eq("active", true)
        .order("name");

      if (batchesError) throw batchesError;
      setBatches(batchesData || []);

      // Step 5: Teachers load (all members of this organization)
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", currentOrgId);

      if (membersError) throw membersError;

      const memberIds = (membersData || []).map((m) => m.user_id);

      let teachersList = [];
      if (memberIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        if (profilesError) throw profilesError;

        teachersList = (membersData || []).map((m) => {
          const profile = (profilesData || []).find((p) => p.id === m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            full_name: profile?.full_name || "Unnamed User",
          };
        });
      }

      setTeachers(teachersList);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while loading data.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!orgId) {
      setErrorMsg("Organization not found. Please reload the page.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMsg("Student name is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        organization_id: orgId,
        name: form.name.trim(),
        father_name: form.father_name.trim() || null,
        photo_url: form.photo_url.trim() || null,
        dob: form.dob || null,
        admission_date: form.admission_date || null,
        gender: form.gender || null,
        program_id: form.program_id || null,
        batch_id: form.batch_id || null,
        primary_teacher_id: form.primary_teacher_id || null,
        monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
        whatsapp: form.whatsapp.trim() || null,
        phone: form.phone.trim() || null,
        alternate_phone: form.alternate_phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status || "active",
      };

      const { error: insertError } = await supabase
        .from("students")
        .insert([payload]);

      if (insertError) throw insertError;

      setSuccessMsg("Student added successfully!");

      setForm({
        name: "",
        father_name: "",
        photo_url: "",
        dob: "",
        admission_date: "",
        gender: "male",
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

      setTimeout(() => {
        router.push("/dashboard/students");
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        Add Student
      </h1>

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

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3>Basic Information</h3>

        <label>
          Student Name *
          <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
        </label>

        <label>
          Father Name
          <input name="father_name" value={form.father_name} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Photo URL
          <input name="photo_url" value={form.photo_url} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Date of Birth
          <input type="date" name="dob" value={form.dob} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Admission Date
          <input type="date" name="admission_date" value={form.admission_date} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Gender
          <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <h3>Academic</h3>

        <label>
          Program
          <select name="program_id" value={form.program_id} onChange={handleChange} style={inputStyle}>
            <option value="">Select Program</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Batch / Timing
          <select name="batch_id" value={form.batch_id} onChange={handleChange} style={inputStyle}>
            <option value="">Select Batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Primary Teacher
          <select name="primary_teacher_id" value={form.primary_teacher_id} onChange={handleChange} style={inputStyle}>
            <option value="">Select Teacher</option>
            {teachers.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.full_name} ({t.role})
              </option>
            ))}
          </select>
        </label>

        <h3>Fee</h3>

        <label>
          Monthly Fee
          <input type="number" name="monthly_fee" value={form.monthly_fee} onChange={handleChange} style={inputStyle} />
        </label>

        <h3>Contact</h3>

        <label>
          WhatsApp
          <input name="whatsapp" value={form.whatsapp} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Phone
          <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Alternate Phone
          <input name="alternate_phone" value={form.alternate_phone} onChange={handleChange} style={inputStyle} />
        </label>

        <h3>Other</h3>

        <label>
          Address
          <textarea name="address" value={form.address} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Notes
          <textarea name="notes" value={form.notes} onChange={handleChange} style={inputStyle} />
        </label>

        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {saving ? "Saving..." : "Save Student"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 10,
  marginTop: 4,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 16,
};
    
