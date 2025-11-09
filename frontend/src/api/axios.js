import axios from "axios";

const baseURL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_BACKEND_PROD
    : import.meta.env.VITE_BACKEND;

const cliente = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

export default cliente;


