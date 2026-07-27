import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

export function useScreenData(loadFn: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError("");
      try {
        await loadFn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [loadFn],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  return { refreshing, loading, error, setError, onRefresh, reload: () => load(false) };
}
