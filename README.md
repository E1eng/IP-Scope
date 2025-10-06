IP Asset Analyzer (IP Scope)
The IP Asset Analyzer (IP Scope) is a sophisticated full-stack web application designed to search, analyze, and visualize Intellectual Property (IP) assets registered on the Story Protocol blockchain. It transforms raw API data into an interactive, minimalist dashboard, making complex licensing and derivative relationships easy to understand.

✨ Core Features
IP Graph Visualization (D3.js): Generates a live, force-directed graph showing the entire provenance (parent-child relationships) of any input IP Asset ID. Nodes (IPAs) and edges (Licenses) are fully interactive.

Dynamic Tooltips: Clicking any node instantly fetches on-chain metrics (e.g., Royalty Splits, Dispute Status) for deep analysis.

Minimalist & Responsive Design: Uses Tailwind CSS for a clean, elegant, and highly efficient dashboard interface on all devices.

Search & Filtering: Powerful search functionality with sorting options (Score, Date Created) and media type filters.

License Clarity: Accurately displays Public IP License (PIL) Terms and Royalty Policy details for analyzed assets.

Enforcement Simulation: Includes a simulated workflow for initiating enforcement actions and predictive monitoring agents.

📂 Project Structure
The application follows a clean Node.js/React monorepo structure, prioritizing separation of concerns.

IP-Scope/
├── client/                      # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI components (D3 visualization, Cards, Modals)
│   │   │   ├── AssetCard.jsx
│   │   │   ├── AssetDetailPanel.jsx # Main detail view (Right sidebar)
│   │   │   ├── IPGraphVisualization.jsx # D3.js core rendering
│   │   │   ├── LicenseCard.jsx  # Component to display PIL terms clearly
│   │   │   └── SearchBar.jsx
│   │   ├── pages/               # Main application views
│   │   │   ├── SearchPage.jsx   # Search and List view
│   │   │   ├── IPGraphPage.jsx  # Graph visualization entry point
│   │   │   └── MonitoringPage.jsx # Simulated agent list
│   │   └── App.jsx              # Main React Router setup (Sidebar/Routes)
│   ├── .env.example
│   └── package.json
└── server/                      # Backend (Node.js/Express)
    ├── src/
    │   ├── controllers/         # Handles routing logic and exposes API data
    │   │   └── asset.controller.js 
    │   ├── routes/
    │   │   └── index.js         # Defines all API endpoints (/api/search, /api/assets/...)
    │   └── services/
    │       └── storyProtocol.service.js # Core business logic, API calls, data normalization, and recursive value flow calculation
    ├── .env.example
    └── package.json

🗺️ API Endpoints Summary
The backend exposes the following robust API routes (all prefixed with /api):

Method

Endpoint

Description

GET

/api/search

Performs text and media type search with client-side sorting.

GET

/api/assets/:id

Fetches full normalized detail (including licenses) for a single IP Asset.

GET

/api/assets/:id/remix-tree

Fetches multi-level, recursive derivative and parent data for graph visualization, including calculated value flow percentage per node.

GET

/api/assets/:id/analytics

Simulates fetching specific on-chain metrics (Royalty Split, Dispute Status).

GET

/api/monitor/agents

Simulates fetching a list of monitored IP assets.

⚙️ Setup and Configuration
Prerequisites
Node.js (v18 or newer)

npm or yarn

A valid API Key from the Story Protocol API.

1. Backend Setup (server)
Navigate to the server directory:

cd server

Install dependencies:

npm install

Configure Environment Variables (CRITICAL STEP):
Create a new file named .env inside the server/ directory.

Open .env and replace the placeholder with your actual Story Protocol API Key.

# Port for the backend server
PORT=3001

# Your API Key from Story Protocol (MUST BE VALID)
STORY_PROTOCOL_API_KEY="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 

2. Frontend Setup (client)
Navigate to the client directory:

cd client

Install dependencies (including D3.js and React Router):

npm install

Configure Environment Variables:
The client/.env.example already points to the default backend URL. Create a file named .env and ensure it contains:

VITE_API_BASE_URL="http://localhost:3001/api"

▶️ Running the Application
You need two separate terminal sessions to run the backend and frontend concurrently.

Start the Backend Server (Terminal 1):

cd server
npm run dev
# Console should display: Server is listening on port 3001

Start the Frontend App (Terminal 2):

cd client
npm run dev
# Console will display the VITE access URL (usually http://localhost:5173)

Open your browser to the frontend URL to start using the IP Asset Analyzer.