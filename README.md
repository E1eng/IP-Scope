# IP Asset Analyzer (IP Scope)

The **IP Asset Analyzer (IP Scope)** is a sophisticated full-stack web application designed to search, analyze, and visualize Intellectual Property (IP) assets registered on the Story Protocol blockchain.

---

## ✨ Core Features

* **IP Graph Visualization (D3.js):** Generates a live, force-directed graph showing the entire provenance (parent-child relationships) of any input IP Asset ID. Nodes (IPAs) and edges (Licenses) are fully interactive.

* **Minimalist & Responsive Design:** Uses Tailwind CSS for a clean, elegant, and highly efficient dashboard interface on all devices.

* **Search & Filtering:** Powerful search functionality with client-side sorting options (Score, Date Created) and media type filters.

* **License Clarity:** Accurately displays Public IP License (PIL) Terms and Royalty Policy details for analyzed assets.

* **AI AGENT:** Comming Soon.

---

## 📂 Project Structure

The application follows a clean Node.js/React monorepo structure, prioritizing separation of concerns.

```bash
IP-Scope/
├── client/
│   ├── public/  
│   │   ├── favicon.png         
│   ├── src/
│   │   ├── components/    
│   │   │   ├── AssetCard.jsx
│   │   │   ├── AssetDetailModal.jsx 
│   │   │   ├── AssetDetailPanel.jsx 
│   │   │   ├── DetailROw.jsx  
│   │   │   ├── IPGraphVisualization.jsx
│   │   │   ├── licenseCard.jsx
│   │   │   ├── RemixDetailModal.jsx 
│   │   │   ├── ResultDisplay.jsx 
│   │   │   ├── SearchBar.jsx  
│   │   │   └── SkeletonCard.jsx
│   │   ├── pages/               
│   │   │   ├── SearchPage.jsx   
│   │   │   ├── IPGraphPage.jsx  
│   │   │   └── MonitoringPage.jsx 
│   │   └── App.jsx              
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── server/                      
    ├── src/
    │   ├── controllers/         
    │   │   └── asset.controller.js 
    │   │   └── search.controller.js
    │   ├── routes/
    │   │   └── index.js  
    │   └── services/
    │       └── storyProtocol.service.js 
    ├── .env.
    ├── .gitignore
    └── package.json 
    ---

## 🗺️ API Endpoints Summary

The backend exposes the following robust API routes (all prefixed with `/api`):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/search` | Performs text and media type search with client-side sorting. |
| `GET` | `/api/assets/:id` | Fetches full normalized detail (including licenses) for a single IP Asset. |
| `GET` | `/api/assets/:id/remix-tree` | Fetches multi-level, recursive derivative and parent data for graph visualization. |
| `GET` | `/api/assets/:id/analytics` | Simulates fetching specific on-chain metrics (Royalty Split, Dispute Status). |
| `GET` | `/api/monitor/agents` | Simulates fetching a list of monitored IP assets. |

## ⚙️ Setup and Configuration

### Prerequisites

* Node.js (v18 or newer)
* npm or yarn
* A valid API Key from the Story Protocol API.

### 1. Backend Setup (`server`)

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables (CRITICAL STEP):**
    Create a new file named `.env` inside the `server/` directory and replace the placeholder with your actual Story Protocol API Key.

    **`.env` content in `server/`**
    ```env
    # Port for the backend server
    PORT=3001

    # Your API Key from Story Protocol (MUST BE VALID)
    STORY_PROTOCOL_API_KEY="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
    ```

### 2. Frontend Setup (`client`)

1.  Navigate to the `client` directory:
    ```bash
    cd client
    ```

2.  Install dependencies (including D3.js and React Router):
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a file named `.env` in the `client/` directory and ensure it points to the backend URL.

    **`.env` content in `client/`**
    ```env
    VITE_API_BASE_URL="http://localhost:3001/api"
    ```

## ▶️ Running the Application

You need two separate terminal sessions to run the backend and frontend concurrently.

1.  **Start the Backend Server (Terminal 1):**
    ```bash
    cd server
    npm run dev
    # Console should display: Server is listening on port 3001
    ```

2.  **Start the Frontend App (Terminal 2):**
    ```bash
    cd client
    npm run dev
    # Console will display the VITE access URL (usually http://localhost:5173)
    ```

Open your browser to the frontend URL to start using the IP Asset Analyzer.
