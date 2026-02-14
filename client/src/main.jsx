import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios';

// Set the base URL for axios requests in production
// In development, the proxy in vite.config.js handles requests to /api
if (import.meta.env.PROD) {
  // Use the environment variable VITE_API_URL if it exists
  // This will be set in the Netlify dashboard to point to the Render backend
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
