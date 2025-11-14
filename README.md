# Clash Idle Game

A 2D idle game inspired by Clash of Clans featuring 3D-looking buildings. Built with real-time multiplayer functionality using WebSockets.

## Technologies Used

- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO
- **Frontend**: HTML/CSS/JavaScript (served statically)

## Features

- Real-time game state synchronization
- Multiplayer support
- Idle game mechanics
- 3D-styled building graphics

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. For development with auto-reload:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## Network Access

The server is configured to accept connections on all network interfaces, allowing you to access the game from other devices on your local network at `http://[your-local-ip]:3000`.
