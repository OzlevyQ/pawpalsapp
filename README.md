# 🐕 PawPals - Dog Park Management Platform

A comprehensive platform for dog park management, community engagement, and pet owner services.

## 🌟 Features

### 📱 Mobile Application (React Native + Expo)
- **User Authentication** - Secure login and registration
- **Dog Management** - Add, edit, and manage your dogs' profiles
- **QR Check-in System** - Quick check-in to dog parks using QR codes
- **Real-time Notifications** - WebSocket + Push notifications for events, messages, and updates
- **Park Discovery** - Find nearby dog parks with maps integration
- **Social Features** - Friend requests, messaging, and community interaction
- **Events System** - Join and create dog park events
- **Multi-language Support** - Hebrew and English with RTL/LTR support
- **Dark/Light Theme** - Customizable UI themes

### 🖥️ Backend API (Node.js + Express + MongoDB)
- **RESTful API** - Comprehensive REST endpoints
- **Real-time Communication** - WebSocket support for live updates
- **Push Notifications** - Expo Push Notifications integration
- **Garden Management** - Dog park/garden CRUD operations
- **Event Management** - Event creation, registration, and management
- **User Management** - Profile management, friendships, messaging
- **Visit Tracking** - Check-in/check-out system with analytics
- **Notification System** - Multi-channel notification delivery
- **Admin Panel** - Management tools for administrators

### 🌐 Web Frontend (Vue.js + Capacitor)
- **Progressive Web App** - Cross-platform web application
- **Admin Dashboard** - Management interface
- **Public Garden Profiles** - Customizable garden pages
- **Analytics Dashboard** - Usage statistics and insights

## 🏗️ Architecture

```
DogPark/
├── PawPalsMobile/          # React Native Mobile App
├── backend/                # Node.js API Server
├── frontend/              # Vue.js Web App
└── PawPalsWeb#donttouch/  # Legacy Web Components
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Expo CLI
- iOS Simulator / Android Emulator (for mobile development)

### Mobile App Setup
```bash
cd PawPalsMobile
npm install
cp .env.example .env  # Configure your environment variables
npx expo start
```

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure your MongoDB and services
npm start
```

### Web Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Configure your API endpoints
npm run dev
```

## 📋 Key Components

### Mobile Application Features
- **QR Scanner** - Camera-based QR code scanning for park check-ins
- **Real-time Notifications** - WebSocket integration with push notifications
- **Maps Integration** - Google Maps for park discovery
- **Multi-dog Support** - Manage multiple dogs per user
- **Social Networking** - Friend system and messaging
- **Event Management** - Join and create park events
- **Visit History** - Track your park visits and statistics

### Backend Features
- **Authentication System** - JWT-based authentication
- **WebSocket Server** - Real-time communication
- **Push Notification Service** - Expo push notifications
- **MongoDB Integration** - Full CRUD operations
- **Email Service** - Automated email notifications
- **File Upload System** - Image handling for profiles
- **Admin Tools** - User and content management

### Notification System
- **Multi-channel Delivery** - WebSocket, Push, and Email
- **Smart Routing** - Automatic navigation based on notification type
- **Background Processing** - Queue-based notification processing
- **Template System** - Customizable notification templates

## 🔧 Configuration

### Environment Variables
Each component requires environment configuration:

**Mobile App (.env)**
```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_WEBSOCKET_URL=ws://localhost:5000/notifications-ws
ENABLE_TEST_NOTIFICATIONS=true
```

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/dogpark
JWT_SECRET=your_jwt_secret
EXPO_ACCESS_TOKEN=your_expo_access_token
```

## 🧪 Testing

### Mobile App Testing
```bash
cd PawPalsMobile
npm test
npx expo start --tunnel  # For testing on physical devices
```

### Backend Testing
```bash
cd backend
npm test
npm run test:notifications  # Test notification system
```

## 📱 QR Check-in System

The QR check-in system allows users to quickly check into dog parks:

1. **QR Code Format**: `https://www.pawpals.yadbarzel.info/garden/{gardenId}`
2. **Scanning Process**: Camera-based QR scanning with validation
3. **Check-in Flow**: Automatic check-in for single-dog users, modal selection for multi-dog users
4. **Error Handling**: Toast notifications for invalid codes or network errors

## 🔔 Notification System

Multi-layered notification system:

1. **WebSocket**: Real-time in-app notifications
2. **Push Notifications**: Native mobile notifications via Expo
3. **Email**: Important updates and newsletters
4. **Smart Navigation**: Automatic routing based on notification type

### Notification Types
- New messages
- Friend requests
- Event reminders
- Garden updates
- System announcements

## 🌍 Internationalization

Full support for Hebrew and English:
- RTL (Right-to-Left) layout for Hebrew
- Complete translation coverage
- Dynamic language switching
- Localized date/time formatting

## 🎨 Theming

Comprehensive theme system:
- Light and dark modes
- Customizable color schemes
- Consistent design tokens
- Responsive layouts

## 📊 Analytics & Statistics

- User engagement tracking
- Park visit analytics
- Event participation metrics
- System performance monitoring

## 🔐 Security

- JWT authentication
- API rate limiting
- Input validation and sanitization
- Secure file upload handling
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Expo team for the excellent React Native framework
- MongoDB team for the robust database solution
- Vue.js community for the web framework
- All contributors and beta testers

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation in each component's directory

---

**Built with ❤️ for the dog-loving community**