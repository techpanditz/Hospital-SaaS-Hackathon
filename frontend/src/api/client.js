import axios from 'axios';
import { getAuthToken } from './token';

const client = axios.create({
  //baseURL: 'api',
  baseURL: import.meta.env.VITE_API_BASE_URL + "api",
  withCredentials: false,
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
