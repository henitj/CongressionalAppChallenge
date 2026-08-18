import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Runs `reset` when the user leaves this screen — switching tabs, going
 * back, or opening another page. Coming back starts from the default view
 * instead of yesterday's filter or a half-scrolled list.
 */
export function useResetOnLeave(reset: () => void) {
  useFocusEffect(
    useCallback(() => {
      return () => {
        reset();
      };
    }, [reset])
  );
}
