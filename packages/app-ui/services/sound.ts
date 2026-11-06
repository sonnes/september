/** The speaker September plays through, and the microphone that calls hear. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platform } from "@platform/adapter";

const outputsKey = ["outputs"];
const outputKey = ["output"];
const microphoneKey = ["virtual-microphone"];

export function useSoundOutputs() {
  const client = useQueryClient();
  const { outputs: sound } = platform.device;
  const outputs = useQuery({ queryKey: outputsKey, queryFn: () => sound.list() });
  const chosen = useQuery({ queryKey: outputKey, queryFn: () => sound.current() });
  const choose = useMutation({
    mutationFn: (uid: string) => sound.choose(uid),
    onSuccess: () => client.invalidateQueries({ queryKey: outputKey }),
  });
  return { outputs, chosen, choose };
}

/** The September Microphone. A platform without one gives no status. */
export function useVirtualMicrophone() {
  const client = useQueryClient();
  const { virtualMicrophone } = platform.device;
  const status = useQuery({
    queryKey: microphoneKey,
    queryFn: () => virtualMicrophone!.status(),
    enabled: Boolean(virtualMicrophone),
  });
  const change = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? virtualMicrophone!.start() : virtualMicrophone!.stop(),
    onSuccess: (next) => client.setQueryData(microphoneKey, next),
  });
  return { supported: Boolean(virtualMicrophone), status, change };
}
