/**
 * Merge video and audio tracks into a single MediaStream
 */
export function mergeStreams(
  videoStream: MediaStream,
  audioStream: MediaStream
): MediaStream {
  const videoTracks = videoStream.getVideoTracks();
  const audioTracks = audioStream.getAudioTracks();

  if (videoTracks.length === 0) {
    throw new Error('No video track found in video stream');
  }

  if (audioTracks.length === 0) {
    throw new Error('No audio track found in audio stream');
  }

  // Create combined stream with both tracks
  const combinedStream = new MediaStream([
    videoTracks[0],
    audioTracks[0],
  ]);

  return combinedStream;
}
