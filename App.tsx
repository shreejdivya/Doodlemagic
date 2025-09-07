import React, { useState, useCallback, useMemo } from 'react';
import { AppStep, StepStatus, StoryScript, GeneratedScene } from './types';
import { generateStoryFromDrawing, generateSceneImage, generateVideoFromScenes } from './services/geminiService';
import Step from './components/Step';
import FileUpload from './components/FileUpload';
import { MagicWandIcon, PictureIcon, VideoIcon, PlayIcon, SparklesIcon, LogoIcon, BookIcon } from './components/IconComponents';
import Spinner from './components/Spinner';
import VideoPlayer from './components/VideoPlayer';
import StorybookView from './components/StorybookView';

const fileToMimeAndBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
            if (match) {
                resolve({ mimeType: match[1], base64: match[2] });
            } else {
                reject(new Error("Could not parse file data URL."));
            }
        };
        reader.onerror = error => reject(error);
    });
};


export default function App() {
    const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.DRAWING);
    const [drawing, setDrawing] = useState<File | null>(null);
    const [childPhoto, setChildPhoto] = useState<File | null>(null);
    const [storyScript, setStoryScript] = useState<StoryScript | null>(null);
    const [storyTitle, setStoryTitle] = useState<string | null>(null);
    const [videoPrompt, setVideoPrompt] = useState<string | null>(null);
    const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([]);
    const [silentVideoUrl, setSilentVideoUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    const getStepStatus = useCallback((step: AppStep): StepStatus => {
        const stepOrder = [AppStep.DRAWING, AppStep.PHOTO, AppStep.SCENES, AppStep.FINALE];
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
            const { base64: drawingBase64, mimeType: drawingMimeType } = await fileToMimeAndBase64(drawing);
            const { title, script, videoPrompt } = await generateStoryFromDrawing(drawingBase64, drawingMimeType);
            setStoryScript(script);
            setStoryTitle(title);
            setVideoPrompt(videoPrompt);
            setCurrentStep(AppStep.PHOTO);
            setDrawing(null); // Clear the drawing after use
        } catch (err) {
            setError('Could not generate story. Please try another drawing.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSilentVideo = async () => {
        if (!videoPrompt || !generatedScenes || generatedScenes.length === 0) return;
        setIsLoading(true);
        setError(null);
        const messages = ["Directing your movie...", "Setting up the cameras...", "Action! Filming your story...", "Quiet on the set..."];
        let messageIndex = 0;
        setLoadingMessage(messages[0]);
        const intervalId = setInterval(() => {
            messageIndex++;
            setLoadingMessage(messages[messageIndex % messages.length]);
        }, 10000);

        try {
            const videoUrl = await generateVideoFromScenes(videoPrompt, generatedScenes);
            setSilentVideoUrl(videoUrl);
            setCurrentStep(AppStep.FINALE);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Could not create the silent video. Please try again.';
            setError(errorMessage);
            console.error(err);
        } finally {
            clearInterval(intervalId);
            setIsLoading(false);
        }
    };

    const handleGenerateScenes = async () => {
        if (!childPhoto || !storyScript) return;
        setIsLoading(true);
        setError(null);
        setGeneratedScenes([]);
        const newScenes: GeneratedScene[] = [];

        try {
            const { base64: childPhotoBase64, mimeType: childPhotoMimeType } = await fileToMimeAndBase64(childPhoto);
            const generatedImages: { base64: string; mimeType: string }[] = [];

            for (const scene of storyScript) {
                setLoadingMessage(`Creating character for scene ${scene.scene_number}...`);
                
                const referenceImage = generatedImages.length === 0 
                    ? { base64: childPhotoBase64, mimeType: childPhotoMimeType }
                    : generatedImages[generatedImages.length - 1];
                
                const { imageBase64: sceneImageBase64, mimeType: sceneMimeType } = await generateSceneImage(scene, referenceImage.base64, referenceImage.mimeType);
                
                const newScene = {
                    scene_number: scene.scene_number,
                    imageUrl: `data:${sceneMimeType};base64,${sceneImageBase64}`,
                    description: scene.description,
                    rhyming_stanza: scene.rhyming_stanza,
                    conversation: scene.conversation,
                };
                newScenes.push(newScene);
                setGeneratedScenes(prev => [...prev, newScene]);
                generatedImages.push({ base64: sceneImageBase64, mimeType: sceneMimeType });
            }
            setChildPhoto(null); // Clear the photo after use
            setCurrentStep(AppStep.SCENES);

        } catch (err) {
            setError('Could not create scenes. Please try another photo.');
            console.error(err);
        } finally {
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
                                <MagicWandIcon className="h-5 w-5 mr-2" /> Generate Story
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
                                <PictureIcon className="h-5 w-5 mr-2" /> Create Character Scenes
                            </button>
                        )}
                    </div>
                );
            case AppStep.SCENES:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2 text-center">Your Storybook is Ready!</h2>
                        <div className="mb-8 text-left">
                            <StorybookView scenes={generatedScenes} title={storyTitle} />
                        </div>
                        <div className="p-6 bg-violet-50 rounded-xl shadow-inner border border-violet-100 text-center">
                             <p className="text-gray-500 mb-6">Review your magical story above. When you're ready, we'll turn it into a video!</p>
                             <button onClick={handleGenerateSilentVideo} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-violet-500 hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-transform transform hover:scale-105">
                                <VideoIcon className="h-5 w-5 mr-2" /> Bring it to life!
                            </button>
                        </div>
                    </div>
                );
            case AppStep.FINALE:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">Your Doodlemagic Story!</h2>
                        <p className="text-gray-500 mb-6">Here is your animated story. We hope you love it!</p>
                        {silentVideoUrl && <VideoPlayer videoUrl={silentVideoUrl} autoPlay={true} loop={true} />}
                        
                        <div className="mt-10 p-6 bg-violet-50 rounded-xl shadow-inner border border-violet-100">
                            <h3 className="text-xl font-bold text-violet-700 mb-2">Coming Soon!</h3>
                            <p className="text-gray-600">
                                Get ready for even more magic! We're working on features like swapping your child's photo and even cloning their voice to narrate the story — turning it into a truly personal keepsake.
                            </p>
                        </div>

                        <button onClick={() => window.location.reload()} className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-violet-500 hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-transform transform hover:scale-105">
                           <SparklesIcon className="h-5 w-5 mr-2" /> Create Another Story
                        </button>
                    </div>
                );
            default: return null;
        }
    }, [currentStep, drawing, childPhoto, silentVideoUrl, storyScript, generatedScenes, storyTitle, videoPrompt]);


    return (
        <div className="min-h-screen font-sans p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="text-center mb-10 print-hide">
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
                    <aside className="md:col-span-1 print-hide">
                        <nav className="space-y-4">
                            <Step stepNumber={1} title="The Drawing" status={getStepStatus(AppStep.DRAWING)} icon={<MagicWandIcon />}/>
                            <Step stepNumber={2} title="The Star" status={getStepStatus(AppStep.PHOTO)} icon={<PictureIcon />} />
                            <Step stepNumber={3} title="The Storybook" status={getStepStatus(AppStep.SCENES)} icon={<BookIcon />} />
                            <Step stepNumber={4} title="The Magic" status={getStepStatus(AppStep.FINALE)} icon={<PlayIcon />} />
                        </nav>
                    </aside>
                    
                    <main className="md:col-span-3 bg-white p-8 rounded-2xl shadow-lg">
                        {mainContent}
                    </main>
                </div>
            </div>
        </div>
    );
}