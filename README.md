# QuizMaster - Real-time Quiz Application

A full-stack real-time quiz application built with React, Flask, Flask-SocketIO, and SQLite.

## Features

- User authentication (register/login)
- Real-time quiz gameplay with Socket.IO
- Create and join quiz rooms
- Multiple choice questions with timer
- Live scoring system
- Leaderboard to track top scores

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Socket.IO client for real-time communication
- React Router for navigation

### Backend
- Flask for the web server
- Flask-SocketIO for real-time communication
- SQLite for database storage

## Getting Started

### Prerequisites
- Node.js
- Python 3.7+

### Installation

1. Install frontend dependencies:
```
npm install
```

2. Install backend dependencies:
```
pip install -r requirements.txt
```

### Running the Application

1. Start the Flask backend server:
```
npm run server
```

2. In a separate terminal, start the React frontend:
```
npm run dev
```

3. Open your browser and navigate to the URL shown in your terminal (typically http://localhost:5173)

## How to Play

1. Register an account or login
2. Create a new quiz room or join an existing one with a room ID
3. The host can start the quiz when all players have joined
4. Answer questions within the time limit
5. View your score and ranking at the end of the quiz
6. Check the leaderboard to see top scores

## Project Structure

- `/src` - React frontend code
- `/server` - Flask backend code
- `quiz.db` - SQLite database file (created on first run)