"use client";

import React from 'react';

type Option = { value: string | number; label: string };

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  register?: any;
  name?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}


export function Select({
  label,
  options,
  register,
  name,
  required,
  disabled,
  error,
  icon,
  className = '',
  value,
  onChange,
  ...props
}: SelectProps) {

  // Only use register if we're not in controlled mode (both value AND onChange must be provided)
  const isControlled = value !== undefined && onChange !== undefined;
  const registerProps = !isControlled && register && name ? register(name, { required }) : {};

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={name} className="text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
          {label}{required ? "*" : ""}
        </label>
      )}
      <div className="relative group">
        <select
          {...registerProps}
          {...props}
          {...(isControlled ? { value, onChange } : {})}
          id={name}
          name={name}
          disabled={disabled}
          className={`
            w-full bg-surface/50 dark:bg-slate-900/50 border border-border rounded-xl 
            py-3 ${icon ? 'pl-11' : 'pl-4'} pr-10 text-sm
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-background
            transition-all duration-300 outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            appearance-none
            [&::-webkit-appearance]:none
            [&::-moz-appearance]:none
            ${error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''}
            ${className}
          `}
          style={{
            backgroundImage: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none'
          }}
        >

          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface dark:bg-slate-900 font-medium">
              {o.label}
            </option>
          ))}
        </select>
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-brand-500 transition-colors duration-300">
            {icon}
          </div>
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-red-500 ml-1 mt-1">{error}</p>}
    </div>
  );
}