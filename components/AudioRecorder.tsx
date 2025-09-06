import React, { useState, useRef, useCallback } from 'react';
// FIX: Imported VideoIcon to resolve 'Cannot find name' error.
import { MicIcon, StopIcon, PlayIcon, TrashIcon, VideoIcon } from './IconComponents';

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
}

type RecordingStatus = 'idle' | 'recording' | 'recorded' | 'playing';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                setStatus('recorded');
                audioChunksRef.current = [];
            };
            mediaRecorderRef.current.start();
            setStatus('recording');
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please enable permissions in your browser.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, [status]);
    
    const resetRecording = () => {
        setAudioUrl(null);
        setStatus('idle');
    }

    const playAudio = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setStatus('playing');
        }
    };
    
    const handleAudioEnded = () => {
        setStatus('recorded');
    };

    const handleConfirm = () => {
        if(audioUrl) {
           fetch(audioUrl).then(res => res.blob()).then(blob => {
              onRecordingComplete(blob);
           })
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
            {status === 'idle' && (
                <button onClick={startRecording} className="flex flex-col items-center justify-center h-24 w-24 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all transform hover:scale-110">
                    <MicIcon />
                    <span className="text-sm font-semibold mt-1">Record</span>
                </button>
            )}
            {status === 'recording' && (
                 <button onClick={stopRecording} className="flex flex-col items-center justify-center h-24 w-24 bg-gray-700 text-white rounded-full shadow-lg animate-pulse">
                    <StopIcon />
                    <span className="text-sm font-semibold mt-1">Stop</span>
                </button>
            )}
            {(status === 'recorded' || status === 'playing') && audioUrl && (
                <div className="flex flex-col items-center w-full">
                    <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} className="w-full mb-4" controls/>
                    <div className="flex space-x-4">
                        <button onClick={resetRecording} className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300">
                           <TrashIcon/> Re-record
                        </button>
                        <button onClick={handleConfirm} className="flex items-center px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600">
                           Confirm & Create Video <VideoIcon/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioRecorder;