import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import axios from 'axios';

interface AIQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const AIQuizModal: React.FC<AIQuizModalProps> = ({ isOpen, onClose, userId }) => {
  const [theme, setTheme] = useState('');
  const [type, setType] = useState('multiple_choice');
  const [difficulty, setDifficulty] = useState('easy');
  const [count, setCount] = useState(10);

  const handleSubmit = async () => {
    try {
      await axios.post('http://localhost:5000/api/quizzes/ai', {
        user_id: userId,
        theme,
        type,
        difficulty,
        count
      });
      onClose(); // Close the modal
    } catch (err) {
      console.error("Failed to create AI quiz", err);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
          <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={onClose}>
            <X />
          </button>
          <Dialog.Title className="text-2xl font-bold text-[#E71722] mb-4">Create Quiz with AI</Dialog.Title>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Theme</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full border px-3 py-2 rounded shadow-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Quiz Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border px-3 py-2 rounded shadow-sm">
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="open_ended">Open Ended</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border px-3 py-2 rounded shadow-sm">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Number of Questions</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full border px-3 py-2 rounded shadow-sm"
              />
            </div>

            <button
              onClick={handleSubmit}
              className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-4 rounded w-full"
            >
              Generate Quiz
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AIQuizModal;
