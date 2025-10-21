/**
 * Normalize API base URL
 * Removes trailing slashes and ensures /api prefix
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const defaultUrl = 'http://localhost:3001/api';
  
  if (!envUrl) {
    console.log('[API] Using default URL:', defaultUrl);
    return defaultUrl;
  }
  
  // Remove all trailing slashes
  let url = envUrl.replace(/\/+$/, '');
  
  // Ensure /api suffix if not present
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  
  console.log('[API] Environment URL:', envUrl, '→ Normalized:', url);
  return url;
};

/**
 * Build API endpoint URL
 * Prevents double slashes by cleaning both baseUrl and endpoint
 */
export const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  
  // Remove all leading slashes from endpoint
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  
  // Combine with single slash
  return `${baseUrl}/${cleanEndpoint}`;
};

