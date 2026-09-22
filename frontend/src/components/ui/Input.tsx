import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className,
  ...htmlProps
}, ref) => {
  const inputId = React.useId();
  
  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-neon-blue"
        >
          {label}
          {htmlProps.required && <span className="text-neon-pink ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <motion.div whileFocus={{ scale: 1.01 }}>
          <input
            {...htmlProps}
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full px-4 py-3 rounded-lg transition-all duration-200',
              'bg-dark-200 text-white placeholder-gray-400',
              'border-2 focus:outline-none',
              error
                ? 'border-red-500 focus:border-red-400'
                : 'border-gray-600 focus:border-neon-blue',
              'focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-400',
              error 
                ? 'focus:ring-red-500/50' 
                : 'focus:ring-neon-blue/50',
              htmlProps.disabled && 'opacity-50 cursor-not-allowed',
              'shadow-lg shadow-black/25'
            )}
          />
        </motion.div>
        
        {/* Animated border effect */}
        <div className={clsx(
          'absolute inset-0 rounded-lg pointer-events-none',
          'border-2 border-transparent',
          !error && 'focus-within:animate-pulse-neon focus-within:border-neon-blue/50'
        )} />
      </div>
      
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 flex items-center"
        >
          <span className="w-1 h-1 bg-red-400 rounded-full mr-2" />
          {error}
        </motion.p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;