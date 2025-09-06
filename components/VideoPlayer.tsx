
import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
    videoUrl: string;
    audioUrl: string | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, audioUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [videoUrl, audioUrl]);

    return (
        <div className="w-full max-w-2xl mx-auto bg-black rounded-xl shadow-2xl overflow-hidden">
            <video ref={videoRef} className="w-full" controls autoPlay muted={!audioUrl}>
                <source src={videoUrl} type="video/mp4" />
                {audioUrl && <source src={audioUrl} type="audio/webm" />}
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

export default VideoPlayer;
