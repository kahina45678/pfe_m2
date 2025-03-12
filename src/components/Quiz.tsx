import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Clock, Users, Award, AlertCircle, QrCode } from 'lucide-react';
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
  options: string[];
  time_limit: number;
  start_time: number;
}

// Définir le type Color
type Color = 'red' | 'blue' | 'green' | 'yellow';

// Définir l'objet colorClasses
const colorClasses: Record<Color, { bg: string; hover: string; selected: string }> = {
  red: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    selected: 'bg-red-800',
  },
  blue: {
    bg: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    selected: 'bg-blue-800',
  },
  green: {
    bg: 'bg-green-500',
    hover: 'hover:bg-green-600',
    selected: 'bg-green-800',
  },
  yellow: {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-600',
    selected: 'bg-yellow-800',
  },
};

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

  const username = location.state?.username || user?.username;
  

  useEffect(() => {
    if (!username || !roomCode) return;

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    setQrCodeData(`http://localhost:5173/quiz/${roomCode}`);

    newSocket.on('connect', () => {
      newSocket.emit('join_room', {
        username: username,
        room_code: roomCode,
      });

      newSocket.on('room_joined', (data) => {
        setIsHost(user !== null);
        console.log('room_joined - isHost:', user !== null);
      });

      newSocket.on('room_created', (data) => {
        setIsHost(user !== null);
        console.log('room_created - isHost:', user !== null);
      });

      newSocket.on('player_joined', (data) => {
        console.log('[DEBUG] Player joined:', data.players);
        setPlayers(data.players);
      });

      newSocket.on('player_left', (data) => {
        console.log('Player left:', data.user_id);
        setPlayers((prevPlayers) => prevPlayers.filter((player) => player.id !== data.user_id));
      });

      newSocket.on('game_started', () => {
        setGameState('playing');
      });

      newSocket.on('new_question', (data) => {
        console.log('[DEBUG] New question received:', data);
        setCurrentQuestion(data);
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        setAnswerResult(null);
        setTimeLeft(data.time_limit || 15);
      });

      newSocket.on('answer_result', (data) => {
        setAnswerResult(data);
      });

      newSocket.on('update_scores', (data) => {
        setPlayers(data.players);
      });

      newSocket.on('game_over', (data) => {
        setGameState('finished');
        setPlayers(data.players);
      });

      newSocket.on('error', (data) => {
        setError(data.message);
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, username]);

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
  }, [currentQuestion]);

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

  const handleLeaveGame = () => {
    if (socket) {
      socket.disconnect(); // Déconnecter le socket
    }
  
    // Vérifier si l'utilisateur est un hôte ou un joueur
    if (isHost) {
      navigate('/home'); // Rediriger l'hôte vers /home
    } else {
      navigate('/'); // Rediriger les joueurs vers /base
    }
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };


  
  if (gameState === 'waiting') {
    const filteredPlayers = players.filter((player) => player.id !== socket?.id || !isHost);

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-red-800">Waiting Room</h2>
          <div className="flex items-center">
            <Users size={20} className="mr-2 text-red-800" />
            <span className="font-semibold">{filteredPlayers.length} Players</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <div className="bg-red-50 p-4 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-red-700">Room Code</h3>
              <p className="text-gray-700 font-mono text-xl">{roomCode}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(roomCode || '')}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
              >
                Copy
              </button>
              <button
                onClick={toggleQRCode}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded flex items-center"
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
              className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-red-300"
            >
              Start Quiz
            </button>
          )}
          <button
            onClick={handleLeaveGame}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-800">
            Question {currentQuestion?.question_number} of {currentQuestion?.total_questions}
          </h2>
          <div className="flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full">
            <Clock size={18} className="mr-1" />
            <span className="font-semibold">{timeLeft}s</span>
          </div>
        </div>

        {isHost ? (
          <div className="mb-8">
            <div className="bg-red-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{currentQuestion?.question}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion?.options.map((option, index) => (
                <div key={index} className="p-4 rounded-lg bg-gray-100 text-gray-800">
                  <span className="font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-red-50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Select your answer</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['red', 'blue', 'green', 'yellow'].map((color, index) => {
                const currentColor = color as Color;
                const isCorrectAnswer = answerResult && currentQuestion?.options[index] === answerResult.correct_answer;
                const isSelectedAnswer = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleSubmitAnswer(index)}
                    disabled={answerSubmitted}
                    className={`p-4 rounded-lg text-white font-bold transition-all relative ${
                      selectedAnswer === index
                        ? colorClasses[currentColor].selected
                        : `${colorClasses[currentColor].bg} ${colorClasses[currentColor].hover}`
                    } ${
                      answerSubmitted && isCorrectAnswer
                        ? 'bg-green-500' // Bonne réponse
                        : ''
                    } ${
                      answerSubmitted && isSelectedAnswer && !isCorrectAnswer
                        ? 'bg-red-500' // Mauvaise réponse
                        : ''
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                    {answerSubmitted && isSelectedAnswer && !isCorrectAnswer && (
                      <span className="absolute top-1 right-1 text-white">✖️</span>
                    )}
                    {answerSubmitted && isCorrectAnswer && (
                      <span className="absolute top-1 right-1 text-white">✔️</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Scores:</h3>
          {isHost ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {players
                .filter(player => player.id !== socket?.id) // Exclure l'hôte de la liste
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <div key={player.id} className="bg-white p-3 rounded border border-gray-200">
                    <p className="font-medium">{player.username}</p>
                    <p className="text-red-800 font-bold">{player.score} pts</p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="font-medium">Your Score</p>
              <p className="text-red-800 font-bold">{players.find((p) => p.id === socket?.id)?.score || 0} pts</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-red-800 mb-2">Quiz Completed!</h2>
        <p className="text-gray-600">Here are the final results</p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-red-700 mb-4 flex items-center justify-center">
          <Award size={24} className="mr-2" />
          Final Standings
        </h3>

        <div className="space-y-4">
          {players
            .filter(player => player.id !== socket?.id) // Exclure l'hôte de la liste
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg flex items-center justify-between ${
                  index === 0
                    ? 'bg-yellow-100 border border-yellow-300'
                    : index === 1
                    ? 'bg-gray-100 border border-gray-300'
                    : index === 2
                    ? 'bg-amber-100 border border-amber-300'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-gray-500 text-white'
                        : index === 2
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="font-medium">{player.username}</span>
                  {player.id === socket?.id && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">You</span>
                  )}
                </div>
                <span className="font-bold text-lg">{player.score} pts</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleLeaveGame}
          className="flex-1 bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default Quiz;