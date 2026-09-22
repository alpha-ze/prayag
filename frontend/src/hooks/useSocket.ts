import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socket';

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect(token);

      // Leaderboard live updates
      socketService.on('leaderboard_updated', (data: any) => {
        console.log('📊 Leaderboard updated via socket:', data?.length, 'entries');
        // Dispatch a custom event so Leaderboard page can react
        window.dispatchEvent(new CustomEvent('leaderboard_updated', { detail: data }));
      });

      // Round events
      socketService.on('round_started', (data: any) => {
        console.log('🟢 Round started:', data);
        window.dispatchEvent(new CustomEvent('round_event', { detail: { type: 'started', ...data } }));
        // Show notification
        const msg = `🟢 ROUND STARTED: ${data?.type?.toUpperCase() || 'GAME'} round has begun!`;
        showNotification(msg, 'success');
      });

      socketService.on('round_ended', (data: any) => {
        console.log('🔴 Round ended:', data);
        window.dispatchEvent(new CustomEvent('round_event', { detail: { type: 'ended', ...data } }));
        showNotification('🔴 Round has ended. Check the leaderboard!', 'warning');
      });

      socketService.on('round_paused', (data: any) => {
        console.log('⏸️ Round paused');
        window.dispatchEvent(new CustomEvent('round_event', { detail: { type: 'paused', ...data } }));
        showNotification('⏸️ Round has been paused.', 'info');
      });

      socketService.on('round_resumed', (data: any) => {
        console.log('▶️ Round resumed');
        window.dispatchEvent(new CustomEvent('round_event', { detail: { type: 'resumed', ...data } }));
        showNotification('▶️ Round has resumed!', 'success');
      });

      // Player events
      socketService.on('player_eliminated', (data: any) => {
        console.log('💀 Player eliminated:', data);
        window.dispatchEvent(new CustomEvent('player_event', { detail: { type: 'eliminated', ...data } }));
      });

      socketService.on('player_survived', (data: any) => {
        console.log('🏆 Player survived:', data);
        window.dispatchEvent(new CustomEvent('player_event', { detail: { type: 'survived', ...data } }));
      });
    }

    return () => {
      socketService.off('leaderboard_updated');
      socketService.off('round_started');
      socketService.off('round_ended');
      socketService.off('round_paused');
      socketService.off('round_resumed');
      socketService.off('player_eliminated');
      socketService.off('player_survived');
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

  return { socket: socketService };
};

// Simple in-page toast notification
function showNotification(message: string, type: 'success' | 'warning' | 'info') {
  const div = document.createElement('div');
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  div.className = `fixed top-4 right-4 z-[9999] px-6 py-3 rounded-xl text-white font-semibold shadow-2xl ${colors[type]} transition-all duration-300`;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => document.body.removeChild(div), 300);
  }, 4000);
}
