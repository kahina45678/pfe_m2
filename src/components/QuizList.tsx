import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaTrash } from 'react-icons/fa'; // Import de l'icône de poubelle

interface Quiz {
  id: number;
  title: string;
  description: string;
}

const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return; // Sécurité : ne fait rien si l'utilisateur n'est pas connecté

    axios.get(`http://localhost:5000/api/quizzes?user_id=${user.id}`)
      .then(response => setQuizzes(response.data.quizzes))
      .catch(error => console.error("❌ Erreur lors du chargement des quiz :", error));
  }, [user]);

  const handleDeleteQuiz = async (quizId: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/quizzes/${quizId}`);
      // Mettre à jour l'état local en supprimant le quiz supprimé
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      console.log("✅ Quiz supprimé avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la suppression du quiz :", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-red-800 mb-4">My Quizzes</h2> {/* Rouge foncé */}

      {quizzes.length === 0 ? (
        <p className="text-gray-600">No quizzes found. <Link to="/quizzes/create" className="text-red-700 underline">Create one?</Link></p> 
      ) : (
        <ul>
          {quizzes.map(quiz => (
            <li key={quiz.id} className="border-b py-2 flex justify-between items-center">
              <div className="flex-1">
                <Link to={`/quizzes/edit/${quiz.id}`} className="text-red-800 font-medium hover:underline"> {/* Rouge foncé */}
                  {quiz.title}
                </Link>
                <p className="text-gray-500 text-sm">{quiz.description}</p>
              </div>
              <button
                onClick={() => handleDeleteQuiz(quiz.id)}
                className="text-red-600 hover:text-red-800 ml-4"
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