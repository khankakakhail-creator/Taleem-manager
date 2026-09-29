"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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
          onClick={() =>
            alert("Teacher account creation will be added in the next step.")
          }
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
          + Add Teacher
        </button>
      </div>

      {loading && (
        <p style={{ color: "#6b7280" }}>
          Loading teachers...
        </p>
      )}

      {!loading && errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </div>
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
            Add the first teacher in the next step.
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
