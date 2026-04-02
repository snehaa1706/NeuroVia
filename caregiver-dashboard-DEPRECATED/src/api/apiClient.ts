import axios from 'axios';

// HARDCODED AUTHENTICATION FOR TESTING CAREGIVER DASHBOARD
// Using the caregiver demo token from the backend
const CAREGIVER_TOKEN = "TEST_TOKEN"; 

export const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CAREGIVER_TOKEN}`
  }
});

// Intercept responses to handle errors nicely
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
