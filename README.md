# IPScope - IP Asset Analytics Platform

## 📋 Overview

IPScope is a comprehensive analytics platform for tracking and analyzing Intellectual Property (IP) assets on the Story Protocol blockchain. The platform provides detailed insights into royalty income, asset performance, derivative works, and licensing information with a clean, minimalist design and optimized performance.

## 🏗️ Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API
- **Routing**: React Router
- **Icons**: Lucide React
- **Accessibility**: WCAG 2.1 AA compliant
- **Port**: 5173/5174

### Backend (Node.js + Express)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Port**: 3001
- **API Integration**: Story Protocol API + StoryScan API
- **Performance**: Optimized with connection pooling and rate limiting
- **Caching**: Intelligent data caching for improved performance

## 🔌 API Integrations

### Story Protocol API
- **Base URL**: `https://api.storyapis.com/api/v4`
- **Endpoints Used**:
  - `/assets` - Fetch IP assets by owner
  - `/assets/{ipId}` - Get individual asset details
  - `/assets/edges` - Get derivative works (parent-child relationships)
  - `/transactions` - Get transaction history
  - `/disputes` - Get dispute information
  - `/licenses` - Get license information
  - `/royalty-policies` - Get royalty policy details

### StoryScan API
- **Base URL**: `https://www.storyscan.io/api/v2`
- **Endpoints Used**:
  - `/transactions` - Get detailed transaction data
  - `/tokens` - Get token information
  - `/prices` - Get price data for currency conversion

## 📁 Project Structure

```
IPScope/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── AssetTable.jsx
│   │   │   ├── LicenseCard.jsx
│   │   │   ├── RemixDetailModal.jsx
│   │   │   ├── ChildrenList.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── QuickStats.jsx
│   │   │   ├── OnChainAnalytics.jsx
│   │   │   ├── SkeletonComponents.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   ├── OptimisticUpdates.jsx
│   │   │   └── DetailRow.jsx
│   │   ├── pages/          # Main application pages
│   │   │   ├── ExplorerPage.jsx
│   │   │   └── AssetDetailPage.jsx
│   │   ├── utils/          # Utility functions
│   │   │   └── accessibility.js
│   │   ├── SearchContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── controllers/    # API route handlers
│   │   │   └── asset.controller.js
│   │   ├── services/       # Business logic and API integration
│   │   │   └── storyProtocol.service.js
│   │   ├── routes/         # API route definitions
│   │   │   └── index.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Story Protocol API key
- StoryScan API key(s)

### Environment Variables
Create `.env` file in the server directory:

```env
PORT
STORY_PROTOCOL_API_KEY=your_story_protocol_api_key
STORYSCAN_API_KEY=your_storyscan_api_key
```

**Note**: Multiple StoryScan API keys are supported for improved performance and rate limiting.

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd IPScope
```

2. **Install backend dependencies**
```bash
cd server
npm install
```

3. **Install frontend dependencies**
```bash
cd ../client
npm install
```

4. **Start the backend server**
```bash
cd ../server
npm start
```

5. **Start the frontend development server**
```bash
cd ../client
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🔧 API Endpoints

### Asset Management
- `GET /api/assets?owner={address}` - Get assets by owner
- `GET /api/assets/{ipId}` - Get asset details
- `GET /api/assets/{ipId}/children` - Get derivative works
- `GET /api/assets/{ipId}/royalty-transactions` - Get royalty transactions

### Analytics
- `GET /api/analytics/royalty` - Get royalty analytics
- `GET /api/analytics/portfolio` - Get portfolio statistics
- `GET /api/analytics/disputes` - Get dispute analytics

## 💡 Key Features Explained

### 1. Royalty Calculation
The platform calculates royalties by:
1. Fetching RoyaltyPaid events from Story Protocol
2. Aggregating transaction data from StoryScan
3. Converting currencies to WIP (Web3 IP)
4. Providing real-time analytics and trends

### 2. Asset Relationship Tracking
- **Parent Assets**: Original IP assets
- **Child Assets**: Derivative works created from parent assets
- **Descendants**: All levels of derivative works
- **Relationship Mapping**: Visual representation of IP asset hierarchy

### 3. License Information
- **PIL Terms**: Programmable IP License terms
- **Royalty Policies**: Automated royalty collection rules
- **Commercial Use**: Rights for commercial utilization
- **Derivatives**: Permission for creating derivative works
- **Transferability**: Asset ownership transfer rights

### 4. Performance Optimization
- **Batch Processing**: Parallel API calls for faster data retrieval
- **Rate Limiting**: Client-side and server-side rate limiting
- **Caching**: Intelligent data caching for improved performance
- **Pagination**: Efficient handling of large datasets

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test
```

### Frontend Testing
```bash
cd client
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🙏 Acknowledgments

- Story Protocol for the blockchain infrastructure
- StoryScan for transaction data
- React and Vite communities
- Open source contributors
- Tailwind CSS for the design system
- Lucide React for the icon library

---

**IPScope** - Empowering creators with comprehensive IP asset analytics and royalty tracking on the Story Protocol blockchain.

