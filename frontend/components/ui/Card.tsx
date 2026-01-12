import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = true, ...props }) => {
    return (
        <div
            className={`
        rounded-2xl border border-border overflow-hidden
        ${glass ? 'glass-card' : 'bg-surface'}
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};
