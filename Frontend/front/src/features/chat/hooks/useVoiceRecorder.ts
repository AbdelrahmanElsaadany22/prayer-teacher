import { useCallback, useEffect, useRef, useState } from 'react';

/** Stop long recordings from growing past what the server accepts (10 MB). */
const MAX_SECONDS = 300;

export type VoiceRecorderState = {
  recording: boolean;
  /** Seconds elapsed in the current recording, for the on-screen timer. */
  seconds: number;
  error: string | null;
  start: () => Promise<void>;
  /** Resolves with the recording, or null if it was cancelled or never started. */
  stop: () => Promise<Blob | null>;
  cancel: () => void;
};

export function useVoiceRecorder(): VoiceRecorderState {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** Releases the microphone; without it the browser keeps showing "recording". */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Tick the on-screen timer, and stop on our own once the cap is reached.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) recorderRef.current?.stop();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Never leave the microphone open if the component goes away mid-recording.
  useEffect(() => releaseStream, [releaseStream]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(500);
      recorderRef.current = recorder;

      setSeconds(0);
      setRecording(true);
    } catch {
      // Denied permission, or no microphone on the device.
      setError('mic');
      releaseStream();
    }
  }, [releaseStream]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setRecording(false);
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        releaseStream();
        setRecording(false);
        if (cancelledRef.current) {
          resolve(null);
          return;
        }
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      recorder.stop();
    });
  }, [releaseStream]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    recorderRef.current?.stop();
  }, []);

  return { recording, seconds, error, start, stop, cancel };
}
