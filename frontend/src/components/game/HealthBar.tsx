import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { HealthBarProps } from '@/types';

const HealthBar: React.FC<HealthBarProps> = ({
  current,
  max,
  animated = true,
}) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isLow = percentage <= 40;
  const isCritical = percentage <= 20;

  const renderHearts = () => {
    const hearts = [];
    
    for (let i = 0; i < max; i++) {
      const isFilled = i < current;
      hearts.push(
        <motion.div
          key={i}
          initial={animated ? { scale: 0 } : undefined}
          animate={animated ? { scale: 1 } : undefined}
          transition={{ delay: i * 0.1 }}
          className="relative"
        >
          <Heart
            className={clsx(
              'w-6 h-6 transition-all duration-200',
              isFilled 
                ? isCritical 
                  ? 'text-red-400 fill-red-400'
                  : isLow
                    ? 'text-yellow-400 fill-yellow-400' 
                    : 'text-red-500 fill-red-500'
                : 'text-gray-600'
            )}
          />
          
          {isFilled && isCritical && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0"
            >
              <Zap className="w-6 h-6 text-red-400" />
            </motion.div>
          )}
        </motion.div>
      );
    }
    
    return hearts;
  };

  return (
    <div className="bg-dark-200 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <motion.div
            animate={isCritical ? { rotate: [0, -5, 5, 0] } : {}}
            transition={{ repeat: isCritical ? Infinity : 0, duration: 0.5 }}
          >
            <Heart className={clsx(
              'w-5 h-5',
              isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-red-500'
            )} />
          </motion.div>
          
          <span className="text-sm text-gray-400 font-medium">Health</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {renderHearts()}
        </div>
        
        <div className="flex items-center space-x-2 ml-auto">
          <motion.span
            className={clsx(
              'text-lg font-bold font-mono',
              isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'
            )}
            animate={isCritical ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: isCritical ? Infinity : 0, duration: 0.8 }}
          >
            {current}
          </motion.span>
          
          <span className="text-gray-400">/</span>
          
          <span className="text-gray-400 font-mono">{max}</span>
        </div>
      </div>
      
      {/* Health bar */}
      <div className="mt-3 w-full bg-dark-400 rounded-full h-3 overflow-hidden">
        <motion.div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            isCritical 
              ? 'bg-gradient-to-r from-red-600 to-red-400' 
              : isLow 
                ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                : 'bg-gradient-to-r from-red-500 to-pink-500'
          )}
          style={{ width: `${percentage}%` }}
          animate={isCritical ? { opacity: [0.7, 1, 0.7] } : {}}
          transition={{ repeat: isCritical ? Infinity : 0, duration: 1 }}
        />
      </div>
      
      {isCritical && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-red-400 text-center font-semibold"
        >
          ⚠️ CRITICAL HEALTH!
        </motion.div>
      )}
    </div>
  );
};

export default HealthBar;