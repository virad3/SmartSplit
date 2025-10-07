import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    }[size];

    return (
        <div className="flex justify-center items-center">
            <div className={`animate-spin rounded-full border-4 border-green-500 border-t-transparent ${sizeClasses}`}></div>
        </div>
    );
};

export default Spinner;
