import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, Clock, Trophy } from 'lucide-react';

const Base: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');

    const handleJoinRoom = () => {
        if (!username.trim() || !roomCode.trim()) {
            setError('Please enter a username and room code');
            return;
        }
        navigate(`/quiz/${roomCode.trim()}`, { state: { username } });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
            {/* Hero Section */}
            <div className="hero-section text-center py-20">
                <div className="container mx-auto">
                    <h1 className="text-5xl font-bold text-[#E71722] mb-6">Bienvenue sur QuizMaster</h1>
                    <p className="text-xl text-gray-700 mb-8">
                        Testez vos connaissances, créez des quiz et défiez vos amis en temps réel !
                    </p>
                    <div className="space-x-4">
                        <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                            <h3 className="text-xl font-semibold text-[#E71722] mb-4">Rejoindre une partie</h3>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
                            />
                            <input
                                type="text"
                                placeholder="Enter room code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
                            />
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-2" role="alert">
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}
                            <button
                                onClick={handleJoinRoom}
                                className="bg-[#E71722] text-white py-2 px-4 rounded-lg hover:bg-[#C1121F] transition-colors"
                            >
                                Rejoindre
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="features-section bg-white py-16 w-full">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <BookOpen size={40} className="text-[#E71722] mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-[#E71722] mb-4">Sujets variés</h3>
                            <p className="text-gray-600">
                                Explorez des quiz sur divers sujets pour élargir vos connaissances.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <Clock size={40} className="text-[#E71722] mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-[#E71722] mb-4">Temps limité</h3>
                            <p className="text-gray-600">
                                Défiez-vous avec des quiz chronométrés et améliorez votre rapidité.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center">
                            <Trophy size={40} className="text-[#E71722] mx-auto mb-4" />
                            <h3 className="text-2xl font-semibold text-[#E71722] mb-4">Classements</h3>
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
                            <h2 className="text-3xl font-bold text-[#E71722] mb-6 text-center">À propos de QuizMaster</h2>
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