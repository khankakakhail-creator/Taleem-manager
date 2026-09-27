"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";

export default function BatchesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [orgId, setOrgId] = useState(null);
  const [batches, setBatches] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User not logged in.");

      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgMember) throw new Error("No organization found for this user.");

      setOrgId(orgMember.organization_id);

      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, name, start_time, end_time, active")
        .eq("organization_id", orgMember.organization_id)
        .order("name");

      if (batchesError) throw batchesError;

      setBatches(batchesData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ name: "", start_time: "", end_time: "" });
    setShowAddForm(false);
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(batch) {
    setEditingId(batch.id);
    setShowAddForm(false);
    setForm({
      name: batch.name || "",
      start_time: batch.start_time || "",
      end_time: batch.end_time || "",
    });
  }

  async function handleAdd(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!orgId) return;
    if (!form.name.trim()) {
      setErrorMsg("Batch name is required.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase.from("batches").insert([
        {
          organization_id: orgId,
          name: form.name.trim(),
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          active: true,
        },
      ]);

      if (insertError) throw insertError;

      setSuccessMsg("Batch added successfully!");
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to add batch.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Batch name is required.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("batches")
        .update({
          name: form.name.trim(),
          start_time: form.start_time || null,
          end_time: form.end_time || null,
        })
        .eq("id", editingId);

      if (updateError) throw updateError;

      setSuccessMsg("Batch updated successfully!");
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update batch.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(batch) {
    setSaving(true);
    setErrorMsg("");

    try {
      const { error: updateError } = await supabase
        .from("batches")
        .update({ active: !batch.active })
        .eq("id", batch.id);

      if (updateError) throw updateError;

      loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update batch status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Batches</h1>
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: "#16a34a",
              color: "white",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
            }}
          >
            + Add Batch
          </button>
        )}
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

      {(showAddForm || editingId) && (
        <form
          onSubmit={editingId ? handleUpdate : handleAdd}
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>{editingId ? "Edit Batch" : "New Batch"}</h3>

          <label>
            Batch Name *
            <input name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
          </label>

          <label>
            Start Time
            <input type="time" name="start_time" value={form.start_time} onChange={handleChange} style={inputStyle} />
          </label>

          <label>
            End Time
            <input type="time" name="end_time" value={form.end_time} onChange={handleChange} style={inputStyle} />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {saving ? "Saving..." : editingId ? "Update Batch" : "Save Batch"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading batches...</p>
      ) : batches.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No batches yet. Add one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {batches.map((b) => (
            <div
              key={b.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{b.name}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : "No timing set"}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: b.active ? "#dcfce7" : "#f3f4f6",
                    color: b.active ? "#166534" : "#6b7280",
                  }}
                >
                  {b.active ? "active" : "inactive"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <button
                  onClick={() => startEdit(b)}
                  style={{
                    fontSize: 13,
                    color: "#2563eb",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(b)}
                  disabled={saving}
                  style={{
                    fontSize: 13,
                    color: b.active ? "#991b1b" : "#166534",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {b.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
