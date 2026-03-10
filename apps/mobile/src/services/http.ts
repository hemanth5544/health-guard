import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../state/authStore";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(err);
  }
);

