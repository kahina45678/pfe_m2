import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Trash, Save, ArrowLeft, Clock, Award } from 'lucide-react';

interface QuestionForm {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit: number;
  points: number;
  type: 'qcm' | 'true_false';  // Nouveau champ
}

const emptyQuestion: QuestionForm = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: '',
  time_limit: 15,
  points: 10,
  type: 'qcm'  // Valeur par défaut
};

const QuizCreator: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setCurrentQuestion(questions.length);
  };
  
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError('Quiz must have at least one question');
      return;
    }
    
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    
    if (currentQuestion >= newQuestions.length) {
      setCurrentQuestion(newQuestions.length - 1);
    }
  };
  
  const updateQuestion = (field: keyof QuestionForm, value: string | number) => {
    const updatedQuestions = [...questions];
    const currentQ = updatedQuestions[currentQuestion];
  
    if (field === 'type') {
      if (value === 'true_false') {
        // Définir automatiquement les options pour Vrai/Faux
        currentQ.option_a = 'Vrai';
        currentQ.option_b = 'Faux';
        currentQ.option_c = '';
        currentQ.option_d = '';
        currentQ.correct_answer = ''; // Réinitialiser la bonne réponse
      } else {
        // Réinitialiser les options pour QCM
        currentQ.option_a = '';
        currentQ.option_b = '';
        currentQ.option_c = '';
        currentQ.option_d = '';
        currentQ.correct_answer = '';
      }
    }
  
    updatedQuestions[currentQuestion] = {
      ...currentQ,
      [field]: value,
    };
    setQuestions(updatedQuestions);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
  
    // Validation
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }
  
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
  
      // Vérifier les champs obligatoires pour toutes les questions
      if (!q.question.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.correct_answer) {
        setError(`Question ${i + 1} is incomplete`);
        setCurrentQuestion(i);
        return;
      }
  
      // Pour les QCM uniquement, vérifier les options C et D
      if (q.type === 'qcm' && (!q.option_c.trim() || !q.option_d.trim())) {
        setError(`Question ${i + 1} is incomplete`);
        setCurrentQuestion(i);
        return;
      }
    }
  
    setLoading(true);
  
    try {
      const response = await axios.post('http://localhost:5000/api/quizzes', {
        title,
        description,
        user_id: user?.id,
        questions: questions.map((q) => ({
          ...q,
          option_c: q.type === 'true_false' ? '' : q.option_c, // Option C vide pour Vrai/Faux
          option_d: q.type === 'true_false' ? '' : q.option_d, // Option D vide pour Vrai/Faux
        })),
      });
  
      navigate('/quizzes');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create quiz');
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/quizzes')}
          className="mr-4 text-red-800 hover:text-red-900" 
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-bold text-red-800">Create New Quiz</h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Quiz Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter quiz title"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter quiz description"
            rows={3}
          />
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Questions</h3>
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              <Plus size={16} className="mr-1" />
              Add Question
            </button>
          </div>
          
          <div className="flex mb-4 overflow-x-auto pb-2">
            {questions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentQuestion(index)}
                className={`flex items-center justify-center min-w-[40px] h-10 mx-1 rounded-full ${
                  currentQuestion === index 
                    ? 'bg-red-800 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg">Question {currentQuestion + 1}</h4>
              <button
                type="button"
                onClick={() => removeQuestion(currentQuestion)}
                className="flex items-center text-red-600 hover:text-red-800"
                title="Remove Question"
              >
                <Trash size={18} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Question Type
              </label>
              <select
                value={questions[currentQuestion].type}
                onChange={(e) => updateQuestion('type', e.target.value as 'qcm' | 'true_false')}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="qcm">QCM</option>
                <option value="true_false">Vrai/Faux</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Question Text
              </label>
              <input
                type="text"
                value={questions[currentQuestion].question}
                onChange={(e) => updateQuestion('question', e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your question"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Option A
                </label>
                <input
                  type="text"
                  value={questions[currentQuestion].type === 'true_false' ? 'Vrai' : questions[currentQuestion].option_a}
                  onChange={(e) => updateQuestion('option_a', e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Option A"
                  required
                  disabled={questions[currentQuestion].type === 'true_false'}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Option B
                </label>
                <input
                  type="text"
                  value={questions[currentQuestion].type === 'true_false' ? 'Faux' : questions[currentQuestion].option_b}
                  onChange={(e) => updateQuestion('option_b', e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Option B"
                  required
                  disabled={questions[currentQuestion].type === 'true_false'}
                />
              </div>
              {questions[currentQuestion].type === 'qcm' && (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Option C
                    </label>
                    <input
                      type="text"
                      value={questions[currentQuestion].option_c}
                      onChange={(e) => updateQuestion('option_c', e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="Option C"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Option D
                    </label>
                    <input
                      type="text"
                      value={questions[currentQuestion].option_d}
                      onChange={(e) => updateQuestion('option_d', e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="Option D"
                      required
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Correct Answer
              </label>
              <select
                value={questions[currentQuestion].correct_answer}
                onChange={(e) => updateQuestion('correct_answer', e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select correct answer</option>
                {questions[currentQuestion].type === 'true_false' ? (
                  <>
                    <option value="Vrai">Vrai</option>
                    <option value="Faux">Faux</option>
                  </>
                ) : (
                  <>
                    <option value={questions[currentQuestion].option_a}>Option A: {questions[currentQuestion].option_a}</option>
                    <option value={questions[currentQuestion].option_b}>Option B: {questions[currentQuestion].option_b}</option>
                    <option value={questions[currentQuestion].option_c}>Option C: {questions[currentQuestion].option_c}</option>
                    <option value={questions[currentQuestion].option_d}>Option D: {questions[currentQuestion].option_d}</option>
                  </>
                )}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                  <Clock size={16} className="mr-1" />
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={questions[currentQuestion].time_limit}
                  onChange={(e) => updateQuestion('time_limit', parseInt(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  min="5"
                  max="60"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center">
                  <Award size={16} className="mr-1" />
                  Points
                </label>
                <input
                  type="number"
                  value={questions[currentQuestion].points}
                  onChange={(e) => updateQuestion('points', parseInt(e.target.value))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  min="1"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" 
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizCreator;