import { useRef, useCallback } from 'react';

export function useVideoStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) throw new Error('Video element not mounted');
    video.srcObject = stream;
    await new Promise<void>((res) => {
      video.onloadedmetadata = () => res();
    });
    await video.play();
  }, []);

  const stopCamera = useCallback((): void => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return { videoRef, streamRef, startCamera, stopCamera };
}
