import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Clock, Users, Award, QrCode, ArrowRight, Check, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';

interface Player {
  id: string;
  username: string;
  score: number;
  isHost?: boolean;
  answers?: Record<number, number>;
}

interface Question {
  question_number: number;
  total_questions: number;
  question: string;
  options?: string[];
  time_limit: number;
  start_time: number;
  type: 'qcm' | 'true_false' | 'open_question';
  correct_answer?: string | number;
  image?: {
    url: string;
    source: 'unsplash' | 'upload' | 'none';
    unsplash_data?: {
      regular_url: string;
      thumb_url: string;
      author_name: string;
      author_url: string;
    };
  };
}

const shapes = ['♠', '♥', '♦', '♣'];

const PlayerItem = React.memo(({ player, index }: { player: Player; index: number }) => (
  <div className={`p-3 rounded-lg flex items-center justify-between ${index === 0 ? 'bg-yellow-100 border border-yellow-300' :
    index === 1 ? 'bg-gray-100 border border-gray-300' :
      index === 2 ? 'bg-amber-100 border border-amber-300' :
        'bg-white border border-gray-200'
    }`}>
    <div className="flex items-center">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${index === 0 ? 'bg-yellow-500 text-white text-xs' :
        index === 1 ? 'bg-gray-500 text-white text-xs' :
          index === 2 ? 'bg-amber-500 text-white text-xs' :
            'bg-[#E71722]/10 text-[#E71722] text-xs'
        }`}>
        {index + 1}
      </div>
      <span className="font-medium text-sm">{player.username}</span>
    </div>
    <span className="font-bold text-sm">{player.score} pts</span>
  </div>
));

const Podium = ({ players }: { players: Player[] }) => {
  const topPlayers = players.slice(0, 3);

  return (
    <div className="flex justify-center items-end h-64 mb-8 space-x-4">
      {topPlayers[1] && (
        <div className="flex flex-col items-center">
          <div className="w-24 h-32 bg-gray-300 rounded-t-lg flex items-end justify-center pb-2 relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold border-4 border-white">
              2
            </div>
            <span className="text-center font-bold text-gray-800">{topPlayers[1].username}</span>
          </div>
          <div className="mt-2 font-bold text-gray-700">{topPlayers[1].score} pts</div>
        </div>
      )}

      {topPlayers[0] && (
        <div className="flex flex-col items-center">
          <div className="w-28 h-40 bg-yellow-300 rounded-t-lg flex items-end justify-center pb-2 relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold border-4 border-white">
              1
            </div>
            <span className="text-center font-bold text-gray-800">{topPlayers[0].username}</span>
          </div>
          <div className="mt-2 font-bold text-gray-700">{topPlayers[0].score} pts</div>
        </div>
      )}

      {topPlayers[2] && (
        <div className="flex flex-col items-center">
          <div className="w-20 h-24 bg-amber-300 rounded-t-lg flex items-end justify-center pb-2 relative">
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold border-4 border-white">
              3
            </div>
            <span className="text-center font-bold text-gray-800">{topPlayers[2].username}</span>
          </div>
          <div className="mt-2 font-bold text-gray-700">{topPlayers[2].score} pts</div>
        </div>
      )}
    </div>
  );
};

const PlayerMedal = ({ player, position }: { player: Player | null; position: number }) => {
  if (!player) return null;

  const medalColor = position === 1 ? 'bg-yellow-500' :
    position === 2 ? 'bg-gray-500' :
      position === 3 ? 'bg-amber-500' : 'bg-[#E71722]';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`w-32 h-32 rounded-full ${medalColor} flex items-center justify-center text-white mb-4 relative`}>
        <div className="absolute inset-0 rounded-full border-8 border-white opacity-30"></div>
        <span className="text-4xl font-bold">{position}</span>
      </div>
      <h3 className="text-xl font-bold text-gray-800">{player.username}</h3>
      <p className="text-2xl font-bold text-[#E71722] mt-2">{player.score} points</p>
    </div>
  );
};

const Quiz: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { width, height } = useWindowSize();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isHost, setIsHost] = useState(user !== null);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [error, setError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [canAnswer, setCanAnswer] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const [debouncedOpenAnswer, setDebouncedOpenAnswer] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [openAnswersList, setOpenAnswersList] = useState<Array<{
    username: string;
    answer: string;
    questionNumber?: number;
  }>>([]);
  const [newAnswerCount, setNewAnswerCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [showOpenAnswers, setShowOpenAnswers] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationCountdown, setPreparationCountdown] = useState(5);
  const username = location.state?.username || user?.username;

  const qcmColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
  const trueFalseColors = ['bg-blue-500', 'bg-red-500'];

  const getRegularPlayers = useMemo(() => {
    return players
      .filter(player => !player.isHost)
      .sort((a, b) => b.score - a.score);
  }, [players]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOpenAnswer(openAnswer);
    }, 300);

    return () => clearTimeout(handler);
  }, [openAnswer]);

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
    newSocket.on('player_joined', (data) => {
      const playersWithHostFlag = data.players.map((player: Player) => ({
        ...player,
        isHost: player.id === newSocket.id && user !== null
      }));
      setPlayers(playersWithHostFlag);
    });
    newSocket.on('player_left', (data) =>
      setPlayers(prev => prev.filter(player => player.id !== data.user_id))
    );
    newSocket.on('game_started', () => {
      setGameState('playing');
      setOpenAnswersList([]);
      // Ajouter la préparation pour la première question
      setIsPreparing(true);
      setPreparationCountdown(5);
    });
    newSocket.on('preparing_next', (data) => {
      setIsPreparing(true);
      setPreparationCountdown(5);
      setCurrentQuestionIndex(data.question_number - 1);
      setCanAnswer(false);
      setAnswerSubmitted(false);
      setSelectedAnswer(null);
      setOpenAnswer('');
    });
    newSocket.on('new_question', (data) => {
      setIsPreparing(false);
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setCurrentQuestionIndex(data.question_number - 1);
      setAnswerSubmitted(false);
      setTimeLeft(data.time_limit || 15);
      setCanAnswer(true);
      setShowNextButton(false);
      setOpenAnswersList([]);
      setOpenAnswer('');
      setNewAnswerCount(0);
      setSearchTerm('');
      setShowScoresModal(false);
      setShowOpenAnswers(false);
    });

    newSocket.on('time_up', () => {
      setCanAnswer(false);
      if (user !== null) {
        setShowNextButton(true);
      }
    });

    newSocket.on('update_scores', (data) => {
      const playersWithHostFlag = data.players.map((player: Player) => ({
        ...player,
        isHost: player.id === newSocket.id && user !== null
      }));
      setPlayers(playersWithHostFlag);
    });

    newSocket.on('game_over', (data) => {
      const playersWithHostFlag = data.players.map((player: Player) => ({
        ...player,
        isHost: player.id === newSocket.id && user !== null
      }));
      setGameState('finished');
      setPlayers(playersWithHostFlag);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
      setShowScores(false);
    });
    newSocket.on('error', (data) => setError(data.message));

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('new_open_answer', handleNewOpenAnswer);
      newSocket.disconnect();
    };
  }, [roomCode, username, user?.id]);

  useEffect(() => {
    if (isPreparing) {
      const timer = setInterval(() => {
        setPreparationCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPreparing]);

  useEffect(() => {
    if (!isPreparing && currentQuestion) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPreparing, currentQuestion, canAnswer]);

  useEffect(() => {
    const timerAudio = document.getElementById("question-timer-audio") as HTMLAudioElement;
    const warningAudio = document.getElementById("warning-audio") as HTMLAudioElement;

    if (!timerAudio || !warningAudio) return;

    if (timeLeft > 5) {
      if (timerAudio.paused) timerAudio.play().catch(() => { });
      warningAudio.pause();
      warningAudio.currentTime = 0;
    } else if (timeLeft <= 5 && timeLeft > 0) {
      if (!warningAudio.paused) return;
      warningAudio.play().catch(() => { });
    } else if (timeLeft === 0) {
      timerAudio.pause();
      timerAudio.currentTime = 0;
      warningAudio.pause();
      warningAudio.currentTime = 0;
    }

    return () => {
      timerAudio.pause();
      timerAudio.currentTime = 0;
      warningAudio.pause();
      warningAudio.currentTime = 0;
    };
  }, [timeLeft]);


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
    if (!isHost) {
      return (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
          <h2 className="text-3xl font-bold text-[#E71722] mb-6">Waiting Room</h2>

          <div className="bg-[#E71722]/10 p-4 rounded-lg mb-6">
            <p className="font-semibold text-[#E71722]">Your username:</p>
            <p className="text-xl font-bold mt-1">{username}</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <p className="text-gray-700 mb-2">Room Code:</p>
            <p className="text-2xl font-mono font-bold text-[#E71722]">{roomCode}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <Clock size={24} className="mx-auto text-blue-500 mb-2" />
            <p className="text-blue-700">Waiting for the host to start the game...</p>
            <p className="text-sm text-blue-600 mt-1">
              {getRegularPlayers.length} player{getRegularPlayers.length !== 1 ? 's' : ''} connected
            </p>
          </div>

          <button
            onClick={handleLeaveGame}
            className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Leave Room
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#E71722]">Waiting Room</h2>
          <div className="flex items-center">
            <Users size={20} className="mr-2 text-[#E71722]" />
            <span className="font-semibold">{getRegularPlayers.length} Players</span>
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
            {getRegularPlayers.map((player) => (
              <li key={player.id} className="px-4 py-3 flex items-center">
                <span className="font-medium">{player.username}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-4">
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={getRegularPlayers.length < 1}
              className={`flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors ${getRegularPlayers.length < 1 ? 'opacity-50 cursor-not-allowed' : ''
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

  if (isPreparing) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl p-8">
          <h2 className="text-4xl font-bold text-[#E71722] mb-6">
            {currentQuestionIndex === 0 ?
              "Le quiz va commencer !" :
              `Préparez-vous pour la question ${currentQuestionIndex + 1}`}
          </h2>
          <div className="flex justify-center mb-8">
            <div className="text-6xl font-bold text-[#E71722] animate-pulse">
              {preparationCountdown}
            </div>
          </div>
          <p className="text-xl text-gray-600">
            {currentQuestionIndex === 0 ?
              "La première question arrive bientôt..." :
              "La question suivante arrive dans quelques secondes..."}
          </p>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    if (isHost) {
      const correctAnswer = currentQuestion?.options && currentQuestion.options[currentQuestion.correct_answer as number];

      return (
        <div className="fixed inset-0 bg-white flex flex-col">
          {/* Header */}
          <div className={`bg-gray-100 text-gray-800 p-4 flex justify-between items-center border-b border-gray-300`}>
            <div className="flex items-center space-x-4">
              {/* Timer vertical à gauche avec musique */}
              <div className="fixed top-0 left-20 h-full flex flex-col justify-center items-center px-2 z-50">
                <audio id="question-timer-audio" src="/sounds/question_timer.mp3" loop preload="auto"></audio>
                <audio id="warning-audio" src="/sounds/countdown_warning.mp3" preload="auto"></audio>

                <div className="relative w-20 h-80 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 w-full bg-[#E71722] transition-all duration-1000"
                    style={{ height: `${(timeLeft / (currentQuestion?.time_limit || 15)) * 100}%` }}
                  ></div>
                </div>
                <span className="mt-2 text-sm font-bold text-gray-700">
                  {timeLeft}s
                </span>
              </div>

              <div className="text-lg">
                Question {currentQuestion?.question_number} / {currentQuestion?.total_questions}
              </div>
            </div>

            <div className="flex space-x-4">
              {showNextButton && (
                <>
                  <button
                    onClick={handleNextQuestion}
                    className={`bg-[#E71722] text-white font-bold py-2 px-6 rounded-lg flex items-center`}
                  >
                    {currentQuestion?.question_number === currentQuestion?.total_questions
                      ? 'Final Results'
                      : 'Next Question'}
                    <ArrowRight size={20} className="ml-2" />
                  </button>
                  <button
                    onClick={() => setShowScoresModal(!showScoresModal)}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
                  >
                    {showScoresModal ? 'Hide Scores' : 'Show Scores'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Scores Modal */}
          {showScoresModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">Current Scores</h3>
                <div className="space-y-3">
                  {getRegularPlayers.map((player, index) => (
                    <PlayerItem key={player.id} player={player} index={index} />
                  ))}
                </div>
                <button
                  onClick={() => setShowScoresModal(false)}
                  className="mt-4 bg-[#E71722] text-white py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-4xl mb-8">
              {currentQuestion?.image?.url && (
                <div className="mb-6 flex justify-center">
                  <img
                    src={currentQuestion.image.url}
                    alt="Question illustration"
                    className="max-h-64 rounded-lg object-contain"
                  />
                </div>
              )}
              <div className={`bg-gray-100 text-gray-800 p-6 rounded-lg shadow-lg`}>
                <h2 className="text-3xl font-bold text-center">
                  {currentQuestion?.question}
                </h2>
              </div>
            </div>

            {/* Answers */}
            {currentQuestion?.type !== 'open_question' && (
              <div className="w-full max-w-4xl grid grid-cols-2 gap-4">
                {currentQuestion?.type === 'true_false' ? (
                  ['Vrai', 'Faux'].map((option, index) => {
                    const isCorrect = correctAnswer === option;
                    return (
                      <div
                        key={index}
                        className={`${trueFalseColors[index]} text-white p-6 rounded-lg flex flex-col items-center justify-center shadow-lg relative transition-all ${!canAnswer && isCorrect ? 'ring-4 ring-green-400' : ''}`}
                      >
                        <div className="text-4xl font-bold mb-2">{option}</div>
                        {!canAnswer && isCorrect && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                            <Check size={24} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  currentQuestion?.options?.map((option, index) => {
                    const color = qcmColors[index % qcmColors.length];
                    const isCorrect = correctAnswer === option;

                    return (
                      <div
                        key={index}
                        className={`${color} text-white p-6 rounded-lg flex flex-col items-center justify-center shadow-lg relative transition-all ${!canAnswer && isCorrect ? 'ring-4 ring-green-400' : ''}`}
                      >
                        <div className="text-4xl font-bold mb-2">{shapes[index]}</div>
                        <div className="text-lg text-center">{option}</div>
                        {!canAnswer && isCorrect && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                            <Check size={24} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Open answers */}
            {currentQuestion?.type === 'open_question' && (
              <div className={`w-full max-w-4xl bg-gray-100 rounded-xl p-6`}>
                {showOpenAnswers ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">
                        Réponses anonymes ({openAnswersList.length}/{getRegularPlayers.length})
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowOpenAnswers(false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
                        >
                          Masquer les réponses
                        </button>

                        {newAnswerCount > 0 && (
                          <button
                            onClick={() => setNewAnswerCount(0)}
                            className="bg-[#E71722] text-white rounded-full w-8 h-8 flex items-center justify-center"
                          >
                            {newAnswerCount}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredAnswers.length > 0 ? (
                        filteredAnswers.map((response, index) => (
                          <div
                            key={`${response.username}-${index}`}
                            className="bg-white p-3 rounded-lg text-gray-800"
                          >
                            <p className="whitespace-pre-wrap">{response.answer}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          Aucune réponse ne correspond à votre recherche
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      Réponses reçues: {openAnswersList.length}/{getRegularPlayers.length}
                    </h3>
                    <button
                      onClick={() => setShowOpenAnswers(true)}
                      className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg"
                    >
                      Afficher les réponses
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Version joueur
    return (
      <div className="fixed inset-0 bg-white flex flex-col">
        {/* Timer en haut de l'écran */}
        <div className="bg-gray-100 text-gray-800 p-4 flex justify-center items-center border-b border-gray-300">
          <div className="bg-gray-200 px-4 py-2 rounded-full flex items-center">
            <Clock size={20} className="mr-2" />
            <span className="font-bold">{timeLeft}s</span>
          </div>
          <div className="ml-4 text-lg">
            Question {currentQuestion?.question_number} / {currentQuestion?.total_questions}
          </div>
        </div>

        {/* Zone de réponse */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-4xl mb-8">
            <div className="bg-gray-100 text-gray-800 p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-3xl font-bold">Veuillez saisir votre réponse</h2>
            </div>
          </div>

          {/* Réponses */}
          {currentQuestion?.type === 'open_question' ? (
            answerSubmitted ? (
              <div className="p-3 bg-green-100 text-green-800 rounded-lg flex items-center">
                <Check className="mr-2" size={18} />
                <span>Votre réponse a été envoyée !</span>
              </div>
            ) : (
              <div className="w-full max-w-4xl">
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
                  className={`mt-3 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg transition-all ${!debouncedOpenAnswer.trim() || !canAnswer ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Envoyer
                </button>
              </div>
            )
          ) : (
            <div className="w-full max-w-4xl grid grid-cols-2 gap-4">
              {currentQuestion?.type === 'true_false' ? (
                ['Vrai', 'Faux'].map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSubmitAnswer(index)}
                      disabled={answerSubmitted || !canAnswer}
                      className={`p-6 rounded-lg flex flex-col items-center justify-center shadow-lg relative transition-all
                        ${isSelected ? 'bg-[#A00E1A]' : trueFalseColors[index]}
                        ${!canAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-4xl font-bold text-white mb-2">{option}</div>
                    </button>
                  );
                })
              ) : (
                currentQuestion?.options?.map((option, index) => {
                  const color = qcmColors[index % qcmColors.length];
                  const isSelected = selectedAnswer === index;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSubmitAnswer(index)}
                      disabled={answerSubmitted || !canAnswer}
                      className={`${color} text-white p-6 rounded-lg flex flex-col items-center justify-center shadow-lg relative transition-all
        ${isSelected ? 'bg-[#A00E1A]' : ''}
        ${!canAnswer ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-4xl font-bold">{shapes[index]}</div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Score du joueur */}
        <div className="bg-white p-4 border-t border-gray-300">
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center min-w-[200px] justify-center">
              <div className="w-8 h-8 rounded-full bg-[#E71722] text-white flex items-center justify-center mr-3">
                {getRegularPlayers.findIndex(p => p.id === socket?.id) + 1}
              </div>
              <span className="font-bold">{username}</span>
              <span className="ml-4 text-[#E71722] font-bold text-xl">
                {players.find((p) => p.id === socket?.id)?.score || 0} pts
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (gameState === 'finished') {
    return (
      <div className="fixed inset-0 bg-white overflow-y-auto">
        {isHost && (
          <audio id="podium-audio" src="/sounds/podium_loop.mp3" loop autoPlay />
        )}
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
          />
        )}

        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 relative">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-[#E71722] mb-4">Quiz Terminé!</h2>
            <p className="text-2xl text-gray-600">Voici les résultats finaux</p>
          </div>

          {isHost ? (
            // Vue host - avec boutons pour alterner entre podium et scores
            <>
              {!showScores ? (
                <>
                  <Podium players={getRegularPlayers} />
                  <div className="flex space-x-4 mt-8 justify-center">
                    <button
                      onClick={() => setShowScores(true)}
                      className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-6 rounded transition-colors"
                    >
                      Afficher tous les scores
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3 mb-8">
                    {getRegularPlayers.map((player, index) => (
                      <PlayerItem key={player.id} player={player} index={index} />
                    ))}
                  </div>
                  <div className="flex space-x-4 mt-8 justify-center">
                    <button
                      onClick={() => setShowScores(false)}
                      className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-6 rounded transition-colors"
                    >
                      Afficher le podium
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            // Vue joueur - médaille avec classement
            <div className="flex flex-col items-center justify-center py-8">
              <PlayerMedal
                player={getRegularPlayers.find(p => p.id === socket?.id) || null}
                position={getRegularPlayers.findIndex(p => p.id === socket?.id) + 1}
              />
            </div>
          )}

          <div className="flex space-x-4 mt-8 justify-center">
            <button
              onClick={handleLeaveGame}
              className="bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-6 rounded transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default Quiz;