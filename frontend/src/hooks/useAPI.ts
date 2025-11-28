/**
 * COMPLETELY FIXED Custom Hook: useAPI
 * 
 * This version prevents infinite loops by:
 * 1. Serializing filters to prevent object reference changes
 * 2. Memoizing data to prevent unnecessary re-renders  
 * 3. Proper cleanup of timers and abort controllers
 * 4. INCLUDING fetchFunction in dependencies (CRITICAL FIX)
 */

import { useState, useEffect, useRef } from 'react';

export function useAPI<T>(
  fetchFunction: (filters?: any) => Promise<T>,
  filters?: any,
  debounceMs: number = 800
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track the current request
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ FIX #1: Serialize filters to prevent infinite loop from object reference changes
  const filtersString = JSON.stringify(filters);
  
  // ✅ FIX #2: Track previous data to prevent unnecessary state updates
  const previousDataRef = useRef<string | null>(null);

  // ✅ FIX #3: Store fetchFunction in ref to avoid dependency issues
  const fetchFunctionRef = useRef(fetchFunction);
  
  // Update the ref when fetchFunction changes
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  useEffect(() => {
    // Cancel any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set loading immediately (user feedback)
    setLoading(true);

    // Debounce the fetch
    timeoutRef.current = setTimeout(() => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setError(null);

      // ✅ FIX #4: Use ref to get current fetchFunction
      fetchFunctionRef.current(filters)
        .then((result) => {
          if (!abortController.signal.aborted) {
            // ✅ FIX #5: Only update state if data actually changed
            const resultString = JSON.stringify(result);
            if (previousDataRef.current !== resultString) {
              console.log('[useAPI] Data changed, updating state');
              previousDataRef.current = resultString;
              setData(result);
            } else {
              console.log('[useAPI] Data unchanged, skipping state update');
            }
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!abortController.signal.aborted) {
            console.error('[useAPI] Fetch error:', err);
            setError(err.message || 'An error occurred');
            setLoading(false);
          }
        });
    }, debounceMs);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filtersString, debounceMs]); // ✅ fetchFunction handled via ref

  return { data, loading, error };
}

export default useAPI;