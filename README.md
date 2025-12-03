# Synq

A real-time chat application built with Bun, React, Express, Socket.io, and MongoDB.

## 🚀 Tech Stack

### Backend

- **Runtime:** Bun
- **Framework:** Express 5
- **Real-time:** Socket.io 4.8
- **Database:** MongoDB (Mongoose 9)
- **Auth:** Custom hand-rolled authentication

### Frontend

- **Framework:** React 18
- **Build Tool:** Vite 7
- **Real-time:** Socket.io-client
- **Styling:** TailwindCSS

## 📁 Project Structure

Synq/
├── backend/
│ ├── server.js
│ └── src/
│ ├── config/ # Database connection
│ ├── models/ # Mongoose schemas
│ ├── routes/ # REST API routes
│ ├── sockets/ # Socket.io handlers
│ └── utils/ # Helper functions
└── FE/
├── src/
└── public/

## 🛠️ Setup & Installation

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- MongoDB Atlas account or local MongoDB

### Backend Setup

cd backend
bun install

Create `.env` file in `backend/`:

MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000

Run backend:

bun dev

### Frontend Setup

cd FE
bun install

Run frontend:

bun dev

Frontend will run on `http://localhost:5173`

## 🎯 Features (Planned)

- [x] Project structure setup
- [ ] User authentication (username-based initially)
- [ ] 1-to-1 real-time messaging
- [ ] Message history persistence
- [ ] Online/offline status
- [ ] Typing indicators
- [ ] Group chats
- [ ] Read receipts
- [ ] File/image sharing

## 📝 Development Roadmap

### Phase 1: Core Backend

- Express + Socket.io server
- MongoDB connection
- Basic message model
- 1-to-1 chat logic with room-per-pair

### Phase 2: Core Frontend

- React UI for chat
- Socket.io-client integration
- Basic chat interface

### Phase 3: Auth & Enhancement

- User authentication
- Persistent sessions
- UI/UX improvements

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
