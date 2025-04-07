import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Clock, Users, Award, AlertCircle, QrCode, ArrowRight, Check, X, Minimize2, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Player {
  id: string;
  username: string;
  score: number;
}

interface Question {
  question_number: number;
  total_questions: number;
  question: string;
  options?: string[];
  time_limit: number;
  start_time: number;
  type: 'qcm' | 'true_false' | 'open_question';
}

type Color = 'red' | 'blue' | 'green' | 'yellow';

const colorClasses: Record<Color, { bg: string; hover: string; selected: string }> = {
  red: { bg: 'bg-[#E71722]', hover: 'hover:bg-[#C1121F]', selected: 'bg-[#A00E1A]' },
  blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', selected: 'bg-blue-800' },
  green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', selected: 'bg-green-800' },
  yellow: { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', selected: 'bg-yellow-800' },
};

const PlayerItem = React.memo(({ player, index }: { player: Player; index: number }) => (
  <div className={`p-3 rounded-lg flex items-center justify-between ${index === 0
      ? 'bg-yellow-100 border border-yellow-300'
      : index === 1
        ? 'bg-gray-100 border border-gray-300'
        : index === 2
          ? 'bg-amber-100 border border-amber-300'
          : 'bg-white border border-gray-200'
    }`}>
    <div className="flex items-center">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${index === 0
            ? 'bg-yellow-500 text-white text-xs'
            : index === 1
              ? 'bg-gray-500 text-white text-xs'
              : index === 2
                ? 'bg-amber-500 text-white text-xs'
                : 'bg-[#E71722]/10 text-[#E71722] text-xs'
          }`}
      >
        {index + 1}
      </div>
      <span className="font-medium text-sm">{player.username}</span>
    </div>
    <span className="font-bold text-sm">{player.score} pts</span>
  </div>
));

const Quiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(user !== null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    is_correct: boolean;
    correct_answer: string;
    points: number;
    new_score: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [error, setError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [canAnswer, setCanAnswer] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const [debouncedOpenAnswer, setDebouncedOpenAnswer] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [openAnswersList, setOpenAnswersList] = useState<Array<{
    username: string;
    answer: string;
    questionNumber?: number;
  }>>([]);
  const [newAnswerCount, setNewAnswerCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [normalMode, setNormalMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'answers' | 'scores'>('answers');

  const username = location.state?.username || user?.username;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOpenAnswer(openAnswer);
    }, 300);

    return () => clearTimeout(handler);
  }, [openAnswer]);

  const groupSimilarAnswers = (answers: typeof openAnswersList) => {
    const groups: Record<string, { count: number, usernames: string[] }> = {};

    answers.forEach(answer => {
      const normalized = answer.answer.trim().toLowerCase();
      if (!groups[normalized]) {
        groups[normalized] = { count: 1, usernames: [answer.username] };
      } else {
        groups[normalized].count++;
        groups[normalized].usernames.push(answer.username);
      }
    });

    return Object.entries(groups).map(([answer, data]) => ({
      answer,
      count: data.count,
      usernames: data.usernames
    }));
  };

  const filteredAnswers = useMemo(() => {
    return openAnswersList.filter(answer =>
      answer.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [openAnswersList, searchTerm]);

  useEffect(() => {
    if (!username || !roomCode) return;

    const newSocket = io('http://localhost:5000', {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    console.log('[SOCKET] Creating new socket:', newSocket.id);
    setSocket(newSocket);
    setQrCodeData(`http://localhost:5173/quiz/${roomCode}`);

    const handleConnect = () => {
      console.log('[SOCKET] Connected with ID:', newSocket.id);
      newSocket.emit('join_room', {
        username: username,
        room_code: roomCode,
        is_host: user !== null
      });
    };

    const handleNewOpenAnswer = (data: any) => {
      console.log('[SOCKET] Received open answer - Current question:',
        currentQuestion?.question_number,
        'Received question:', data.question_index + 1,
        'Answer from:', data.username);

      if (user !== null) {
        setOpenAnswersList(prev => [...prev, {
          username: data.username,
          answer: data.answer,
          questionNumber: data.question_index + 1
        }]);
        setNewAnswerCount(prev => prev + 1);
      }
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('new_open_answer', handleNewOpenAnswer);
    newSocket.on('room_joined', () => setIsHost(user !== null));
    newSocket.on('room_created', () => setIsHost(user !== null));
    newSocket.on('player_joined', (data) => setPlayers(data.players));
    newSocket.on('player_left', (data) =>
      setPlayers(prev => prev.filter(player => player.id !== data.user_id))
    );
    newSocket.on('game_started', () => {
      setGameState('playing');
      setOpenAnswersList([]);
    });
    newSocket.on('new_question', (data) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setCurrentQuestionIndex(data.question_number - 1);
      setAnswerSubmitted(false);
      setAnswerResult(null);
      setTimeLeft(data.time_limit || 15);
      setCanAnswer(true);
      setShowNextButton(false);
      setOpenAnswersList([]);
      setOpenAnswer('');
      setNewAnswerCount(0);
      setSearchTerm('');
      setActiveTab('answers');
    });

    newSocket.on('time_up', () => {
      setCanAnswer(false);
      if (user !== null) {
        setShowNextButton(true);
      }
    });

    newSocket.on('answer_result', setAnswerResult);
    newSocket.on('update_scores', (data) => setPlayers(data.players));
    newSocket.on('game_over', (data) => {
      setGameState('finished');
      setPlayers(data.players);
    });
    newSocket.on('error', (data) => setError(data.message));

    return () => {
      console.log('[SOCKET] Cleaning up socket:', newSocket.id);
      newSocket.off('connect', handleConnect);
      newSocket.off('new_open_answer', handleNewOpenAnswer);
      newSocket.disconnect();
    };
  }, [roomCode, username, user?.id]);

  useEffect(() => {
    if (!currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion, canAnswer]);

  const handleStartGame = () => {
    if (socket && isHost) {
      socket.emit('start_game', { room_code: roomCode });
    }
  };

  const handleSubmitAnswer = (answerIndex: number) => {
    if (socket && !answerSubmitted) {
      setSelectedAnswer(answerIndex);
      setAnswerSubmitted(true);
      socket.emit('submit_answer', {
        answer: answerIndex,
      });
    }
  };

  const handleSubmitOpenAnswer = () => {
    if (socket && currentQuestion && debouncedOpenAnswer.trim() && canAnswer) {
      socket.emit('submit_open_answer', {
        answer_text: debouncedOpenAnswer,
        question_index: currentQuestion.question_number - 1
      });
      setAnswerSubmitted(true);
      setOpenAnswer('');
    }
  };

  const handleNextQuestion = () => {
    if (socket && isHost) {
      socket.emit('next_question', { room_code: roomCode });
    }
  };

  const handleLeaveGame = () => {
    if (socket) {
      socket.disconnect();
    }
    navigate(isHost ? '/home' : '/');
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  if (gameState === 'waiting') {
    const filteredPlayers = players.filter((player) => player.id !== socket?.id || !isHost);

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#E71722]">Waiting Room</h2>
          <div className="flex items-center">
            <Users size={20} className="mr-2 text-[#E71722]" />
            <span className="font-semibold">{filteredPlayers.length} Players</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <div className="bg-[#E71722]/10 p-4 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-[#E71722]">Room Code</h3>
              <p className="text-gray-700 font-mono text-xl">{roomCode}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(roomCode || '')}
                className="bg-[#E71722]/20 hover:bg-[#E71722]/30 text-[#E71722] px-3 py-1 rounded transition-colors"
              >
                Copy
              </button>
              <button
                onClick={toggleQRCode}
                className="bg-[#E71722]/20 hover:bg-[#E71722]/30 text-[#E71722] px-3 py-1 rounded flex items-center transition-colors"
              >
                <QrCode size={16} className="mr-1" />
                QR
              </button>
            </div>
          </div>

          {showQRCode && qrCodeData && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 flex flex-col items-center">
              <p className="text-gray-700 mb-2">Scan to join:</p>
              <QRCodeSVG value={qrCodeData} size={200} />
            </div>
          )}

          <h3 className="font-semibold text-lg mb-2">Players:</h3>
          <ul className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {filteredPlayers.map((player) => (
              <li key={player.id} className="px-4 py-3 flex items-center">
                <span className="font-medium">{player.username}</span>
                {player.id === socket?.id && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">You</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-4">
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={filteredPlayers.length < 1}
              className={`flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors ${filteredPlayers.length < 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              Start Quiz
            </button>
          )}
          <button
            onClick={handleLeaveGame}
            className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    // Mode présentation par défaut pour l'hôte
    if (isHost && !normalMode) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-8">
          {/* En-tête avec timer et info question */}
          <div className="w-full max-w-6xl flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-[#E71722]/20 text-[#E71722] px-4 py-2 rounded-full flex items-center">
                <Clock size={20} className="mr-2" />
                <span className="font-bold">{timeLeft}s</span>
              </div>
              <div className="text-white text-xl">
                Question {currentQuestion?.question_number} / {currentQuestion?.total_questions}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setNormalMode(true)}
                className="bg-white text-[#E71722] font-bold py-2 px-4 rounded-lg flex items-center"
              >
                <Minimize2 size={18} className="mr-2" />
                Mode normal
              </button>
              {showNextButton && (
                <button
                  onClick={handleNextQuestion}
                  className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg flex items-center"
                >
                  {currentQuestion?.question_number === currentQuestion?.total_questions
                    ? 'Résultats finaux'
                    : 'Question suivante'}
                  <ArrowRight size={20} className="ml-2" />
                </button>
              )}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="w-full max-w-6xl flex-1 flex flex-col md:flex-row gap-8">
            {/* Question et réponses */}
            <div className="flex-1 bg-white rounded-xl p-6 shadow-lg flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                {currentQuestion?.question}
              </h2>

              {currentQuestion?.type !== 'open_question' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {currentQuestion?.type === 'true_false' ? (
                    ['Vrai', 'Faux'].map((option, index) => (
                      <div key={index} className="bg-gray-100 p-4 rounded-lg text-center">
                        <span className="font-bold text-lg">{option}</span>
                      </div>
                    ))
                  ) : (
                    currentQuestion?.options?.map((option, index) => (
                      <div key={index} className="bg-gray-100 p-4 rounded-lg">
                        <span className="font-bold">{String.fromCharCode(65 + index)}:</span> {option}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Réponses des joueurs */}
            <div className="w-full md:w-96 bg-white rounded-xl p-6 shadow-lg flex flex-col">
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setActiveTab('answers')}
                  className={`flex-1 py-2 font-medium ${activeTab === 'answers' ? 'text-[#E71722] border-b-2 border-[#E71722]' : 'text-gray-500'}`}
                >
                  Réponses ({openAnswersList.length}/{players.filter(p => p.id !== socket?.id).length})
                </button>
                <button
                  onClick={() => setActiveTab('scores')}
                  className={`flex-1 py-2 font-medium ${activeTab === 'scores' ? 'text-[#E71722] border-b-2 border-[#E71722]' : 'text-gray-500'}`}
                >
                  Scores
                </button>
              </div>

              {activeTab === 'answers' ? (
                <div className="flex-1 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full p-2 mb-3 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  {currentQuestion?.type === 'open_question' ? (
                    filteredAnswers.length > 0 ? (
                      <div className="space-y-3">
                        {filteredAnswers.map((response, index) => (
                          <div
                            key={`${response.username}-${index}`}
                            className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-blue-600 truncate">
                                  {response.username}
                                </p>
                                <p className="text-gray-700 mt-1 pl-2 border-l-2 border-blue-400 whitespace-pre-wrap break-words">
                                  {response.answer}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                        {players.filter(p => p.id !== socket?.id).length === 0
                          ? "Aucun joueur dans la salle"
                          : "Aucune réponse ne correspond à votre recherche"}
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {currentQuestion?.options?.map((_, index) => {
                        const letter = String.fromCharCode(65 + index);
                        const count = openAnswersList.filter(a => a.answer === letter).length;
                        return (
                          <div key={index} className="bg-gray-100 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold">{letter}</div>
                            <div className="text-sm text-gray-600">{count} réponse{count !== 1 ? 's' : ''}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {players
                    .filter((player) => player.id !== socket?.id)
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <PlayerItem key={player.id} player={player} index={index} />
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Mode normal (pour les joueurs ou l'hôte qui a basculé en mode normal)
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#E71722]">
            Question {currentQuestion?.question_number} of {currentQuestion?.total_questions}
          </h2>
          <div className="flex items-center bg-[#E71722]/10 text-[#E71722] px-3 py-1 rounded-full">
            <Clock size={18} className="mr-1" />
            <span className="font-semibold">{timeLeft}s</span>
          </div>
        </div>

        {!isHost && !canAnswer && !answerSubmitted && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg flex items-center">
            <AlertCircle className="mr-2" />
            Le temps est écoulé ! Vous ne pouvez plus répondre à cette question.
          </div>
        )}

        {isHost && (
          <button
            onClick={() => setNormalMode(false)}
            className="mb-4 bg-[#E71722] text-white font-bold py-2 px-4 rounded-lg flex items-center"
          >
            <Maximize2 size={18} className="mr-2" />
            Mode présentation
          </button>
        )}

        <div className="bg-[#E71722]/10 p-6 rounded-lg mb-6">
          {isHost ? (
            <>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 whitespace-pre-wrap break-words">
                {currentQuestion?.question}
              </h3>

              {currentQuestion?.type === 'open_question' ? (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-lg">
                      Réponses ({openAnswersList.length}/{players.filter(p => p.id !== socket?.id).length})
                    </h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setOpenAnswersList([])}
                        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      >
                        Effacer tout
                      </button>
                      {newAnswerCount > 0 && (
                        <button
                          onClick={() => setNewAnswerCount(0)}
                          className="relative bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          {newAnswerCount}
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Rechercher dans les réponses..."
                    className="w-full p-2 mb-3 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {filteredAnswers.length > 0 ? (
                      filteredAnswers.map((response, index) => (
                        <div
                          key={`${response.username}-${index}`}
                          className="bg-white p-3 rounded-lg border border-gray-200 hover:border-[#E71722] transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-blue-600 truncate">
                                {response.username}
                              </p>
                              <p className="text-gray-700 mt-1 pl-2 border-l-2 border-blue-400 whitespace-pre-wrap break-words">
                                {response.answer}
                              </p>
                            </div>
                            <button
                              onClick={() => setOpenAnswersList(prev => prev.filter((_, i) => i !== index))}
                              className="ml-2 text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                        {players.filter(p => p.id !== socket?.id).length === 0
                          ? "Aucun joueur dans la salle"
                          : "Aucune réponse ne correspond à votre recherche"}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <h4 className="font-medium text-lg mb-3">Options:</h4>
                  {currentQuestion?.type === 'true_false' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {['Vrai', 'Faux'].map((option, index) => (
                        <div key={index} className="p-3 bg-gray-100 rounded-lg">
                          {option}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQuestion?.options?.map((option, index) => (
                        <div key={index} className="p-3 bg-gray-100 rounded-lg">
                          <span className="font-semibold">{String.fromCharCode(65 + index)}:</span> {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Your answer:</h3>

              {currentQuestion?.type === 'open_question' ? (
                answerSubmitted ? (
                  <div className="p-3 bg-green-100 text-green-800 rounded-lg flex items-center">
                    <Check className="mr-2" size={18} />
                    <span>Votre réponse a été envoyée !</span>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={openAnswer}
                      onChange={(e) => setOpenAnswer(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E71722]"
                      placeholder="Écrivez votre réponse ici..."
                      rows={4}
                      disabled={!canAnswer}
                    />
                    <button
                      onClick={handleSubmitOpenAnswer}
                      disabled={!debouncedOpenAnswer.trim() || !canAnswer}
                      className={`mt-3 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg transition-all ${!debouncedOpenAnswer.trim() || !canAnswer
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                        }`}
                    >
                      Envoyer
                    </button>
                  </>
                )
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion?.type === 'true_false' ? (
                    ['Vrai', 'Faux'].map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSubmitAnswer(index)}
                        disabled={answerSubmitted || !canAnswer}
                        className={`p-4 rounded-lg text-white font-bold transition-all relative ${selectedAnswer === index
                            ? colorClasses[['red', 'blue'][index] as Color].selected
                            : colorClasses[['red', 'blue'][index] as Color].bg
                          } ${answerSubmitted && answerResult?.correct_answer === option
                            ? 'bg-green-500'
                            : ''
                          } ${answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option
                            ? 'bg-red-500'
                            : ''
                          } ${!canAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {option}
                        {answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option && (
                          <X className="absolute top-1 right-1" />
                        )}
                        {answerSubmitted && answerResult?.correct_answer === option && (
                          <Check className="absolute top-1 right-1" />
                        )}
                      </button>
                    ))
                  ) : (
                    currentQuestion?.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSubmitAnswer(index)}
                        disabled={answerSubmitted || !canAnswer}
                        className={`p-4 rounded-lg text-white font-bold transition-all relative ${selectedAnswer === index
                            ? colorClasses[['red', 'blue', 'green', 'yellow'][index] as Color].selected
                            : colorClasses[['red', 'blue', 'green', 'yellow'][index] as Color].bg
                          } ${answerSubmitted && answerResult?.correct_answer === option
                            ? 'bg-green-500'
                            : ''
                          } ${answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option
                            ? 'bg-red-500'
                            : ''
                          } ${!canAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {String.fromCharCode(65 + index)}
                        {answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option && (
                          <X className="absolute top-1 right-1" />
                        )}
                        {answerSubmitted && answerResult?.correct_answer === option && (
                          <Check className="absolute top-1 right-1" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-lg mb-2">Scores:</h3>
          {isHost ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {players
                .filter((player) => player.id !== socket?.id)
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <PlayerItem key={player.id} player={player} index={index} />
                ))}
            </div>
          ) : (
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="font-medium">Your Score</p>
              <p className="text-[#E71722] font-bold">{players.find((p) => p.id === socket?.id)?.score || 0} pts</p>
            </div>
          )}
        </div>

        {isHost && showNextButton && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={handleNextQuestion}
              className="w-full bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center transition-all transform hover:scale-105"
            >
              {currentQuestion?.question_number === currentQuestion?.total_questions
                ? 'Voir les résultats finaux'
                : 'Passer à la question suivante'}
              <ArrowRight size={20} className="ml-2" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#E71722] mb-2">Quiz Completed!</h2>
        <p className="text-gray-600">Here are the final results</p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-[#E71722] mb-4 flex items-center justify-center">
          <Award size={24} className="mr-2" />
          Final Standings
        </h3>

        {isHost ? (
          <div className="space-y-4">
            {players
              .filter((player) => player.id !== socket?.id)
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <PlayerItem key={player.id} player={player} index={index} />
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {players
              .filter((player) => player.id === socket?.id)
              .map((player, index) => (
                <div
                  key={player.id}
                  className="p-4 rounded-lg flex items-center justify-between bg-white border border-gray-200"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-[#E71722]/10 text-[#E71722]">
                      {index + 1}
                    </div>
                    <span className="font-medium">{player.username}</span>
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">You</span>
                  </div>
                  <span className="font-bold text-lg">{player.score} pts</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleLeaveGame}
          className="flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default Quiz;