import { HTMLAttributes } from 'react';

const statusClasses = {
  active: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  free: 'bg-cyan/20 text-cyan-dark',
} as const;

export type BadgeStatus = keyof typeof statusClasses;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: BadgeStatus;
  className?: string;
}

export default function Badge({ status, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClasses[status]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
