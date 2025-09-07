import React from 'react';
import { DownloadIcon } from './IconComponents';

interface VideoPlayerProps {
    videoUrl: string;
    autoPlay?: boolean;
    loop?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, autoPlay = true, loop = true }) => {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-black rounded-xl shadow-2xl overflow-hidden">
                <video className="w-full" controls autoPlay={autoPlay} loop={loop}>
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            <div className="text-center mt-4">
                <a
                    href={videoUrl}
                    download="doodlemagic-story.mp4"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform hover:scale-105"
                >
                    <DownloadIcon className="h-5 w-5 mr-2" /> Download Video
                </a>
            </div>
        </div>
    );
};

export default VideoPlayer;