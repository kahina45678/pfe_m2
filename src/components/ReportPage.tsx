import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';

interface Game {
  id: number;
  quiz_id: number;
  room_code: string;
  created_at: string;
  quiz_title: string;
  player_count: number;
  host_id: number;
  user_role: string;
}

interface OpenAnswer {
  question_id: number;
  user_id: number;
  username: string;
  answer_text: string;
}

interface GameDetails {
  game: {
    id: number;
    quiz_title: string;
    created_at: string;
    room_code: string;
    host_id: number;
  };
  players: Array<{
    user_id: number;
    username: string;
    score: number;
  }>;
  questions: Array<{
    id: number;
    question: string;
    type: string;
    correct_count: number;
    incorrect_count: number;
    total_answers: number;
    correct_answer: string;
  }>;
  open_answers: OpenAnswer[];
}

const COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#8884D8'];

const GameList: React.FC<{ games: Game[]; onSelectGame: (id: number) => void }> = ({ games, onSelectGame }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-[#E71722] mb-4">Game History</h2>
      {games.length === 0 ? (
        <p className="text-gray-600">No games found.</p>
      ) : (
        <ul className="space-y-4">
          {games.map(game => (
            <li
              key={game.id}
              className="border-b pb-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => onSelectGame(game.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{game.quiz_title}</h3>
                  <p className="text-sm text-gray-500">Room: {game.room_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{new Date(game.created_at).toLocaleString()}</p>
                  <p className="text-sm">{game.player_count} players</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const QuestionStats: React.FC<{ question: any }> = ({ question }) => {
  const pieData = [
    { name: 'Correct', value: question.correct_count },
    { name: 'Incorrect', value: question.incorrect_count }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="font-semibold text-lg mb-2">{question.question}</h3>
      {question.type !== 'open_question' && (
        <p className="text-sm text-gray-500 mb-4">Correct answer: {question.correct_answer}</p>
      )}


      <div className="flex flex-col md:flex-row gap-8">
        <div>
          <h4 className="font-medium mb-2">Answer Distribution</h4>
          <PieChart width={300} height={300}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>

        <div className="flex-1">
          <h4 className="font-medium mb-2">Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Correct Answers</p>
              <p className="text-2xl font-bold">{question.correct_count}</p>
              <p className="text-sm text-gray-500">
                {question.total_answers > 0
                  ? `${Math.round((question.correct_count / question.total_answers) * 100)}%`
                  : '0%'}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Incorrect Answers</p>
              <p className="text-2xl font-bold">{question.incorrect_count}</p>
              <p className="text-sm text-gray-500">
                {question.total_answers > 0
                  ? `${Math.round((question.incorrect_count / question.total_answers) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpenQuestionStats: React.FC<{
  question: any;
  answers: OpenAnswer[];
}> = ({ question, answers }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="font-semibold text-lg mb-4">{question.question}</h3>

      <h4 className="font-medium mb-3">Player Responses</h4>
      {answers.length > 0 ? (
        <div className="space-y-3">
          {answers.map((answer, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <p className="font-medium text-gray-800">{answer.username}</p>
              <p className="mt-1 text-gray-700">{answer.answer_text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No responses recorded for this question.</p>
      )}
    </div>
  );
};

const GameDetailsView: React.FC<{ details: GameDetails; onBack: () => void }> = ({ details, onBack }) => {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center text-[#E71722] hover:text-[#C1121F]"
      >
        ← Back to history
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-[#E71722] mb-2">{details.game.quiz_title}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <p>Room: {details.game.room_code}</p>
          <p>Date: {new Date(details.game.created_at).toLocaleString()}</p>
        </div>

        <h3 className="font-semibold text-lg mb-2">Players</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {details.players.map((player, index) => (
            <div key={player.user_id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${index === 0 ? 'bg-yellow-500 text-white text-xs' : 'bg-gray-200 text-gray-700 text-xs'}`}>
                  {index + 1}
                </div>
                <p className="font-medium">{player.username}</p>
              </div>
              <p className="text-lg font-bold text-[#E71722]">{player.score} points</p>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#E71722] mb-4">Questions Analysis</h3>

      {details.questions.map((question, index) => {
        const isOpen = question.type === 'open_question';
        const relatedOpenAnswers = details.open_answers.filter(
          (a) => Number(a.question_id) === Number(question.id)
        );

        return (
          <div key={question.id} className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Question {index + 1}</h4>
            {isOpen ? (
              <OpenQuestionStats question={question} answers={relatedOpenAnswers} />
            ) : (
              <QuestionStats question={question} />
            )}
          </div>
        );
      })}

    </div>
  );
};

const ReportPage: React.FC = () => {
  const { user } = useAuth();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null);
  const gamesPerPage = 5;

  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = games.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.ceil(games.length / gamesPerPage);

  const handleDeleteHistory = async () => {
    if (!user || !window.confirm("Are you sure you want to delete all your game history? This action cannot be undone.")) return;

    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/delete_game_history?user_id=${user.id}`);
      setGames([]);
      alert("Game history deleted successfully");
    } catch (error) {
      console.error("Error deleting game history:", error);
      alert("Failed to delete game history");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (id: number) => navigate(`/reports/${id}`);

  const handleBack = () => {
    setSelectedGame(null);
    navigate('/reports');
  };

  useEffect(() => {
    if (!user) return;
    axios.get(`http://localhost:5000/api/game_history?user_id=${user.id}`)
      .then(res => setGames(res.data.games))
      .catch(err => console.error("Error loading game history:", err));
  }, [user]);

  useEffect(() => {
    if (!gameId) {
      setSelectedGame(null);
      return;
    }
    axios.get(`http://localhost:5000/api/game_details/${gameId}`)
      .then(res => setSelectedGame(res.data))
      .catch(err => console.error("Error loading game details:", err));
  }, [gameId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {!selectedGame ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#E71722]">Game Reports</h2>
            {games.length > 0 && (
              <button
                onClick={handleDeleteHistory}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete All History'}
              </button>
            )}
          </div>

          {games.length === 0 ? (
            <p className="text-gray-600">No games found.</p>
          ) : (
            <div className="space-y-4">
              {currentGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-red-50 border border-red-100 rounded-xl p-5 shadow hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleSelectGame(game.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-[#E71722]">{game.quiz_title}</h3>
                      <p className="text-gray-600 text-sm">Room: {game.room_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{new Date(game.created_at).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{game.player_count} players</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center items-center mt-6 space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 bg-[#E71722] text-white rounded disabled:bg-red-300"
                >
                  Previous
                </button>
                <span className="font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 bg-[#E71722] text-white rounded disabled:bg-red-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <GameDetailsView details={selectedGame} onBack={handleBack} />
      )}
    </div>
  );
};


export default ReportPage;