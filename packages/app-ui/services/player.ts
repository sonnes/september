/** One audio element. A new file replaces the one that plays. */
let element: HTMLAudioElement | null = null;

function clear(audio: HTMLAudioElement): void {
  if (element === audio) element = null;
}

/** Plays one file. It resolves when the sound stops. */
export function play(url: string): Promise<void> {
  stop();

  const audio = new Audio(url);
  element = audio;

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      clear(audio);
      resolve();
    };
    audio.onerror = () => {
      clear(audio);
      reject(new Error("The audio file did not play."));
    };
    audio.play().catch((reason) => {
      clear(audio);
      reject(reason);
    });
  });
}

export function stop(): void {
  element?.pause();
  if (element) clear(element);
}
