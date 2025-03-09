import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Users, AlertCircle } from 'lucide-react';

const JoinQuiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (roomCode) {
      checkRoom();
    }
  }, [roomCode]);
  
  const checkRoom = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomCode}`);
      setRoomInfo(response.data.room);
      setLoading(false);
      
      // If user is logged in, auto-join
      if (user) {
        handleJoinRoom();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Room not found');
      setLoading(false);
    }
  };
  
  const handleJoinRoom = () => {
    if (!user) {
      navigate('/login', { state: { returnTo: `/join/${roomCode}` } });
      return;
    }
    
    navigate(`/quiz/${roomCode}`);
  };
  
  const handleLogin = () => {
    navigate('/login', { state: { returnTo: `/join/${roomCode}` } });
  };
  
  const handleRegister = () => {
    navigate('/register', { state: { returnTo: `/join/${roomCode}` } });
  };
  
  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-8"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
        <div className="flex justify-center mb-4 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Room Not Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
        >
          Go Home
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
      <div className="flex justify-center mb-4 text-red-800"> {/* Rouge foncé */}
        <Users size={48} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Quiz Room</h2>
      
      {roomInfo && (
        <div className="mb-6">
          <p className="text-gray-600">You're about to join:</p>
          <p className="text-xl font-semibold text-red-800 mt-2">{roomInfo.quiz_title}</p> {/* Rouge foncé */}
          <div className="bg-red-50 p-3 rounded-lg mt-4"> {/* Rouge clair */}
            <p className="text-sm text-gray-700">Room Code: <span className="font-mono font-bold">{roomCode}</span></p>
          </div>
        </div>
      )}
      
      {user ? (
        <button
          onClick={handleJoinRoom}
          className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline" 
        >
          Join Quiz
        </button>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">You need to be logged in to join this quiz</p>
          <div className="flex space-x-4">
            <button
              onClick={handleLogin}
              className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
            >
              Login
            </button>
            <button
              onClick={handleRegister}
              className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
            >
              Register
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinQuiz;