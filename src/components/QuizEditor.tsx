import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Trash, Save, ArrowLeft, Clock, Award } from 'lucide-react';

interface QuestionForm {
  id?: number;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  time_limit: number;
  points: number;
  type: 'qcm' | 'true_false' | 'open_question';
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
  points: 10,
  type: 'qcm',
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

      if (quiz.user_id !== user?.id) {
        setError('You do not have permission to edit this quiz');
        return;
      }

      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setQuestions(
        quiz.questions.length > 0
          ? quiz.questions.map((q) => ({
              ...q,
              type: q.type,
            }))
          : [{ ...emptyQuestion }]
      );
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
    const currentQ = updatedQuestions[currentQuestion];
  
    if (field === 'type') {
      if (value === 'true_false') {
        updatedQuestions[currentQuestion] = {
          ...currentQ,
          type: 'true_false',
          option_a: 'Vrai',
          option_b: 'Faux',
          option_c: '',
          option_d: '',
          correct_answer: ''
        };
      } else if (value === 'open_question') {
        updatedQuestions[currentQuestion] = {
          ...currentQ,
          type: 'open_question',
          option_a: undefined,
          option_b: undefined,
          option_c: undefined,
          option_d: undefined,
          correct_answer: undefined
        };
      } else {
        updatedQuestions[currentQuestion] = {
          ...currentQ,
          type: 'qcm',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: ''
        };
      }
    } else {
      updatedQuestions[currentQuestion] = {
        ...currentQ,
        [field]: value
      };
    }
  
    setQuestions(updatedQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
  
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }
  
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
  
      if (!q.question.trim()) {
        setError(`Question ${i + 1} is incomplete (missing question text)`);
        setCurrentQuestion(i);
        return;
      }
  
      if (q.type === 'qcm') {
        if (!q.option_a?.trim() || !q.option_b?.trim() || !q.option_c?.trim() || !q.option_d?.trim()) {
          setError(`Question ${i + 1} is incomplete (all options must be filled for QCM)`);
          setCurrentQuestion(i);
          return;
        }
        if (!q.correct_answer?.trim()) {
          setError(`Question ${i + 1} is incomplete (missing correct answer)`);
          setCurrentQuestion(i);
          return;
        }
      } else if (q.type === 'true_false') {
        if (q.correct_answer !== 'Vrai' && q.correct_answer !== 'Faux') {
          setError(`Question ${i + 1} is invalid (correct answer must be 'Vrai' or 'Faux')`);
          setCurrentQuestion(i);
          return;
        }
      }
    }
  
    setLoading(true);
  
    try {
      await axios.put(`http://localhost:5000/api/quizzes/${quizId}`, {
        title,
        description,
        questions: questions.map(q => ({
          question: q.question,
          type: q.type,
          time_limit: q.time_limit,
          points: q.points,
          ...(q.type === 'qcm' && {
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer
          }),
          ...(q.type === 'true_false' && {
            option_a: 'Vrai',
            option_b: 'Faux',
            correct_answer: q.correct_answer
          })
        })),
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
          className="mr-4 text-[#E71722] hover:text-[#C1121F] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-bold text-[#E71722]">Edit Quiz</h2>
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
              className="flex items-center bg-[#E71722] hover:bg-[#C1121F] text-white px-3 py-1 rounded text-sm transition-colors"
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
                className={`flex items-center justify-center min-w-[40px] h-10 mx-1 rounded-full transition-colors ${
                  currentQuestion === index
                    ? 'bg-[#E71722] text-white'
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
                className="flex items-center text-[#E71722] hover:text-[#C1121F] transition-colors"
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
                onChange={(e) => updateQuestion('type', e.target.value as 'qcm' | 'true_false' | 'open_question')}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="qcm">QCM</option>
                <option value="true_false">Vrai/Faux</option>
                <option value="open_question">Question ouverte</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Question Text
              </label>
              <textarea
                value={questions[currentQuestion].question}
                onChange={(e) => updateQuestion('question', e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline min-h-[100px]"
                placeholder="Enter your question"
                required
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500">
                {questions[currentQuestion].question.length}/500
              </div>
            </div>

            {questions[currentQuestion].type !== 'open_question' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Option A
                  </label>
                  <input
                    type="text"
                    value={
                      questions[currentQuestion].type === 'true_false' 
                        ? 'Vrai' 
                        : questions[currentQuestion].option_a || ''
                    }
                    onChange={(e) => {
                      if (questions[currentQuestion].type !== 'true_false') {
                        updateQuestion('option_a', e.target.value)
                      }
                    }}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      questions[currentQuestion].type === 'true_false' ? 'bg-gray-100' : ''
                    }`}
                    placeholder="Option A"
                    required={questions[currentQuestion].type === 'qcm' || questions[currentQuestion].type === 'true_false'}
                    disabled={questions[currentQuestion].type === 'true_false'}
                    readOnly={questions[currentQuestion].type === 'true_false'}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Option B
                  </label>
                  <input
                    type="text"
                    value={
                      questions[currentQuestion].type === 'true_false' 
                        ? 'Faux' 
                        : questions[currentQuestion].option_b || ''
                    }
                    onChange={(e) => {
                      if (questions[currentQuestion].type !== 'true_false') {
                        updateQuestion('option_b', e.target.value)
                      }
                    }}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      questions[currentQuestion].type === 'true_false' ? 'bg-gray-100' : ''
                    }`}
                    placeholder="Option B"
                    required={questions[currentQuestion].type === 'qcm' || questions[currentQuestion].type === 'true_false'}
                    disabled={questions[currentQuestion].type === 'true_false'}
                    readOnly={questions[currentQuestion].type === 'true_false'}
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
                        value={questions[currentQuestion].option_c || ''}
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
                        value={questions[currentQuestion].option_d || ''}
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
                    value={questions[currentQuestion].correct_answer || ''}
                    onChange={(e) => updateQuestion('correct_answer', e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required={questions[currentQuestion].type === 'qcm' || questions[currentQuestion].type === 'true_false'}
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
              </>
            )}

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
            className="flex items-center bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
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