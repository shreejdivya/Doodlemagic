import React, { useState, useCallback, useMemo } from 'react';
import { AppStep, StepStatus, StoryScript, GeneratedScene } from './types';
import { generateStoryFromDrawing, generateSceneImage } from './services/geminiService';
import { generateVideo } from './services/falService';
import { cloneVoiceAndNarrate } from './services/elevenLabsService';
import Step from './components/Step';
import FileUpload from './components/FileUpload';
import { MagicWandIcon, PictureIcon, VideoIcon, MicIcon, PlayIcon, SparklesIcon, LogoIcon } from './components/IconComponents';
import SceneGallery from './components/SceneGallery';
import AudioRecorder from './components/AudioRecorder';
import Spinner from './components/Spinner';
import VideoPlayer from './components/VideoPlayer';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};


export default function App() {
    const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.DRAWING);
    const [drawing, setDrawing] = useState<File | null>(null);
    const [childPhoto, setChildPhoto] = useState<File | null>(null);
    const [storyScript, setStoryScript] = useState<StoryScript | null>(null);
    const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
    const [narrationUrl, setNarrationUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    const getStepStatus = useCallback((step: AppStep): StepStatus => {
        const stepOrder = [AppStep.DRAWING, AppStep.PHOTO, AppStep.SCENES, AppStep.VOICE, AppStep.VIDEO, AppStep.FINALE];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(step);
        if (stepIndex < currentIndex) return StepStatus.COMPLETED;
        if (stepIndex === currentIndex) return StepStatus.ACTIVE;
        return StepStatus.PENDING;
    }, [currentStep]);

    const handleGenerateScript = async () => {
        if (!drawing) return;
        setIsLoading(true);
        setLoadingMessage('Our storytellers are analyzing your drawing...');
        setError(null);
        try {
            const drawingBase64 = await fileToBase64(drawing);
            const script = await generateStoryFromDrawing(drawingBase64);
            setStoryScript(script);
            setCurrentStep(AppStep.PHOTO);
            setDrawing(null); // Clear the drawing after use
        } catch (err) {
            setError('Could not generate story. Please try another drawing.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateScenes = async () => {
        if (!childPhoto || !storyScript) return;
        setIsLoading(true);
        setError(null);
        setGeneratedScenes([]);

        try {
            const childPhotoBase64 = await fileToBase64(childPhoto);
            const generatedImagesBase64: string[] = [];

            for (const scene of storyScript) {
                setLoadingMessage(`Creating character for scene ${scene.scene_number}...`);
                
                // For the first scene, use the child's photo as reference.
                // For subsequent scenes, use the previously generated image to maintain consistency.
                const referenceImageBase64 = generatedImagesBase64.length === 0 
                    ? childPhotoBase64 
                    : generatedImagesBase64[generatedImagesBase64.length - 1];
                
                const sceneImageBase64 = await generateSceneImage(scene, referenceImageBase64);
                
                setGeneratedScenes(prev => [...prev, {
                    scene_number: scene.scene_number,
                    imageUrl: `data:image/png;base64,${sceneImageBase64}`,
                    description: scene.description,
                }]);

                generatedImagesBase64.push(sceneImageBase64);
            }
            setCurrentStep(AppStep.VOICE);
            setChildPhoto(null); // Clear the photo after use
        } catch (err) {
            setError('Could not create scenes. Please try another photo.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateVideo = async () => {
        if (generatedScenes.length === 0) return;
        setIsLoading(true);
        setError(null);
        const messages = ["Stitching scenes together...", "Adding magical sparkle...", "Rendering your animation..."];
        let messageIndex = 0;
        const intervalId = setInterval(() => {
            setLoadingMessage(messages[messageIndex % messages.length]);
            messageIndex++;
        }, 2000);

        try {
            const imageUrls = generatedScenes.map(s => s.imageUrl);
            const videoUrl = await generateVideo(imageUrls);
            setFinalVideoUrl(videoUrl);
            setCurrentStep(AppStep.FINALE);
        } catch (err) {
            setError('Could not create the video. Please try again.');
            console.error(err);
        } finally {
            clearInterval(intervalId);
            setIsLoading(false);
        }
    };

    const handleAudioRecorded = async (blob: Blob) => {
        setAudioBlob(blob);
        setIsLoading(true);
        setLoadingMessage('Cloning voice and adding narration...');
        setError(null);
        try {
            const narration = await cloneVoiceAndNarrate(blob, storyScript?.map(s => s.description).join(' ') ?? '');
            setNarrationUrl(narration);
            await handleGenerateVideo(); 
        } catch(err) {
             setError('Could not process your voice. Please try recording again.');
             console.error(err);
             setIsLoading(false);
        }
    };
    
    const mainContent = useMemo(() => {
        switch(currentStep) {
            case AppStep.DRAWING:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Upload a Drawing</h2>
                        <p className="text-gray-500 mb-6">Let's start the magic! Upload your child's masterpiece.</p>
                        <FileUpload onFileSelect={setDrawing} file={drawing} />
                        {drawing && (
                            <button onClick={handleGenerateScript} className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-transform transform hover:scale-105">
                                <MagicWandIcon /> Generate Story
                            </button>
                        )}
                    </div>
                );
            case AppStep.PHOTO:
                 return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Upload a Photo</h2>
                        <p className="text-gray-500 mb-6">Now, let's add the star of the show! Upload a photo of your child.</p>
                        <FileUpload onFileSelect={setChildPhoto} file={childPhoto} accept="image/jpeg, image/png" />
                         <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                           <p className="font-bold">Privacy Note</p>
                           <p>Your photos are only used to generate the story and are not stored.</p>
                         </div>
                        {childPhoto && (
                            <button onClick={handleGenerateScenes} className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-transform transform hover:scale-105">
                                <PictureIcon /> Create Character Scenes
                            </button>
                        )}
                    </div>
                );
            case AppStep.VOICE:
                 return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Record Your Voice</h2>
                        <p className="text-gray-500 mb-6">Record the narrator's voice to bring the story to life.</p>
                        <AudioRecorder onRecordingComplete={handleAudioRecorded} />
                    </div>
                 );
            case AppStep.FINALE:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Your Doodlemagic Story!</h2>
                        <p className="text-gray-500 mb-6">Watch the magic unfold. Your story is ready!</p>
                        {finalVideoUrl && <VideoPlayer videoUrl={finalVideoUrl} audioUrl={narrationUrl} />}
                        <button onClick={() => window.location.reload()} className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-violet-500 hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-transform transform hover:scale-105">
                           <SparklesIcon /> Create Another Story
                        </button>
                    </div>
                );
            default: return null;
        }
    }, [currentStep, drawing, childPhoto, finalVideoUrl, narrationUrl]);


    return (
        <div className="min-h-screen font-sans p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-10">
                    <div className="inline-flex items-center gap-4">
                      <LogoIcon/>
                      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-violet-500 to-teal-500">
                          Doodlemagic
                      </h1>
                    </div>
                    <p className="text-gray-600 mt-2 text-lg">Turn drawings into animated stories with a touch of magic.</p>
                </header>

                {isLoading && <Spinner message={loadingMessage} />}

                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mb-6" role="alert"><p className="font-bold">Oh no!</p><p>{error}</p></div>}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <aside className="md:col-span-1">
                        <nav className="space-y-4">
                            <Step stepNumber={1} title="The Drawing" status={getStepStatus(AppStep.DRAWING)} icon={<MagicWandIcon />}/>
                            <Step stepNumber={2} title="The Star" status={getStepStatus(AppStep.PHOTO)} icon={<PictureIcon />} />
                            <Step stepNumber={3} title="The Voice" status={getStepStatus(AppStep.VOICE)} icon={<MicIcon />} />
                            <Step stepNumber={4} title="The Magic" status={getStepStatus(AppStep.FINALE)} icon={<PlayIcon />} />
                        </nav>
                    </aside>
                    
                    <main className="md:col-span-3 bg-white p-8 rounded-2xl shadow-lg">
                        {mainContent}
                    </main>
                </div>

                {storyScript && (
                    <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-700 mb-4">Generated Story Script</h3>
                        <ul className="space-y-2 text-gray-600">
                           {storyScript.map(scene => (
                               <li key={scene.scene_number}><strong>Scene {scene.scene_number}:</strong> {scene.description}</li>
                           ))}
                        </ul>
                    </div>
                )}

                {generatedScenes.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-2xl font-bold text-gray-700 mb-4 text-center">Generated Scenes</h3>
                         <SceneGallery scenes={generatedScenes} />
                    </div>
                )}
            </div>
        </div>
    );
}