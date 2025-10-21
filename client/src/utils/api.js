/**
 * Normalize API base URL
 * Removes trailing slashes and ensures /api prefix
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const defaultUrl = 'http://localhost:3001/api';
  
  if (!envUrl) return defaultUrl;
  
  // Remove trailing slashes
  let url = envUrl.replace(/\/+$/, '');
  
  // Ensure /api suffix if not present
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  
  return url;
};

/**
 * Build API endpoint URL
 */
export const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

