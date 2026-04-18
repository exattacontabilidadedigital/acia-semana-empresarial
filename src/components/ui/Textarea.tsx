'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
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
        <textarea
          ref={ref}
          id={id}
          className={`w-full px-4 py-3 border-2 ${
            error ? 'border-red-500' : 'border-gray-200'
          } rounded-xl font-montserrat text-sm text-dark bg-white transition-colors duration-300 focus:outline-none focus:border-purple resize-y min-h-[120px] ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
