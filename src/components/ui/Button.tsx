'use client';

import Link from 'next/link';
import { ButtonHTMLAttributes, forwardRef } from 'react';

const variantClasses = {
  orange:
    'bg-orange text-white hover:bg-orange-dark hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(232,137,47,0.4)]',
  cyan: 'bg-cyan text-white hover:bg-cyan-dark hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(60,200,200,0.4)]',
  purple:
    'bg-purple text-white hover:bg-purple-dark hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(91,45,142,0.4)]',
  outline:
    'bg-transparent text-purple border-2 border-purple hover:bg-purple hover:text-white hover:-translate-y-0.5',
} as const;

const sizeClasses = {
  sm: 'px-5 py-2 text-xs',
  md: 'px-8 py-3 text-sm',
  lg: 'px-12 py-4 text-base tracking-wide',
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'orange', size = 'md', href, className = '', children, ...props }, ref) => {
    const classes = [
      'inline-block rounded-full font-semibold font-montserrat transition-all duration-300 cursor-pointer border-none text-center',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
