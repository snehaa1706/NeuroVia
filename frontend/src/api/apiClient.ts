import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  config.headers.Authorization = "Bearer TEST_TOKEN";
  return config;
});

export default api;
