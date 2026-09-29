"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Login required.");

      const { data: member, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new Error("Only Admin/Owner can manage teachers.");
      }

      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id, joined_at, profiles(full_name, phone)")
        .eq("organization_id", member.organization_id)
        .eq("role", "teacher")
        .order("joined_at", { ascending: false });

      if (error) throw error;

      setTeachers(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setSaving(false);
      setErrorMsg("Teacher name is required.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setSaving(false);
      setErrorMsg("Please enter a valid email.");
      return;
    }

    if (password.length < 8) {
      setSaving(false);
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-teacher",
        {
          body: {
            full_name: cleanName,
            phone: cleanPhone || null,
            email: cleanEmail,
            password,
          },
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(
          data?.error || "Teacher creation failed."
        );
      }

      setSuccessMsg(
        `Teacher account created for ${
          data.teacher?.full_name || cleanName
        }.`
      );

      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setShowForm(false);

      await loadTeachers();
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message || "Failed to create teacher."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Teachers
          </h1>

          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginTop: 5,
            }}
          >
            Manage organization teachers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "10px 13px",
            background: "#111827",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {showForm ? "Close" : "+ Add Teacher"}
        </button>
      </div>

      {successMsg && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 14,
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
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreateTeacher}
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              margin: "0 0 12px",
            }}
          >
            Create Teacher Account
          </h2>

          <Field label="Full Name">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Teacher full name"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03XXXXXXXXX"
              inputMode="tel"
              style={inputStyle}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              required
              style={inputStyle}
            />
          </Field>

          <Field label="Initial Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              style={inputStyle}
            />
          </Field>

          <p
            style={{
              fontSize: 12,
              color: "#6b7280",
              margin: "0 0 12px",
            }}
          >
            Password is used only to create the Auth account
            and is not stored in the database.
          </p>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 8,
              padding: "11px 14px",
              background: saving ? "#9ca3af" : "#16a34a",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {saving
              ? "Creating..."
              : "Create Teacher Account"}
          </button>
        </form>
      )}

      {loading && (
        <p style={{ color: "#6b7280" }}>
          Loading teachers...
        </p>
      )}

      {!loading && !errorMsg && teachers.length === 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 36 }}>👨‍🏫</div>

          <h2
            style={{
              fontSize: 17,
              margin: "10px 0 5px",
            }}
          >
            No teachers yet
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: 14,
              margin: 0,
            }}
          >
            Create the first teacher account above.
          </p>
        </div>
      )}

      {!loading && !errorMsg && teachers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {teachers.map((teacher) => (
            <div
              key={teacher.user_id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {teacher.profiles?.full_name ||
                  "Unnamed Teacher"}
              </div>

              {teacher.profiles?.phone && (
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {teacher.profiles.phone}
                </div>
              )}

              <div
                style={{
                  color: "#16a34a",
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 8,
                }}
              >
                ACTIVE TEACHER
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#374151",
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 11px",
  fontSize: 14,
  outline: "none",
};
