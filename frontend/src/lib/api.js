import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 15000 });

// Hydrate token from localStorage on first load
const stored = typeof window !== "undefined" ? window.localStorage.getItem("hg_token") : null;
if (stored) api.defaults.headers.common.Authorization = `Bearer ${stored}`;

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// Public
export const listServices = () => api.get("/services").then((r) => r.data);

// Auth
export const requestOtp = (phone, name) => api.post("/auth/request-otp", { phone, name }).then((r) => r.data);
export const verifyOtp = (otp_id, otp) => api.post("/auth/verify-otp", { otp_id, otp }).then((r) => r.data);

// Bookings (protected)
export const createBooking = (payload) => api.post("/bookings", payload).then((r) => r.data);
export const listBookings = () => api.get("/bookings").then((r) => r.data);
export const getBooking = (id) => api.get(`/bookings/${id}`).then((r) => r.data);
export const confirmPayment = (id, payload) => api.post(`/bookings/${id}/payment`, payload).then((r) => r.data);
export const getTracking = (id) => api.get(`/bookings/${id}/tracking`).then((r) => r.data);
