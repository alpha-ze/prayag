import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { GameTimerProps } from '@/types';

const GameTimer: React.FC<GameTimerProps> = ({
  timeRemaining,
  totalTime,
  onTimeUp,
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCalledTimeUp = useRef(false);

  // Sync with server time when it changes significantly (> 5s diff)
  useEffect(() => {
    if (Math.abs(displayTime - timeRemaining) > 5) {
      setDisplayTime(timeRemaining);
    }
  }, [timeRemaining]);

  // Live countdown every second
  useEffect(() => {
    hasCalledTimeUp.current = false;

    intervalRef.current = setInterval(() => {
      setDisplayTime(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true;
            onTimeUp?.();
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeRemaining]); // restart timer when server resets it

  const formatTime = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const percentage = totalTime > 0 ? (displayTime / totalTime) * 100 : 0;
  const isLowTime = displayTime <= 60;
  const isCriticalTime = displayTime <= 15;

  return (
    <div className="bg-dark-200 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center space-x-3">
        <motion.div
          animate={isCriticalTime ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ repeat: isCriticalTime ? Infinity : 0, duration: 0.5 }}
        >
          <Clock
            className={clsx(
              'w-6 h-6',
              isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-neon-blue'
            )}
          />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Time Remaining</span>
            <motion.span
              className={clsx(
                'text-lg font-mono font-bold',
                isCriticalTime ? 'text-red-400' : isLowTime ? 'text-yellow-400' : 'text-neon-blue'
              )}
              animate={isCriticalTime ? { scale: [1, 1.15, 1] } : {}}
              transition={{ repeat: isCriticalTime ? Infinity : 0, duration: 0.5 }}
            >
              {formatTime(displayTime)}
            </motion.span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-dark-400 rounded-full h-2 overflow-hidden">
            <motion.div
              className={clsx(
                'h-full rounded-full transition-all duration-1000',
                isCriticalTime
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : isLowTime
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                    : 'bg-gradient-to-r from-neon-blue to-neon-purple'
              )}
              style={{ width: `${percentage}%` }}
              animate={isCriticalTime ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ repeat: isCriticalTime ? Infinity : 0, duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {isCriticalTime && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-red-400 text-center font-semibold animate-pulse"
        >
          ⚠️ TIME RUNNING OUT!
        </motion.div>
      )}
    </div>
  );
};

export default GameTimer;
