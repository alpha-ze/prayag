/**
 * Competition flow store
 *
 * Phase progression:
 *   round1_img1 → round1_img2 → qualifying → round2 → final
 *
 * Stored in localStorage so a refresh returns the player to the correct phase.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CompetitionPhase =
  | 'round1_img1'
  | 'round1_img2'
  | 'round1_img3'
  | 'qualifying'
  | 'round2'
  | 'final';

export const CHALLENGE_1_ID = '00000000-0000-0000-0000-000000000001';
export const CHALLENGE_2_ID = '00000000-0000-0000-0000-000000000002';
export const CHALLENGE_3_ID = '00000000-0000-0000-0000-000000000003';
export const SCENARIO_ID    = '00000000-0000-0000-0000-000000000001'; // Desert Survival

/** How many players advance to Round 2 */
export const QUALIFYING_CUTOFF = 45;

interface CompetitionState {
  phase: CompetitionPhase;
  qualified: boolean;           // did THIS player qualify for Round 2?
  round1Score: number;          // combined promptle score after both images
  round2Score: number;
  advancePhase: (to: CompetitionPhase) => void;
  setQualified: (q: boolean) => void;
  setRound1Score: (s: number) => void;
  setRound2Score: (s: number) => void;
  resetCompetition: () => void;
}

export const useCompetitionStore = create<CompetitionState>()(
  persist(
    (set) => ({
      phase: 'round1_img1',
      qualified: false,
      round1Score: 0,
      round2Score: 0,

      advancePhase: (to) => set({ phase: to }),
      setQualified: (q) => set({ qualified: q }),
      setRound1Score: (s) => set({ round1Score: s }),
      setRound2Score: (s) => set({ round2Score: s }),
      resetCompetition: () =>
        set({ phase: 'round1_img1', qualified: false, round1Score: 0, round2Score: 0 }),
    }),
    {
      name: 'px-competition',
      partialize: (s) => ({
        phase: s.phase,
        qualified: s.qualified,
        round1Score: s.round1Score,
        round2Score: s.round2Score,
      }),
    }
  )
);
