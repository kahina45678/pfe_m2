import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaTrash } from 'react-icons/fa';

interface Quiz {
  id: number;
  title: string;
  description: string;
}

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    axios.get(`http://localhost:5000/api/quizzes?user_id=${user.id}`)
      .then(response => setQuizzes(response.data.quizzes))
      .catch(error => console.error("❌ Erreur lors du chargement des quiz :", error));
  }, [user]);

  const handleDeleteQuiz = async (quizId: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      console.log("✅ Quiz supprimé avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la suppression du quiz :", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-[#E71722] mb-4">My Quizzes</h2> {/* Nouvelle couleur */}

      {quizzes.length === 0 ? (
        <p className="text-gray-600">
          No quizzes found. 
          <Link to="/quizzes/create" className="text-[#E71722] underline hover:text-[#C1121F] ml-1 transition-colors">
            Create one?
          </Link>
        </p> 
      ) : (
        <ul>
          {quizzes.map(quiz => (
            <li key={quiz.id} className="border-b py-2 flex justify-between items-center">
              <div className="flex-1">
                <Link 
                  to={`/quizzes/edit/${quiz.id}`} 
                  className="text-[#E71722] font-medium hover:text-[#C1121F] hover:underline transition-colors"
                >
                  {quiz.title}
                </Link>
                <p className="text-gray-500 text-sm">{quiz.description}</p>
              </div>
              <button
                onClick={() => handleDeleteQuiz(quiz.id)}
                className="text-[#E71722] hover:text-[#C1121F] ml-4 transition-colors"
                title="Delete Quiz"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuizList;