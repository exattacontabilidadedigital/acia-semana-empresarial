'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="mb-5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-semibold text-dark mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-4 py-3 border-2 ${
            error ? 'border-red-500' : 'border-gray-200'
          } rounded-xl font-montserrat text-sm text-dark bg-white transition-colors duration-300 focus:outline-none focus:border-purple ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
