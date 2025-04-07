import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Medal, Calendar } from 'lucide-react';

interface LeaderboardEntry {
  username: string;
  score: number;
  quiz_title: string;
  quiz_date: string;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/leaderboard');
        setLeaderboard(response.data.leaderboard);
      } catch (err) {
        setError('Failed to load leaderboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-12"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center mb-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full mr-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mr-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#E71722] mb-2 flex items-center justify-center">
          <Trophy size={28} className="mr-2" />
          Leaderboard
        </h2>
        <p className="text-gray-600">Top scores from all players</p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {leaderboard.length === 0 && !loading && !error ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No scores recorded yet. Be the first to play!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quiz
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.map((entry, index) => (
                <tr key={index} className={index < 3 ? 'bg-[#FFEBEE]' : ''}> {/* Light red background for top 3 */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 ? (
                        <Medal size={20} className="text-yellow-500" />
                      ) : index === 1 ? (
                        <Medal size={20} className="text-gray-400" />
                      ) : index === 2 ? (
                        <Medal size={20} className="text-amber-600" />
                      ) : (
                        <span className="text-gray-500 font-medium">{index + 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{entry.quiz_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-[#E71722]">{entry.score} pts</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-1" />
                      {formatDate(entry.quiz_date)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;