import { createContext, useContext } from 'react';

/**
 * Shared drag context so AbacusScene can disable OrbitControls
 * while any bead is being dragged.
 */
export interface DragContextValue {
  /** Call with true when a drag starts, false when it ends */
  setDragging: (v: boolean) => void;
}

export const DragContext = createContext<DragContextValue>({
  setDragging: () => undefined,
});

export function useDragContext(): DragContextValue {
  return useContext(DragContext);
}
