import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    helperText?: string;
}


export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, helperText, className = '', ...props }, ref) => {

        return (
            <div className="space-y-1.5 w-full">
                {label && (
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-brand-500 transition-colors duration-300">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full bg-surface/50 dark:bg-slate-900/50 border border-border rounded-xl 
              py-3 ${icon ? 'pl-11' : 'pl-4'} pr-4 text-sm 
              focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-background
              transition-all duration-300 outline-none placeholder:text-text-tertiary
              ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs font-medium text-red-500 ml-1 mt-1">{error}</p>}
                {!error && helperText && <p className="text-[10px] font-medium text-slate-500 ml-1 mt-1 italic">{helperText}</p>}
            </div>

        );
    }
);

Input.displayName = 'Input';
