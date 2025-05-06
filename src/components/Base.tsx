import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, Clock, Trophy, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const FeatureBox: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => {
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
      className="feature-box bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
    >
      <div className="text-[#E71722] mx-auto mb-4">{icon}</div>
      <h3 className="text-2xl font-semibold text-[#E71722] mb-4">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
};

const Base: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) {
      setError('Please enter a username and room code');
      return;
    }
    navigate(`/quiz/${roomCode.trim()}`, { state: { username } });
  };

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      {/* Hero Section with animated background */}
      <div 
        className="hero-section text-center py-32 w-full relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(to bottom right, rgba(231, 23, 34, 0.1), rgba(231, 23, 34, 0.05))'
        }}
      >
        {/* Animated floating elements */}
        <motion.div 
          className="absolute top-20 left-20 w-16 h-16 rounded-full bg-[#E71722] opacity-10"
          animate={{
            y: [0, 15, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-20 w-24 h-24 rounded-full bg-[#E71722] opacity-10"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
        
        <div className="container mx-auto relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold text-[#E71722] mb-6"
          >
            Bienvenue sur QuizMaster
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto"
          >
            Testez vos connaissances, créez des quiz et défiez vos amis en temps réel !
          </motion.p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openModal}
            className="bg-[#E71722] text-white py-3 px-8 rounded-lg hover:bg-[#C1121F] transition-colors text-lg font-semibold shadow-lg"
          >
            Jouer maintenant
          </motion.button>
        </div>
      </div>

      {/* Modal for joining a game */}
      {isModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-semibold text-[#E71722] mb-6 text-center">Rejoindre une partie</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  placeholder="Entrez votre nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Code de la salle</label>
                <input
                  type="text"
                  placeholder="Entrez le code de la salle"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                />
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}
              <button
                onClick={handleJoinRoom}
                className="w-full bg-[#E71722] text-white py-2 px-4 rounded-lg hover:bg-[#C1121F] transition-colors font-medium"
              >
                Rejoindre la partie
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Features Section */}
      <div className="features-section bg-white py-16 w-full">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-[#E71722] mb-12 text-center"
          >
            Pourquoi choisir QuizMaster ?
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureBox
              icon={<BookOpen size={40} />}
              title="Sujets variés"
              description="Explorez des quiz sur divers sujets pour élargir vos connaissances."
            />
            <FeatureBox
              icon={<Clock size={40} />}
              title="Temps limité"
              description="Défiez-vous avec des quiz chronométrés et améliorez votre rapidité."
            />
            <FeatureBox
              icon={<Trophy size={40} />}
              title="Classements"
              description="Affrontez les autres et voyez où vous vous situez dans le classement."
            />
          </div>
        </div>
      </div>

      {/* About Section with parallax effect */}
      <div 
        className="about-section bg-red-50 py-16 w-full relative overflow-hidden"
        style={{
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <div 
          className="absolute inset-0 bg-[url('src/img/question.jpg')] opacity-10 bg-cover bg-center"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-4">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="feature-box bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-3xl font-bold text-[#E71722] mb-6 text-center">À propos de QuizMaster</h2>
              <p className="text-gray-700 text-lg text-justify">
                QuizMaster est une plateforme où vous pouvez tester vos connaissances sur divers sujets et rivaliser avec d'autres. Que vous vous prépariez pour des examens ou que vous cherchiez simplement à vous amuser, QuizMaster a quelque chose pour vous.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-[#E71722] rounded-lg opacity-20 blur"></div>
                <img
                  src="src/img/question.jpg"
                  alt="À propos de QuizMaster"
                  className="rounded-lg shadow-md w-full max-w-md relative transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="w-full py-16 bg-gradient-to-r from-[#E71722] to-[#C1121F]">
        <div className="container mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-white mb-6"
          >
            Prêt à jouer ?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-white mb-8 max-w-2xl mx-auto"
          >
            Rejoignez une partie maintenant et testez vos connaissances !
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openModal}
            className="bg-white text-[#E71722] py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold shadow-lg"
          >
            Commencer
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Base;