import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, BookOpen, Clock, Trophy } from 'lucide-react';

const Base: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-100 to-red-200">
            {/* Hero Section */}
            <div className="hero-section text-center py-20">
                <div className="container mx-auto">
                    <h1 className="text-5xl font-bold text-red-800 mb-6">Bienvenue sur QuizMaster</h1>
                    <p className="text-xl text-gray-700 mb-8">
                        Testez vos connaissances, créez des quiz et défiez vos amis en temps réel !
                    </p>
                    <div className="space-x-4">
                        <button
                            onClick={() => navigate('/join')}
                            className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Rejoindre une partie
                        </button>
                        {!user && (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Créer une partie
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="features-section bg-white py-16 w-full">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <BookOpen size={40} className="text-red-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-red-800 mb-4">Sujets variés</h3>
                            <p className="text-gray-600">
                                Explorez des quiz sur divers sujets pour élargir vos connaissances.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <Clock size={40} className="text-red-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-red-800 mb-4">Temps limité</h3>
                            <p className="text-gray-600">
                                Défiez-vous avec des quiz chronométrés et améliorez votre rapidité.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <Trophy size={40} className="text-red-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-red-800 mb-4">Classements</h3>
                            <p className="text-gray-600">
                                Affrontez les autres et voyez où vous vous situez dans le classement.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className="about-section bg-red-50 py-16 w-full">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                            <h2 className="text-3xl font-bold text-red-800 mb-6 text-center">À propos de QuizMaster</h2>
                            <p className="text-gray-700 text-lg text-justify">
                                QuizMaster est une plateforme où vous pouvez tester vos connaissances sur divers sujets et rivaliser avec d'autres. Que vous vous prépariez pour des examens ou que vous cherchiez simplement à vous amuser, QuizMaster a quelque chose pour vous.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <img
                                src="src/img/question.jpg" // Remplacez par le chemin de votre image
                                alt="À propos de QuizMaster"
                                className="rounded-lg shadow-md w-full max-w-md"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Base;