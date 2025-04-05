import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Clock, Users, Award, AlertCircle, QrCode, ArrowRight, Check, X } from 'lucide-react';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [openAnswersList, setOpenAnswersList] = useState<Array<{
    username: string;
    answer: string;
  }>>([]);

  const username = location.state?.username || user?.username;

  useEffect(() => {
    if (!username || !roomCode) return;
  
    const newSocket = io('http://localhost:5000', { 
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  
    // Debug socket
    console.log('[SOCKET] Creating new socket:', newSocket.id);
    setSocket(newSocket);
    setQrCodeData(`http://localhost:5173/quiz/${roomCode}`);
  
    // Gestionnaires d'événements séparés pour un meilleur contrôle
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
    
      
      if (user !== null) { // Seulement pour l'hôte
        setOpenAnswersList(prev => [...prev, { 
          username: data.username, 
          answer: data.answer,
          questionNumber: data.question_index + 1 // Stocker le numéro de question pour debug
        }]);
      }
    
    };
  
    // Configuration des écouteurs
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
      setCurrentQuestionIndex(data.question_number - 1); // Stockez l'index base 0
      setAnswerSubmitted(false);
      setAnswerResult(null);
      setTimeLeft(data.time_limit || 15);
      setCanAnswer(true);
      setShowNextButton(false);
      setOpenAnswersList([]);
      setOpenAnswer('');
    });

    newSocket.on('time_up', () => {
      setCanAnswer(false);
      if (user !== null) {  // Utilisation directe ici aussi
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
  
    // Nettoyage
    return () => {
      console.log('[SOCKET] Cleaning up socket:', newSocket.id);
      newSocket.off('connect', handleConnect);
      newSocket.off('new_open_answer', handleNewOpenAnswer);
      // Retirez tous les autres écouteurs si nécessaire
      newSocket.disconnect();
    };
  }, [roomCode, username, user?.id]);  // user?.id comme dépendance clé

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
    if (socket && currentQuestion && openAnswer.trim() && canAnswer) {
      socket.emit('submit_open_answer', {
        answer_text: openAnswer,
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

  //waiting
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
              className={`flex-1 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors ${
                filteredPlayers.length < 1 ? 'opacity-50 cursor-not-allowed' : ''
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


//playing
if (gameState === 'playing') {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      {/* Header avec numéro de question et timer - Visible par tous */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#E71722]">
          Question {currentQuestion?.question_number} of {currentQuestion?.total_questions}
        </h2>
        <div className="flex items-center bg-[#E71722]/10 text-[#E71722] px-3 py-1 rounded-full">
          <Clock size={18} className="mr-1" />
          <span className="font-semibold">{timeLeft}s</span>
        </div>
      </div>

      {/* Message si temps écoulé - Visible par les joueurs seulement */}
      {!isHost && !canAnswer && !answerSubmitted && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg flex items-center">
          <AlertCircle className="mr-2" />
          Le temps est écoulé ! Vous ne pouvez plus répondre à cette question.
        </div>
      )}

      {/* Zone de réponse - Affichage radicalement différent selon host/joueur */}
      {isHost ? (
        /* AFFICHAGE HÔTE - Question complète + réponses */
        <div className="bg-[#E71722]/10 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 whitespace-pre-wrap break-words min-h-[100px] max-h-[200px] overflow-y-auto">
            {currentQuestion?.question}
          </h3>
          
          {currentQuestion?.type === 'open_question' && (
            <div className="mt-4">
              <h4 className="font-medium text-lg mb-3">Réponses des joueurs ({openAnswersList.length}):</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {openAnswersList.length > 0 ? (
                  openAnswersList.map((response, index) => (
                    <div key={`${response.username}-${index}`} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-blue-600">{response.username}</p>
                        <span className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-1 pl-2 border-l-2 border-blue-400 whitespace-pre-wrap break-words">
                        {response.answer}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg flex items-center">
                    <AlertCircle className="mr-2" size={16} />
                    <span>En attente de réponses des joueurs...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentQuestion?.type !== 'open_question' && (
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
        </div>
      ) : (
        /* AFFICHAGE JOUEUR - Uniquement le champ de réponse */
        <div className="bg-[#E71722]/10 p-6 rounded-lg mb-6">
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
                  disabled={!openAnswer.trim() || !canAnswer}
                  className={`mt-3 bg-[#E71722] hover:bg-[#C1121F] text-white font-bold py-2 px-6 rounded-lg transition-all ${
                    !openAnswer.trim() || !canAnswer 
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
                    className={`p-4 rounded-lg text-white font-bold transition-all relative ${
                      selectedAnswer === index
                        ? colorClasses[['red', 'blue'][index] as Color].selected
                        : colorClasses[['red', 'blue'][index] as Color].bg
                    } ${
                      answerSubmitted && answerResult?.correct_answer === option
                        ? 'bg-green-500'
                        : ''
                    } ${
                      answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option
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
                    className={`p-4 rounded-lg text-white font-bold transition-all relative ${
                      selectedAnswer === index
                        ? colorClasses[['red', 'blue', 'green', 'yellow'][index] as Color].selected
                        : colorClasses[['red', 'blue', 'green', 'yellow'][index] as Color].bg
                    } ${
                      answerSubmitted && answerResult?.correct_answer === option
                        ? 'bg-green-500'
                        : ''
                    } ${
                      answerSubmitted && selectedAnswer === index && answerResult?.correct_answer !== option
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
        </div>
      )}

      {/* Affichage des scores */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg mb-2">Scores:</h3>
        {isHost ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {players
              .filter((player) => player.id !== socket?.id)
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg ${
                    index === 0
                      ? 'bg-yellow-100 border border-yellow-300'
                      : index === 1
                      ? 'bg-gray-100 border border-gray-300'
                      : index === 2
                      ? 'bg-amber-100 border border-amber-300'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className="font-medium">{player.username}</p>
                  <p className="text-[#E71722] font-bold">{player.score} pts</p>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white p-3 rounded border border-gray-200">
            <p className="font-medium">Your Score</p>
            <p className="text-[#E71722] font-bold">{players.find((p) => p.id === socket?.id)?.score || 0} pts</p>
          </div>
        )}
      </div>

      {/* Bouton pour passer à la question suivante (host seulement) */}
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
              .filter((player) => player.id !== socket?.id) // Exclure l'hôte
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
                          : 'bg-[#E71722]/10 text-[#E71722]'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  <span className="font-bold text-lg">{player.score} pts</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {players
              .filter((player) => player.id === socket?.id) // Afficher uniquement le joueur actuel
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