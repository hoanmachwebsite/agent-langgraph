import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("Failed to fetch thread details") as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useThread(threadId: string) {
  const {
    data: dataThread,
    mutate: mutateThread,
    isLoading: loadingThread,
  } = useSWR<any>(threadId ? `/api/conversations/${threadId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });
  return {
    dataThread,
    mutateThread,
    loadingThread,
  };
}
