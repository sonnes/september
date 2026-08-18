'use client';

import {
  type QueryKey,
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

export interface OptimisticRecordMutationOptions<TData, TVariables, TCache> {
  queryKey: QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  update: (current: TCache | undefined, variables: TVariables) => TCache;
}

export function useOptimisticRecordMutation<TData, TVariables, TCache>({
  queryKey,
  mutationFn,
  update,
}: OptimisticRecordMutationOptions<TData, TVariables, TCache>): UseMutationResult<
  TData,
  Error,
  TVariables,
  { previous: TCache | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    networkMode: 'always',
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TCache>(queryKey);
      queryClient.setQueryData<TCache>(queryKey, current => update(current, variables));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
