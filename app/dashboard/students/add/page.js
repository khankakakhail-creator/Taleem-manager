"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// پاتھ تبدیل کر دیا گیا ہے
import { createClient } from "@/lib/supabase"; 

export default function AddStudent() {
  const router = useRouter();
  
  // Loading اور Error States
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Dynamic Dropdown States
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [orgId, setOrgId] = useState(null);

  // Form Data State
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
    status: "Active",
  });

  useEffect(() => {
    async function loadFormData() {
      try {
        const supabase = createClient();
        
        // 1. لاگ ان یوزر اور اس کی Organization معلوم کرنا
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Authentication error");

        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        
        if (orgMember) setOrgId(orgMember.organization_id);

        // 2. Programs, Batches اور Teachers کا ڈیٹا لوڈ کرنا
        const [programsRes, batchesRes, teachersRes] = await Promise.all([
          supabase.from("programs").select("id, name"),
          supabase.from("batches").select("id, name"),
          supabase.from("organization_members").select("user_id, profiles(full_name)")
        ]);

        if (programsRes.data) setPrograms(programsRes.data);
        if (batchesRes.data) setBatches(batchesRes.data);
        if (teachersRes.data) setTeachers(teachersRes.data);

      } catch (err) {
        setError("ڈیٹا لوڈ کرنے میں مسئلہ: " + err.message);
      } finally {
        setFetchingData(false);
      }
    }
    loadFormData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (formData.monthly_fee < 0) {
      setError("ماہانہ فیس 0 سے کم نہیں ہو سکتی۔");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("students").insert([
        {
          ...formData,
          organization_id: orgId,
          monthly_fee: Number(formData.monthly_fee) || 0,
          dob: formData.dob || null,
        }
      ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/students");
      }, 2000);

    } catch (err) {
      setError("طالب علم کا ڈیٹا محفوظ نہیں ہو سکا: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) return <div className="p-4 text-center">ڈیٹا لوڈ ہو رہا ہے...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-sm mt-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">نیا طالب علم شامل کریں</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-600 p-3 rounded mb-4 text-sm">طالب علم کا ریکارڈ کامیابی سے محفوظ ہو گیا!</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Student Information */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-blue-600">طالب علم کی معلومات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام (Student Name) *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">والد کا نام (Father Name) *</label>
              <input type="text" name="father_name" required value={formData.father_name} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">داخلے کی تاریخ (Admission Date) *</label>
              <input type="date" name="admission_date" required value={formData.admission_date} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ پیدائش (DOB)</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">پروگرام (Program)</label>
              <select name="program_id" value={formData.program_id} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500">
                <option value="">منتخب کریں</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">بنیادی استاد (Primary Teacher)</label>
              <select name="primary_teacher_id" value={formData.primary_teacher_id} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500">
                <option value="">منتخب کریں</option>
                {teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.profiles?.full_name || 'Teacher'}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Contact & Fee Information */}
        <section className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold text-blue-600">رابطہ اور فیس کی تفصیلات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp نمبر</label>
              <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ماہانہ فیس (Monthly Fee) *</label>
              <input type="number" name="monthly_fee" min="0" required value={formData.monthly_fee} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">پتہ (Address)</label>
              <textarea name="address" rows="2" value={formData.address} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="pt-4">
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? "محفوظ کیا جا رہا ہے..." : "طالب علم محفوظ کریں"}
          </button>
        </div>

      </form>
    </div>
  );
        }
  
