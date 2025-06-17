import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LogOut, Users, Trophy, Play, Plus, BookOpen, FileText } from 'lucide-react';
import { io } from "socket.io-client";
import AIQuizModal from '../components/AIQuizModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import DocumentQuizModal from '../components/DocumentQuizModal';

interface Quiz {
  id: number;
  title: string;
  description: string;
}

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}> = ({ icon, title, description, buttonText, onClick }) => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-md overflow-hidden p-8 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center text-[#E71722] mb-4">
        {icon}
        <h3 className="text-xl font-semibold ml-2">{title}</h3>
      </div>
      <p className="text-gray-600 mb-6">{description}</p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors w-full"
      >
        {buttonText}
      </motion.button>
    </motion.div>
  );
};

const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden p-8 mb-8 relative"
      >
        {/* Floating decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full opacity-20 -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-200 rounded-full opacity-20 -ml-12 -mb-12"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-bold text-[#E71722] mb-4 md:mb-0"
            >
              Welcome back, <span className="text-red-600">{user?.username}</span>!
            </motion.h2>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center bg-[#E71722] hover:bg-[#C1121F] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </motion.button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 overflow-hidden"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Host Quiz Section */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-100"
            >
              <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center">
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
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                >
                  <option value="">Select a quiz</option>
                  {quizzes.map(quiz => (
                    <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={loading || !selectedQuiz}
                  className="flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-red-300 transition-colors shadow-md"
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </motion.button>


              </div>
            </motion.div>

            {/* Create Quiz Section */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-100"
            >
              <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center">
                <Plus size={24} className="mr-2" />
                Create New Quiz
              </h3>
              <p className="text-gray-600 mb-4">
                Choose how you want to create your quiz
              </p>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/quizzes/create')}
                  className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors w-full shadow-md"
                >
                  Create Manually
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAIModal(true)}
                  className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors w-full shadow-md"
                >
                  Create with AI
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDocumentModal(true)}
                  className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors w-full shadow-md"
                >
                  Create from Document
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <FeatureCard
          icon={<BookOpen size={24} />}
          title="My Quizzes"
          description="Manage your quizzes or create new ones."
          buttonText="View My Quizzes"
          onClick={() => navigate('/quizzes')}
        />



        <FeatureCard
          icon={<FileText size={24} />}
          title="Game Reports"
          description="View detailed statistics and analysis of your past games."
          buttonText="View Reports"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Join Room Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowJoinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >

              </button>

              <h3 className="text-2xl font-semibold text-[#E71722] mb-6 text-center">Join a Quiz Room</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Room Code</label>
                  <input
                    type="text"
                    placeholder="Enter the room code"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinRoom}
                  className="w-full bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  Join Room
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Quiz Modal */}
      {user && (
        <AIQuizModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          userId={user.id}
        />
      )}
      {user && (
        <DocumentQuizModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Home;