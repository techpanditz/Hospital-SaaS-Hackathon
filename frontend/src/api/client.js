import axios from 'axios';
import { getAuthToken } from './token';

const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
