import axios from "axios";
import Cookies from "js-cookie";

const fromsmithAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  withCredentials: true,
});

fromsmithAxios.interceptors.request.use(
  (config) => {
    const value = Cookies.get("session");
    config.headers["X-Session-Token"] = value;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

fromsmithAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default fromsmithAxios;
