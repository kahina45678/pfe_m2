import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Upload } from 'lucide-react';
import axios from 'axios';
import DocNotification from './DocNotification';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onQuizCreated?: () => void; // Nouvelle prop pour le callback
}

const DocumentQuizModal: React.FC<Props> = ({ isOpen, onClose, userId, onQuizCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [theme, setTheme] = useState('general');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [qtype, setQtype] = useState('MCQ');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false); // Réinitialiser l'état de succès

    const formData = new FormData();
    formData.append('file', file);
    formData.append('theme', theme);
    formData.append('difficulty', difficulty);
    formData.append('count', count.toString());
    formData.append('qtype', qtype);
    formData.append('user_id', userId.toString());

    try {
      const response = await axios.post(
        'http://localhost:5000/api/quizzes/create-from-pdf',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setLoading(false);
        if (onQuizCreated) {
          onQuizCreated(); // Ceci devrait déclencher le rafraîchissement de la liste
        }
        setTimeout(() => {
          setFile(null);
          setTheme('general');
          setDifficulty('medium');
          setCount(5);
          setQtype('MCQ');
          setSuccess(false);
          onClose(); // Fermer le modal
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create quiz');
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>

              <div className="flex items-center mb-6">
                <FileText size={24} className="text-[#E71722] mr-2" />
                <h2 className="text-2xl font-bold text-[#E71722]">Create Quiz from Document</h2>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Document (PDF)</label>
                    <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
                      <Upload size={24} className="text-[#E71722] mb-2" />
                      <span className="text-sm text-gray-600">
                        {file ? file.name : 'Click to upload PDF'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Theme</label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                      required
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Number of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Question Type</label>
                    <select
                      value={qtype}
                      onChange={(e) => setQtype(e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-[#E71722] focus:border-transparent"
                      required
                    >
                      <option value="MCQ">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="Open">Open Questions</option>
                    </select>
                  </div>

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-red-300 transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Quiz'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DocNotification loading={loading} success={success} />
    </>
  );
};

export default DocumentQuizModal;