import React from 'react';
import { GeneratedScene } from '../types';

interface SceneGalleryProps {
    scenes: GeneratedScene[];
}

const SceneGallery: React.FC<SceneGalleryProps> = ({ scenes }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
                <div key={scene.scene_number} className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300">
                    <div className="aspect-video w-full bg-gray-100">
                        <img 
                            src={scene.imageUrl} 
                            alt={`Scene ${scene.scene_number}`} 
                            className="w-full h-full object-contain" 
                        />
                    </div>
                    <div className="p-4">
                        <p className="text-sm font-bold text-violet-600">Scene {scene.scene_number}</p>
                        <p className="text-gray-600 mt-1 text-sm">{scene.description}</p>
                        <blockquote className="mt-2 p-2 border-l-4 border-violet-100 bg-violet-50 text-violet-800 text-sm italic">
                            "{scene.conversation}"
                        </blockquote>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SceneGallery;