import { supabase } from './supabase'
import { toISODate } from './utils'

// Thin data-access layer: every call throws on error so pages can toast it.
const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

export const api = {
  // ---- doctors & specializations ----
  async listDoctors({ includeInactive = false } = {}) {
    let q = supabase.from('doctors').select('*, reviews(rating)').order('full_name')
    if (!includeInactive) q = q.eq('is_active', true)
    const rows = unwrap(await q)
    return rows.map(({ reviews, ...d }) => ({
      ...d,
      review_count: reviews?.length || 0,
      avg_rating: reviews?.length ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0,
    }))
  },
  async getDoctor(id) {
    return unwrap(await supabase.from('doctors').select('*').eq('id', id).single())
  },
  async listReviews(doctorId) {
    return unwrap(
      await supabase.from('reviews').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
    )
  },
  async addReview(review) {
    return unwrap(await supabase.from('reviews').insert(review).select().single())
  },
  async listSpecializations() {
    return unwrap(await supabase.from('specializations').select('*').order('name'))
  },
  async saveSpecialization({ id, name, description }) {
    if (id) return unwrap(await supabase.from('specializations').update({ name, description }).eq('id', id).select().single())
    return unwrap(await supabase.from('specializations').insert({ name, description }).select().single())
  },
  async deleteSpecialization(id) {
    return unwrap(await supabase.from('specializations').delete().eq('id', id))
  },
  async saveDoctor(doctor) {
    const { id, avg_rating, review_count, created_at, ...fields } = doctor
    if (id) return unwrap(await supabase.from('doctors').update(fields).eq('id', id).select().single())
    return unwrap(await supabase.from('doctors').insert(fields).select().single())
  },
  async deleteDoctor(id) {
    return unwrap(await supabase.from('doctors').delete().eq('id', id))
  },

  // ---- availability ----
  async getSlots(doctorId, date) {
    return unwrap(await supabase.rpc('get_doctor_slots', { p_doctor_id: doctorId, p_date: date }))
  },
  async getAvailableDates(doctorId, from, to) {
    return unwrap(
      await supabase.rpc('get_doctor_available_dates', {
        p_doctor_id: doctorId,
        p_from: typeof from === 'string' ? from : toISODate(from),
        p_to: typeof to === 'string' ? to : toISODate(to),
      }),
    )
  },
  async listAvailability(doctorId, from, to) {
    return unwrap(
      await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('available_date', from)
        .lte('available_date', to)
        .order('available_date')
        .order('start_time'),
    )
  },
  async insertAvailability(rows) {
    return unwrap(await supabase.from('doctor_availability').insert(rows).select())
  },
  async updateAvailability(id, fields) {
    return unwrap(await supabase.from('doctor_availability').update(fields).eq('id', id).select().single())
  },
  async deleteAvailability(ids) {
    return unwrap(await supabase.from('doctor_availability').delete().in('id', ids))
  },

  // ---- appointments ----
  async bookAppointment({ doctorId, date, time, concerns }) {
    return unwrap(
      await supabase.rpc('book_appointment', {
        p_doctor_id: doctorId,
        p_date: date,
        p_time: time,
        p_concerns: concerns || null,
      }),
    )
  },
  async cancelAppointment(id) {
    return unwrap(await supabase.rpc('cancel_appointment', { p_id: id }))
  },
  async setAppointmentStatus(id, status) {
    return unwrap(await supabase.rpc('admin_set_appointment_status', { p_id: id, p_status: status }))
  },
  async myAppointments(userId) {
    return unwrap(
      await supabase
        .from('appointments')
        .select('*, doctor:doctors(id, full_name, specialization, profile_image, consultation_fee)')
        .eq('patient_id', userId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false }),
    )
  },
  async allAppointments({ status, from, to, doctorId, limit } = {}) {
    let q = supabase
      .from('appointments')
      .select(
        '*, doctor:doctors(id, full_name, specialization, profile_image), patient:profiles(id, full_name, email, phone)',
      )
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
    if (status) q = q.eq('status', status)
    if (from) q = q.gte('appointment_date', from)
    if (to) q = q.lte('appointment_date', to)
    if (doctorId) q = q.eq('doctor_id', doctorId)
    if (limit) q = q.limit(limit)
    return unwrap(await q)
  },
  async recentAppointments(limit = 6) {
    return unwrap(
      await supabase
        .from('appointments')
        .select('*, doctor:doctors(full_name, specialization, profile_image), patient:profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(limit),
    )
  },

  // ---- recommendations & stats ----
  async recommendDoctors(specialization, days = 14) {
    return unwrap(await supabase.rpc('recommend_doctors', { p_specialization: specialization || null, p_days: days }))
  },
  async adminSummary() {
    return unwrap(await supabase.rpc('get_admin_summary'))
  },
  async dailyStats(from, to) {
    return unwrap(await supabase.rpc('get_daily_stats', { p_from: from, p_to: to }))
  },

  // ---- notifications ----
  async notifications(userId) {
    return unwrap(
      await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    )
  },
  async markNotificationsRead(userId) {
    return unwrap(await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false))
  },
  async clearNotifications(userId) {
    return unwrap(await supabase.from('notifications').delete().eq('user_id', userId))
  },

  // ---- profile ----
  async updateProfile(id, fields) {
    return unwrap(await supabase.from('profiles').update(fields).eq('id', id).select().single())
  },
}
