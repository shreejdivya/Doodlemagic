import { GeneratedScene } from '../types';

const FAL_API_KEY = process.env.FAL_API_KEY as string;

// Model ID for the lipsync process
const LIPSYNC_MODEL_ID = 'fal-ai/sync-lipsync/v2/pro';

const getFalRunUrl = (modelId: string) => `https://api.fal.ai/models/${modelId}/run`;

const blobUrlToDataUrl = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const pollForResult = async (statusUrl: string): Promise<any> => {
    while (true) {
        try {
            const response = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Polling for result failed. Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'COMPLETED') {
                return data.output;
            } else if (data.status === 'FAILED' || data.status === 'ERROR') {
                console.error("Fal.ai processing error:", data);
                throw new Error(`Video generation failed.`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error("Error during polling:", error);
            // Implement a backoff or retry limit if needed
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

const runFalModel = async (modelId: string, payload: any): Promise<any> => {
    const runUrl = getFalRunUrl(modelId);

    const startResponse = await fetch(runUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (startResponse.status !== 202) {
        const errorText = await startResponse.text();
        console.error(`Fal.ai start error for ${modelId}:`, errorText);
        throw new Error(`Failed to start job for ${modelId}. Status: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    const statusUrl = startData.status_url;

    if (!statusUrl) {
        console.error(`Fal.ai response for ${modelId} did not contain status_url:`, startData);
        throw new Error(`Did not receive a polling URL from fal.ai for ${modelId}`);
    }

    console.log(`Job for ${modelId} accepted. Polling at: ${statusUrl}`);
    return await pollForResult(statusUrl);
};

const applyLipsync = async (videoUrl: string, audioUrl: string): Promise<string> => {
    console.log("Preparing for lipsync...");
    const audioDataUrl = await blobUrlToDataUrl(audioUrl);
    
    const payload = {
        video_url: videoUrl,
        audio_url: audioDataUrl,
    };
    
    console.log("Starting lipsync job...");
    const result = await runFalModel(LIPSYNC_MODEL_ID, payload);

    if (result && result.video && result.video.url) {
        console.log("Lipsync complete:", result.video.url);
        return result.video.url;
    }
    console.error("Unexpected result structure from lipsync:", result);
    throw new Error("Could not find video URL in the fal.ai response for lipsync.");
};

export const addNarrationToVideo = async (silentVideoUrl: string, narrationAudioUrl: string): Promise<string> => {
    if (!FAL_API_KEY) {
        console.warn("FAL_API_KEY is not set. Using mock video service.");
        // For mock, just return the silent video URL as there's no real lipsync
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(silentVideoUrl);
            }, 4000);
        });
    }

    // Apply the narration audio and lipsync to the video
    const finalVideoUrl = await applyLipsync(silentVideoUrl, narrationAudioUrl);
    
    return finalVideoUrl;
};