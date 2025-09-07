import React, { useState, useRef, useCallback } from 'react';
import { MicIcon, StopIcon, TrashIcon, UploadIcon, VideoIcon } from './IconComponents';

interface AudioInputProps {
    onAudioSubmit: (blob: Blob) => void;
}

type InputMode = 'record' | 'upload';
type RecordingStatus = 'idle' | 'recording' | 'recorded';

const AudioInput: React.FC<AudioInputProps> = ({ onAudioSubmit }) => {
    const [mode, setMode] = useState<InputMode>('record');
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            if (recordingTimeoutRef.current) {
                clearTimeout(recordingTimeoutRef.current);
                recordingTimeoutRef.current = null;
            }
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setAudioBlob(blob);
                setStatus('recorded');
                audioChunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setStatus('recording');

            recordingTimeoutRef.current = setTimeout(() => {
                stopRecording();
            }, 10000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please enable permissions in your browser.");
        }
    }, [stopRecording]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
            setAudioBlob(file);
            setStatus('recorded');
            setMode('upload');
        }
    };
    
    const reset = () => {
        setAudioUrl(null);
        setAudioBlob(null);
        setStatus('idle');
    }

    const handleConfirm = () => {
        if (audioBlob) {
            onAudioSubmit(audioBlob);
        }
    };
    
    return (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex justify-center mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <button 
                    onClick={() => { reset(); setMode('record'); }} 
                    className={`flex-1 p-2 text-sm font-medium transition-colors ${mode === 'record' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Record Voice (10s max)
                </button>
                <button 
                    onClick={() => { reset(); setMode('upload'); }} 
                    className={`flex-1 p-2 text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Upload Audio
                </button>
            </div>
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg min-h-[200px]">
                {status === 'idle' && mode === 'record' && (
                    <button onClick={startRecording} className="flex flex-col items-center justify-center h-24 w-24 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all transform hover:scale-110">
                        <MicIcon />
                        <span className="text-sm font-semibold mt-1">Record</span>
                    </button>
                )}
                 {status === 'idle' && mode === 'upload' && (
                    <label htmlFor="audio-upload" className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50">
                        <UploadIcon />
                        <p className="mt-2 text-sm text-gray-600"><span className="font-semibold text-violet-600">Click to upload</span></p>
                         <p className="text-xs text-gray-500 mt-1">MP3, WAV, WEBM, etc.</p>
                        <input id="audio-upload" type="file" className="sr-only" accept="audio/*" onChange={handleFileChange} />
                    </label>
                )}
                {status === 'recording' && (
                    <div className="flex flex-col items-center">
                         <button onClick={stopRecording} className="flex flex-col items-center justify-center h-24 w-24 bg-gray-700 text-white rounded-full shadow-lg animate-pulse">
                            <StopIcon />
                            <span className="text-sm font-semibold mt-1">Stop</span>
                        </button>
                        <p className="mt-4 text-gray-500">Recording... (max 10 seconds)</p>
                    </div>
                )}
                {status === 'recorded' && audioUrl && (
                    <div className="flex flex-col items-center w-full">
                        <p className="font-semibold mb-2 text-gray-700">Voice Sample Ready</p>
                        <audio src={audioUrl} controls className="w-full mb-4"/>
                        <div className="flex space-x-4">
                            <button onClick={reset} className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300">
                               <TrashIcon className="h-5 w-5 mr-2"/> Discard
                            </button>
                            <button onClick={handleConfirm} className="flex items-center px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600">
                               Confirm & Create Video <VideoIcon className="h-5 w-5 ml-2"/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioInput;