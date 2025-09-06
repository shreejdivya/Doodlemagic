
import React from 'react';

interface SpinnerProps {
    message: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-t-4 border-t-violet-500 border-gray-200 rounded-full animate-spin"></div>
            <p className="mt-4 text-white text-lg font-semibold">{message}</p>
        </div>
    );
};

export default Spinner;
