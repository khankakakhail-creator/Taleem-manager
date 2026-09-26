"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("Login succeeded but no session was created.");
      }

      router.push("/dashboard/students/add");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Login failed. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "white",
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>
          Taleem Manager
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 20 }}>
          Login to your account
        </p>

        {errorMsg && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              autoComplete="email"
            />
          </label>

          <label>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "12px 16px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
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
