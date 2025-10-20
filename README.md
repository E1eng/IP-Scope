# IPScope - IP Asset Analytics Platform

## 📋 Overview

IPScope is a comprehensive analytics platform for tracking and analyzing Intellectual Property (IP) assets on the Story Protocol blockchain. The platform provides detailed insights into royalty income, asset performance, derivative works, and licensing information with a clean, minimalist design and optimized performance.

## ✨ Recent Updates

- **Code Cleanup**: Removed all unused imports, dead code, and console.log statements
- **Performance Optimization**: Optimized API calls and data processing
- **UI/UX Improvements**: Implemented minimalist design with consistent spacing and typography
- **Mobile Responsiveness**: Enhanced mobile layout for all components
- **Accessibility**: Added WCAG 2.1 AA compliance features
- **Production Ready**: Clean, maintainable codebase ready for deployment

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
- **Rate Limiting**: 5-8 RPS per API key with dynamic worker pools

## 🚀 Features

### 1. Asset Search & Discovery
- Search IP assets by creator address
- Display asset cards with key information
- Real-time search with pagination
- Asset filtering and sorting
- Responsive design for all screen sizes
- Skeleton loading states for better UX

### 2. Royalty Analytics
- **Total Royalty Earned**: Aggregate royalty income across all assets
- **Top Performing Assets**: Ranked by royalty earnings
- **Top Licensees**: Users who paid the most royalties
- **Royalty Trends**: Historical royalty income analysis
- **Currency Support**: WIP (Web3 IP) currency with real-time conversion
- **Multi-Currency Display**: Support for multiple currencies in royalty breakdown
- **Optimized Performance**: Fast loading for large datasets (1000+ transactions)

### 3. Asset Details Modal
- **Asset Information**: Title, description, creator, media type
- **License & Royalty Info**: PIL terms, royalty policies, commercial use rights
- **Derivative Works**: Direct children and total descendants
- **Royalty Ledger**: Transaction history with detailed breakdowns
- **Top Licensees**: Users who licensed the asset
- **Responsive Design**: Mobile-optimized layout with proper text truncation
- **Accessibility**: Keyboard navigation and screen reader support

### 4. Portfolio Analytics
- **Quick Stats**: Total assets, royalty earned, transactions, disputes
- **Performance Metrics**: Average earnings per asset
- **Asset Distribution**: Media type breakdown
- **Revenue Tracking**: Historical income trends

### 5. Derivative Works Management
- **Children List**: Paginated list of direct derivative works
- **Load More**: Efficient pagination for large datasets
- **Relationship Tracking**: Parent-child IP asset relationships
- **Count Display**: Accurate derivative works counting
- **Clean Design**: Minimalist layout following royalty ledger pattern
- **Mobile Responsive**: Optimized layout for mobile devices

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
STORY_PROTOCOL_API_KEY=your_story_protocol_api_key
STORYSCAN_API_KEY=your_storyscan_api_key
STORYSCAN_API_KEY_2=your_second_storyscan_api_key
STORYSCAN_API_KEY_3=your_third_storyscan_api_key
STORYSCAN_API_KEY_4=your_fourth_storyscan_api_key
STORYSCAN_API_KEY_5=your_fifth_storyscan_api_key
STORYSCAN_API_KEY_6=your_sixth_storyscan_api_key
STORYSCAN_API_KEY_7=your_seventh_storyscan_api_key
STORYSCAN_API_KEY_8=your_eighth_storyscan_api_key
STORYSCAN_API_KEY_9=your_ninth_storyscan_api_key
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

## 🎨 UI/UX Features

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements

### Design System
- **Color Palette**: Minimalist design with gray tones and indigo accent
- **Typography**: Consistent 8px base scale (text-xs to text-4xl)
- **Spacing**: Consistent 4px base scale (space-1 to space-12)
- **Transitions**: Smooth 0.3s cubic-bezier animations
- **Accessibility**: WCAG 2.1 AA compliant with proper contrast ratios

### Interactive Elements
- Hover effects and transitions
- Skeleton loading states for better UX
- Modal dialogs for detailed views
- Tabbed interfaces for organized content
- Keyboard navigation support
- Screen reader compatibility

## 🔍 Data Flow

1. **User Input**: Creator address entered in search field
2. **Asset Fetching**: Backend queries Story Protocol API for assets
3. **Royalty Calculation**: StoryScan API provides transaction details
4. **Data Aggregation**: Backend processes and aggregates data
5. **Frontend Display**: React components render the analytics
6. **Real-time Updates**: Data refreshes automatically

## 🚀 Performance Features

### API Optimization
- **Parallel Processing**: Multiple API calls executed simultaneously
- **Connection Pooling**: HTTP keep-alive for better performance
- **Rate Limiting**: Dynamic rate limiting with 5-8 RPS per API key
- **Worker Pools**: Dynamic worker configuration based on dataset size
- **Caching**: Intelligent data caching with TTL support
- **Error Handling**: Graceful fallbacks for failed requests

### Frontend Optimization
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.useMemo for expensive calculations
- **Skeleton Loading**: Better perceived performance
- **Debounced Search**: Prevents excessive API calls
- **Code Splitting**: Optimized bundle sizes
- **Accessibility**: WCAG 2.1 AA compliance

## 📊 Analytics Dashboard

### Quick Stats
- Total Assets Count
- Royalty Earned (WIP)
- Total Transactions
- Active Disputes

### Detailed Analytics
- Top Performing Assets
- Revenue Trends
- Licensee Analysis
- Derivative Works Tracking

## 🔒 Security Features

- API key management
- Rate limiting protection
- Input validation
- Error handling and logging
- CORS configuration
- XSS protection
- CSRF protection

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

## 📈 Future Enhancements

- [ ] Real-time notifications
- [ ] Advanced filtering options
- [ ] Export functionality
- [ ] Mobile app development
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard
- [ ] Social features
- [ ] API documentation
- [ ] Dark/Light theme toggle
- [ ] Advanced search filters
- [ ] Data visualization charts
- [ ] Bulk operations

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

## 📊 Code Quality

- **Clean Code**: No unused imports, dead code, or console.log statements
- **Production Ready**: Optimized for performance and maintainability
- **Accessibility**: WCAG 2.1 AA compliant
- **Responsive**: Mobile-first design approach
- **Type Safety**: Proper error handling and validation

