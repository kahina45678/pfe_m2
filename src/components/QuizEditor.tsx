import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Trash, Save, ArrowLeft, Clock, Award } from 'lucide-react';

interface QuestionForm {
  id?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  time_limit: number;
  points: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  user_id: number;
  questions: QuestionForm[];
}

const emptyQuestion: QuestionForm = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: '',
  time_limit: 15,
  points: 10
};

const QuizEditor: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([{ ...emptyQuestion }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);
  
  const fetchQuiz = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/quizzes/${quizId}`);
      const quiz: Quiz = response.data.quiz;
      
      // Check if user is the owner
      if (quiz.user_id !== user?.id) {
        setError('You do not have permission to edit this quiz');
        return;
      }
      
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setQuestions(quiz.questions.length > 0 ? quiz.questions : [{ ...emptyQuestion }]);
      setInitialLoading(false);
    } catch (err) {
      setError('Failed to load quiz');
      setInitialLoading(false);
    }
  };
  
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
    updatedQuestions[currentQuestion] = {
      ...updatedQuestions[currentQuestion],
      [field]: value
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
      if (!q.question.trim() || !q.option_a.trim() || !q.option_b.trim() || 
          !q.option_c.trim() || !q.option_d.trim() || !q.correct_answer) {
        setError(`Question ${i + 1} is incomplete`);
        setCurrentQuestion(i);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      await axios.put(`http://localhost:5000/api/quizzes/${quizId}`, {
        title,
        description,
        questions
      });
      
      navigate('/quizzes');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update quiz');
      setLoading(false);
    }
  };
  
  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-12"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-20 bg-gray-200 rounded w-full mb-6"></div>
          <div className="h-40 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/quizzes')}
          className="mr-4 text-red-800 hover:text-red-900" 
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-bold text-red-800">Edit Quiz</h2> {/* Rouge foncé */}
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
                  value={questions[currentQuestion].option_a}
                  onChange={(e) => updateQuestion('option_a', e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Option A"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Option B
                </label>
                <input
                  type="text"
                  value={questions[currentQuestion].option_b}
                  onChange={(e) => updateQuestion('option_b', e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Option B"
                  required
                />
              </div>
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
                <option value={questions[currentQuestion].option_a}>Option A: {questions[currentQuestion].option_a}</option>
                <option value={questions[currentQuestion].option_b}>Option B: {questions[currentQuestion].option_b}</option>
                <option value={questions[currentQuestion].option_c}>Option C: {questions[currentQuestion].option_c}</option>
                <option value={questions[currentQuestion].option_d}>Option D: {questions[currentQuestion].option_d}</option>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizEditor;