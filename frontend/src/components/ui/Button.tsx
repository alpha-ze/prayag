import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ButtonProps } from '@/types';

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
}) => {
  const baseClasses = [
    'inline-flex items-center justify-center font-semibold transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'relative overflow-hidden',
  ];

  const variants = {
    primary: [
      'bg-gradient-to-r from-neon-blue to-neon-purple text-white',
      'hover:from-neon-purple hover:to-neon-pink',
      'focus:ring-neon-blue',
      'shadow-lg shadow-neon-blue/25',
      'hover:shadow-xl hover:shadow-neon-purple/25',
    ],
    secondary: [
      'bg-dark-200 text-neon-blue border-2 border-neon-blue',
      'hover:bg-neon-blue hover:text-dark-400',
      'focus:ring-neon-blue',
      'shadow-lg shadow-neon-blue/10',
    ],
    danger: [
      'bg-gradient-to-r from-red-500 to-neon-pink text-white',
      'hover:from-neon-pink hover:to-red-600',
      'focus:ring-red-500',
      'shadow-lg shadow-red-500/25',
    ],
    success: [
      'bg-gradient-to-r from-green-500 to-neon-green text-white',
      'hover:from-neon-green hover:to-green-600',
      'focus:ring-green-500',
      'shadow-lg shadow-green-500/25',
    ],
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl',
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export default Button;