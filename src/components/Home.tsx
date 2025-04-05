import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LogOut, Users, Trophy, Play, Plus, BookOpen } from 'lucide-react';
import { io } from "socket.io-client";

interface Quiz {
  id: number;
  title: string;
  description: string;
}

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);
  
  const fetchQuizzes = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/quizzes?user_id=${user?.id}`);
      setQuizzes(response.data.quizzes);
      if (response.data.quizzes.length > 0) {
        setSelectedQuiz(response.data.quizzes[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }
  };
  
  const handleCreateRoom = async () => {
    if (!selectedQuiz) {
      setError('Please select a quiz first');
      return;
    }
  
    setError('');
    setLoading(true);
  
    try {
      const roomResponse = await axios.post('http://localhost:5000/api/rooms', {
        quiz_id: selectedQuiz,
        host_id: user?.id
      });
  
      const roomData = roomResponse.data.room;
      const socket = io('http://localhost:5000');
  
      socket.on('connect', () => {
        socket.emit('create_room', { 
          username: user?.username,
          quiz_id: selectedQuiz,
          room_code: roomData.room_code
        });
  
        socket.on('room_created', (data) => {
          navigate(`/quiz/${roomData.room_code}`, { state: { isHost: true, username: user?.username } });
        });
  
        socket.on('error', (data) => {
          setError(data.message);
          setLoading(false);
          socket.disconnect();
        });
      });
  
      socket.on('connect_error', () => {
        setError('Failed to connect to server');
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create room');
      setLoading(false);
    }
  };
  
  const handleJoinRoom = () => {
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    navigate(`/join/${joinRoomCode.trim()}`);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#E71722]">Welcome, {user?.username}!</h2> {/* Nouvelle couleur */}
          <button
            onClick={handleLogout}
            className="flex items-center bg-[#E71722] hover:bg-[#C1121F] text-white px-4 py-2 rounded transition-colors" 
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center"> {/* Nouvelle couleur */}
              <Play size={24} className="mr-2" />
              Host a Quiz
            </h3>
            <p className="text-gray-600 mb-4">
              Select one of your quizzes and create a room for others to join.
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Select Quiz
              </label>
              <select
                value={selectedQuiz || ''}
                onChange={(e) => setSelectedQuiz(Number(e.target.value))}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select a quiz</option>
                {quizzes.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCreateRoom}
                disabled={loading || !selectedQuiz}
                className="flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-red-300 transition-colors" 
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              
              <button
                onClick={() => navigate('/quizzes/create')}
                className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
          <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center">
            <BookOpen size={24} className="mr-2" />
            My Quizzes
          </h3>
          <p className="text-gray-600 mb-4">
            Manage your quizzes or create new ones.
          </p>
          <button
            onClick={() => navigate('/quizzes')}
            className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors w-full" 
          >
            View My Quizzes
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
          <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center">
            <Trophy size={24} className="mr-2" />
            Leaderboard
          </h3>
          <p className="text-gray-600 mb-4">
            Check out the top scores and see how you rank against other players.
          </p>
          <button
            onClick={() => navigate('/leaderboard')}
            className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors w-full" 
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;