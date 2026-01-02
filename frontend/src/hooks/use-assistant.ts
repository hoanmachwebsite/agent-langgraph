import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error("Failed to fetch assistant") as Error & {
      status: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useAssistant() {
  const { data: assistant, isLoading: loadingAssistant } = useSWR<{
    assistantId: string;
  }>("/api/assistant", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });
  return {
    assistant,
    loadingAssistant,
  };
}
