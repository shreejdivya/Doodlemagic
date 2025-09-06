
import React from 'react';
import { StepStatus } from '../types';

interface StepProps {
    stepNumber: number;
    title: string;
    status: StepStatus;
    icon: React.ReactNode;
}

const statusClasses = {
    [StepStatus.PENDING]: {
        bg: 'bg-gray-100',
        text: 'text-gray-400',
        border: 'border-gray-200'
    },
    [StepStatus.ACTIVE]: {
        bg: 'bg-violet-100',
        text: 'text-violet-600',
        border: 'border-violet-400'
    },
    [StepStatus.COMPLETED]: {
        bg: 'bg-teal-100',
        text: 'text-teal-600',
        border: 'border-teal-300'
    }
};

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);


const Step: React.FC<StepProps> = ({ stepNumber, title, status, icon }) => {
    const classes = statusClasses[status];

    return (
        <div className={`flex items-center p-3 rounded-xl border-2 transition-all duration-300 ${classes.bg} ${classes.border}`}>
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${classes.text} ${status === StepStatus.ACTIVE ? 'bg-violet-200' : status === StepStatus.COMPLETED ? 'bg-teal-200' : 'bg-gray-200'}`}>
                {status === StepStatus.COMPLETED ? <CheckIcon /> : icon}
            </div>
            <div className="ml-4">
                <div className={`text-sm font-medium ${status === StepStatus.PENDING ? 'text-gray-500' : classes.text}`}>Step {stepNumber}</div>
                <div className={`text-lg font-bold ${classes.text}`}>{title}</div>
            </div>
        </div>
    );
};

export default Step;
