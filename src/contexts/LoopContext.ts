import { createContext, useContext } from 'react';
import { Loop } from '../hooks/useLoop';

interface LoopContextValue {
  loop: Loop | null;
  refetch: () => Promise<void>;
}

export const LoopContext = createContext<LoopContextValue>({
  loop: null,
  refetch: async () => {},
});

export function useLoopContext() {
  return useContext(LoopContext);
}
