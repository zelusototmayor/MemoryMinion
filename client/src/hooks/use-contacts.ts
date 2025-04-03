import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { ContactWithMentionCount } from "@shared/schema";

export function useContacts() {
  const { user } = useAuth();
  
  const frequentContactsQuery = useQuery<{ contacts: ContactWithMentionCount[] }>({
    queryKey: ["/api/contacts/frequent", { userId: user?.id }],
    queryFn: () => fetch(`/api/contacts/frequent?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user
  });
  
  const allContactsQuery = useQuery<{ contacts: ContactWithMentionCount[] }>({
    queryKey: ["/api/contacts", { userId: user?.id }],
    queryFn: () => fetch(`/api/contacts?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user
  });
  
  return {
    frequentContacts: frequentContactsQuery.data?.contacts || [],
    allContacts: allContactsQuery.data?.contacts || [],
    isLoadingFrequent: frequentContactsQuery.isLoading,
    isLoadingAll: allContactsQuery.isLoading,
    isErrorFrequent: frequentContactsQuery.isError,
    isErrorAll: allContactsQuery.isError,
    refetchAll: allContactsQuery.refetch,
    refetchFrequent: frequentContactsQuery.refetch,
  };
}
