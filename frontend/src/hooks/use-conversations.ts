import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("Failed to fetch conversations") as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useConversation() {
  const { data: conversations, isLoading: loadingConversation } = useSWR<any[]>(
    "/api/conversations",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );
  return {
    conversations,
    loadingConversation,
  };
}
