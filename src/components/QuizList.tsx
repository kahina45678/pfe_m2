import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaTrash, FaSearch } from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';

interface Quiz {
  id: number;
  title: string;
  description: string;
}

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState<string[]>([]);
  const { user } = useAuth();
  // États pour la notification de traduction
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationSuccess, setTranslationSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const quizzesPerPage = 5;
  const indexOfLastQuiz = currentPage * quizzesPerPage;
  const indexOfFirstQuiz = indexOfLastQuiz - quizzesPerPage;
  const currentQuizzes = quizzes.slice(indexOfFirstQuiz, indexOfLastQuiz);
  const totalPages = Math.ceil(quizzes.length / quizzesPerPage);


  const fetchQuizzes = () => {
    if (!user) return;

    console.log("📡 Fetching quizzes for user:", user.id);
    axios.get(`http://localhost:5000/api/quizzes?user_id=${user.id}`)
      .then(response => {
        console.log("✅ Quizzes loaded:", response.data);
        setQuizzes(response.data.quizzes);
      })
      .catch(error => console.error("❌ Error loading quizzes:", error));
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user]);


  // Reset le succès de la traduction après 3 secondes
  useEffect(() => {
    if (translationSuccess) {
      const timer = setTimeout(() => {
        setTranslationSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [translationSuccess]);

  const handleDeleteQuiz = async (quizId: number) => {
    try {
      console.log("🗑️ Deleting quiz:", quizId);
      await axios.delete(`http://localhost:5000/api/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      console.log("✅ Quiz deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting quiz:", error);
    }
  };

  const handleToggleMenu = (quizId: number) => {
    setOpenMenuId(prev => (prev === quizId ? null : quizId));
  };

  const handleSearch = async () => {
    if (!user) return;

    console.log("🔍 Starting search with:", {
      searchTerm,
      searchFilters,
      userId: user.id
    });

    try {
      const response = await axios.post<{ results: Quiz[] }>('http://localhost:5000/api/quizzes/mr', {
        query: searchTerm,
        filters: searchFilters,
        user_id: user.id
      });

      console.log("📊 Search response:", {
        status: response.status,
        data: response.data
      });

      setQuizzes(response.data.results);
      console.log("🔎 Search results:", response.data.results);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("❌ Axios error:", {
          message: err.message,
          code: err.code,
          response: err.response?.data,
          status: err.response?.status
        });
      } else if (err instanceof Error) {
        console.error("❌ Unexpected error:", err.message);
      } else {
        console.error("❌ Unknown error occurred:", err);
      }
    }
  };

  const handleTranslate = (quizId: number) => {
    setIsTranslating(true);
    setTranslationSuccess(false);

    console.log("🌐 Translating quiz:", quizId);
    fetch('http://localhost:5000/api/quizzes/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Translation successful:", data);
        setIsTranslating(false);
        setTranslationSuccess(true);
      })
      .catch(err => {
        console.error("❌ Translation error:", err);
        setIsTranslating(false);
        alert("Translation error.");
      });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg relative">
      {/* Notification de traduction */}
      <AnimatePresence>
        {(isTranslating || translationSuccess) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 bg-white border border-red-300 shadow-lg rounded-xl px-6 py-4 z-50 w-80"
          >
            {isTranslating && (
              <div className="flex items-center space-x-3">
                <Loader2 className="animate-spin text-[#E71722]" />
                <span className="text-sm text-gray-700">Translating quiz, please wait...</span>
              </div>
            )}

            {translationSuccess && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-500" />
                <span className="font-medium text-green-700">Quiz translated successfully!</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#E71722]">My Quizzes</h2>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-[#E71722] hover:text-[#C1121F] transition-colors"
          title="Search"
        >
          <FaSearch size={20} />
        </button>
      </div>

      {showSearch && (
        <div className="mb-6 bg-gray-50 p-4 rounded shadow-inner">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded mb-2"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />

          <div className="mb-2 text-gray-700 font-medium">Search in:</div>
          <div className="flex gap-4 flex-wrap mb-2">
            {["all", "questions", "titles", "descriptions"].map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={searchFilters.includes(option)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const value = e.target.value;
                    setSearchFilters(prev =>
                      checked ? [...prev, value] : prev.filter(f => f !== value)
                    );
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          <button
            className="px-4 py-2 bg-[#E71722] text-white rounded hover:bg-[#C1121F] transition-colors"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      )}

      {quizzes.length === 0 ? (
        <p className="text-gray-600">
          No quizzes found.
          <Link to="/quizzes/create" className="text-[#E71722] underline hover:text-[#C1121F] ml-1 transition-colors">
            Create one?
          </Link>
        </p>
      ) : (
        <ul>
          <motion.ul layout className="grid gap-4">
            {currentQuizzes.map(quiz => (
              <motion.li
                key={quiz.id}
                whileHover={{ scale: 1.02, y: -3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="bg-red-50 border border-red-100 rounded-xl p-5 shadow hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <Link
                      to={`/quizzes/edit/${quiz.id}`}
                      className="text-xl font-bold text-[#E71722] hover:underline"
                    >
                      {quiz.title}
                    </Link>
                    <p className="text-gray-600 mt-1">{quiz.description}</p>
                  </div>

                  <div className="flex items-center ml-4 space-x-2">
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-[#E71722] hover:text-[#C1121F]"
                      title="Delete Quiz"
                    >
                      <FaTrash />
                    </button>

                    <button
                      onClick={() => handleTranslate(quiz.id)}
                      title="Translate quiz"
                      className="text-gray-600 hover:text-[#E71722] transition-colors"
                    >
                      🌍
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>

        </ul>
      )}
      <div className="flex justify-center items-center mt-6 space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-4 py-2 bg-[#E71722] text-white rounded disabled:bg-red-300"
        >
          Previous
        </button>
        <span className="font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-4 py-2 bg-[#E71722] text-white rounded disabled:bg-red-300"
        >
          Next
        </button>
      </div>

    </div>

  );

};

export default QuizList;