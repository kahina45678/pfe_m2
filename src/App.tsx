import React from 'react';
import { Link, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Base from './components/Base';
import Quiz from './components/Quiz';
import Leaderboard from './components/Leaderboard';
import QuizCreator from './components/QuizCreator';
import QuizEditor from './components/QuizEditor';
import QuizList from './components/QuizList';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br flex flex-col">
      <header className="bg-[#E71722] text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo et titre (cliquables) */}
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => {
              if (user) {
                logout(); // Déconnecter l'utilisateur s'il est connecté
              }
              navigate('/'); // Rediriger vers /base
            }}
          >
            <Brain size={28} />
            <h1 className="text-2xl font-bold">QuizMaster</h1>
          </div>

          {/* Liens de navigation */}
          <nav>
            <ul className="flex space-x-6">
              {!user && (
                <>
                  <li>
                    <Link to="/login" className="hover:text-red-200 transition">Login</Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-red-200 transition">Register</Link>
                  </li>
                </>
              )}
              {user && (
                <>
                  <li>
                    <Link to="/home" className="hover:text-red-200 transition">Home</Link>
                  </li>
                  <li>
                    <Link to="/quizzes" className="hover:text-red-200 transition">Mes Quiz</Link>
                  </li>
                  <li>
                    <Link to="/leaderboard" className="hover:text-red-200 transition">Classement</Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 flex-grow">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Base />} />
          <Route path="/home" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/quizzes" element={<QuizList />} />
          <Route
            path="/quiz/:roomCode"
            element={
              <Quiz />
            }
          />
          <Route
            path="/quizzes/create"
            element={
              <ProtectedRoute>
                <QuizCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/edit/:quizId"
            element={
              <ProtectedRoute>
                <QuizEditor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <footer className="bg-[#E71722] text-white p-4 mt-auto">
        <div className="container mx-auto text-center">
          <p>© 2025 QuizMaster - Real-time Quiz Application</p>
        </div>
      </footer>
    </div>
  );
}

export default App;