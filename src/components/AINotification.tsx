import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
    loading: boolean;
    success: boolean;
}

const AINotification: React.FC<Props> = ({ loading, success }) => {
    return (
        <AnimatePresence>
            {(loading || success) && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="fixed bottom-6 right-6 bg-white border border-red-300 shadow-lg rounded-xl px-6 py-4 z-50 w-80"
                >
                    {loading && (
                        <div className="flex items-center space-x-3">
                            <Loader2 className="animate-spin text-[#E71722]" />
                            <span className="text-sm text-gray-700">Generating quiz with AI, please wait...</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col items-start">
                            <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="text-green-500" />
                                <span className="font-medium text-green-700">Quiz generated successfully!</span>
                            </div>
                            <Link
                                to="/quizzes"
                                className="text-sm text-[#E71722] hover:underline mt-1"
                            >
                                Go to My Quizzes
                            </Link>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AINotification;
