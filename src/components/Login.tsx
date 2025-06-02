import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaArrowRight } from 'react-icons/fa';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });

      // Animation de succès avant la navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      if (isMounted) {
        login(response.data.user);
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-[#E71722] p-6 text-center">
          <motion.h2
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-white"
          >
            Welcome Back!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/90 mt-2"
          >
            Sign in to continue to QuizMaster
          </motion.p>
        </div>

        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6"
            >
              <label htmlFor="username" className="block text-gray-700 text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#E71722] focus:ring-2 focus:ring-[#E71722]/50 transition-all duration-300"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-6"
            >
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#E71722] focus:ring-2 focus:ring-[#E71722]/50 transition-all duration-300"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-6 text-right"
            >
              <Link
                to="/forgot-password"
                className="text-sm text-[#E71722] hover:text-[#C1121F] transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center bg-gradient-to-r from-[#E71722] to-[#C1121F] text-white font-medium py-3 px-4 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:ring-offset-2 transition-all duration-300 shadow-md hover:shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Sign In <FaArrowRight className="ml-2" />
                  </span>
                )}
              </button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-8 pt-6 border-t border-gray-200"
          >
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#E71722] hover:text-[#C1121F] font-medium transition-colors"
              >
                Register here
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;