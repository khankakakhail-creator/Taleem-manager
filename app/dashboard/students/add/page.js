"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function AddStudent() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [orgId, setOrgId] = useState(null);
  const [userId, setUserId] = useState(null);

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
    monthly_fee: 0,
    whatsapp: "",
    phone: "",
    alternate_phone: "",
    address: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    async function loadFormData() {
      try {
        setFetchingData(true);
        setError(null);

        // ==========================================
        // 1. Get logged-in user
        // ==========================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        console.log("LIVE USER:", user);
alert("Logged-in User ID: " + (user?.id || "NO USER"));

        if (userError) {
          throw new Error(
            "Login session حاصل نہیں ہو سکی: " + userError.message
          );
        }

        if (!user) {
          throw new Error("براہ کرم پہلے لاگ اِن کریں۔");
        }

        setUserId(user.id);

        // ==========================================
        // 2. Get user's organization
        // ==========================================

        

        if (orgError) {
          throw new Error(
            "Organization حاصل نہیں ہو سکی: " + orgError.message
          );
        }

        if (!orgMember?.organization_id) {
          throw new Error(
            "Organization نہیں ملی۔ User ID: " + user.id
          );
        }

        const currentOrgId = orgMember.organization_id;

        setOrgId(currentOrgId);

        // ==========================================
        // 3. Load Programs, Batcconst {
  data: orgMember,
  error: orgError,
} = await supabase
  .from("organization_members")
  .select("organization_id, user_id, role")
  .eq("user_id", user.id)
  .maybeSingle();

console.log("CURRENT USER:", user.id);
console.log("ORG MEMBER:", orgMember);
console.log("ORG ERROR:", orgError);

if (orgError) {
  throw new Error(
    "Organization حاصل نہیں ہو سکی: " + orgError.message
  );
}

if (!orgMember) {
  throw new Error(
    "Organization membership نہیں ملی۔ User ID: " + user.id
  );
}

const currentOrgId = orgMember.organization_id;

setOrgId(currentOrgId);hes and Teachers
        // ==========================================

        const [
          programsRes,
          batchesRes,
          teachersRes,
        ] = await Promise.all([
          supabase
            .from("programs")
            .select("id, name, active")
            .eq("organization_id", currentOrgId)
            .eq("active", true)
            .order("name"),

          supabase
            .from("batches")
            .select("id, name, active")
            .eq("organization_id", currentOrgId)
            .eq("active", true)
            .order("name"),

          supabase
            .from("organization_members")
            .select("user_id, role")
            .eq("organization_id", currentOrgId)
            .in("role", ["owner", "admin", "teacher"]),
        ]);

        // ==========================================
        // Programs error
        // ==========================================

        if (programsRes.error) {
          throw new Error(
            "Programs load نہیں ہوئے: " +
              programsRes.error.message
          );
        }

        // ==========================================
        // Batches error
        // ==========================================

        if (batchesRes.error) {
          throw new Error(
            "Batches load نہیں ہوئے: " +
              batchesRes.error.message
          );
        }

        // ==========================================
        // Teachers error
        // ==========================================

        if (teachersRes.error) {
          throw new Error(
            "Teachers load نہیں ہوئے: " +
              teachersRes.error.message
          );
        }

        const programData = programsRes.data || [];
        const batchData = batchesRes.data || [];
        const memberData = teachersRes.data || [];

        setPrograms(programData);
        setBatches(batchData);

        // ==========================================
        // 4. Load teacher profiles
        // ==========================================

        if (memberData.length > 0) {
          const userIds = memberData.map(
            (member) => member.user_id
          );

          const {
            data: profilesData,
            error: profilesError,
          } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          // Profile RLS کی وجہ سے names نہ ملیں
          // تو بھی teachers دکھائے جائیں گے

          if (profilesError) {
            console.log(
              "Profile names unavailable:",
              profilesError.message
            );

            setTeachers(
              memberData.map((member) => ({
                user_id: member.user_id,
                full_name:
                  member.role === "owner"
                    ? "Owner"
                    : member.role === "admin"
                    ? "Admin"
                    : "Teacher",
                role: member.role,
              }))
            );
          } else {
            const profileMap = {};

            (profilesData || []).forEach((profile) => {
              profileMap[profile.id] =
                profile.full_name;
            });

            setTeachers(
              memberData.map((member) => ({
                user_id: member.user_id,

                full_name:
                  profileMap[member.user_id] ||
                  (member.role === "owner"
                    ? "Owner"
                    : member.role === "admin"
                    ? "Admin"
                    : "Teacher"),

                role: member.role,
              }))
            );
          }
        } else {
          setTeachers([]);
        }
      } catch (err) {
        console.error(
          "Add Student load error:",
          err
        );

        setError(
          "ڈیٹا لوڈ کرنے میں مسئلہ: " +
            (err?.message || "Unknown error")
        );
      } finally {
        setFetchingData(false);
      }
    }

    loadFormData();
  }, []);

  // ==========================================
  // Handle input changes
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // Submit student
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!orgId) {
        throw new Error(
          "Organization ID نہیں ملی۔ براہ کرم دوبارہ لاگ اِن کریں۔"
        );
      }

      if (!formData.name.trim()) {
        throw new Error(
          "طالب علم کا نام درج کریں۔"
        );
      }

      if (!formData.father_name.trim()) {
        throw new Error(
          "والد کا نام درج کریں۔"
        );
      }

      if (!formData.admission_date) {
        throw new Error(
          "داخلے کی تاریخ منتخب کریں۔"
        );
      }

      const monthlyFee = Number(
        formData.monthly_fee
      );

      if (
        Number.isNaN(monthlyFee) ||
        monthlyFee < 0
      ) {
        throw new Error(
          "ماہانہ فیس درست درج کریں۔"
        );
      }

      const studentData = {
        organization_id: orgId,

        name: formData.name.trim(),

        father_name:
          formData.father_name.trim(),

        photo_url:
          formData.photo_url.trim() || null,

        dob:
          formData.dob || null,

        gender:
          formData.gender || null,

        admission_date:
          formData.admission_date,

        program_id:
          formData.program_id || null,

        batch_id:
          formData.batch_id || null,

        primary_teacher_id:
          formData.primary_teacher_id || null,

        monthly_fee: monthlyFee,

        whatsapp:
          formData.whatsapp.trim() || null,

        phone:
          formData.phone.trim() || null,

        alternate_phone:
          formData.alternate_phone.trim() || null,

        address:
          formData.address.trim() || null,

        notes:
          formData.notes.trim() || null,

        status:
          formData.status || "active",
      };

      const {
        error: insertError,
      } = await supabase
        .from("students")
        .insert([studentData]);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push(
          "/dashboard/students"
        );
      }, 1200);
    } catch (err) {
      console.error(
        "Student insert error:",
        err
      );

      setError(
        "طالب علم کا ڈیٹا محفوظ نہیں ہو سکا: " +
          (err?.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Loading screen
  // ==========================================

  if (fetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">
            ڈیٹا لوڈ ہو رہا ہے...
          </div>

          <div className="text-sm text-gray-500 mt-2">
            Programs، Batches اور Teachers حاصل کیے جا رہے ہیں
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Main page
  // ==========================================

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-sm mt-4">

      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
        نیا طالب علم شامل کریں
      </h1>

      {/* ======================================
          Temporary Diagnostic Information
          ====================================== */}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
        <div className="font-semibold text-blue-800 mb-1">
          System Information
        </div>

        <div className="text-gray-700 break-all">
          User ID: {userId || "Not found"}
        </div>

        <div className="text-gray-700 break-all">
          Organization ID: {orgId || "Not found"}
        </div>

        <div className="text-gray-700">
          Programs: {programs.length}
        </div>

        <div className="text-gray-700">
          Batches: {batches.length}
        </div>

        <div className="text-gray-700">
          Teachers: {teachers.length}
        </div>
      </div>

      {/* Error */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm font-medium break-words">
          {error}
        </div>
      )}

      {/* Success */}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm font-medium">
          طالب علم کا ریکارڈ کامیابی سے محفوظ ہو گیا!
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* ======================================
            Student Information
            ====================================== */}

        <section className="space-y-4">

          <h2 className="text-lg font-semibold text-blue-600">
            طالب علم کی معلومات
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام *
              </label>

              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Father Name */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                والد کا نام *
              </label>

              <input
                type="text"
                name="father_name"
                required
                value={formData.father_name}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Admission Date */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                داخلے کی تاریخ *
              </label>

              <input
                type="date"
                name="admission_date"
                required
                value={formData.admission_date}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* DOB */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاریخ پیدائش
              </label>

              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gender */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                جنس
              </label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  منتخب کریں
                </option>

                <option value="male">
                  مرد
                </option>

                <option value="female">
                  خاتون
                </option>
              </select>
            </div>

            {/* Program */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                پروگرام
              </label>

              <select
                name="program_id"
                value={formData.program_id}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  منتخب کریں
                </option>

                {programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                  </option>
                ))}
              </select>

              {programs.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  کوئی Active Program موجود نہیں۔
                </p>
              )}
            </div>

            {/* Batch */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch
              </label>

              <select
                name="batch_id"
                value={formData.batch_id}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  منتخب کریں
                </option>

                {batches.map((batch) => (
                  <option
                    key={batch.id}
                    value={batch.id}
                  >
                    {batch.name}
                  </option>
                ))}
              </select>

              {batches.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ابھی کوئی Active Batch موجود نہیں۔
                </p>
              )}
            </div>

            {/* Primary Teacher */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                بنیادی استاد
              </label>

              <select
                name="primary_teacher_id"
                value={formData.primary_teacher_id}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  منتخب کریں
                </option>

                {teachers.map((teacher) => (
                  <option
                    key={teacher.user_id}
                    value={teacher.user_id}
                  >
                    {teacher.full_name}
                  </option>
                ))}
              </select>

              {teachers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ابھی کوئی Teacher موجود نہیں۔
                </p>
              )}
            </div>

          </div>
        </section>

        {/* ======================================
            Contact and Fee
            ====================================== */}

        <section className="space-y-4 pt-4 border-t">

          <h2 className="text-lg font-semibold text-blue-600">
            رابطہ اور فیس کی تفصیلات
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* WhatsApp */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp نمبر
              </label>

              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Phone */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                فون نمبر
              </label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Alternate Phone */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                متبادل نمبر
              </label>

              <input
                type="tel"
                name="alternate_phone"
                value={formData.alternate_phone}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Monthly Fee */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ماہانہ فیس *
              </label>

              <input
                type="number"
                name="monthly_fee"
                min="0"
                required
                value={formData.monthly_fee}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 foc
