import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryScene, StoryScript, GeneratedScene } from "../types";
const genApiKey = process.env.API_KEY as string;

const ai = new GoogleGenAI({ apiKey: genApiKey });

export const generateStoryFromDrawing = async (imageBase64: string, mimeType: string): Promise<{ title: string; script: StoryScript; videoPrompt: string; }> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: imageBase64,
                    },
                },
                {
                    text: `Analyze this child's drawing. Generate a short, 4-scene conversational story script for a 8-second video, a short, catchy title, and a separate, single-paragraph "video prompt" for a text-to-video AI model. The story script must be magical, adventurous, cinematic, and strictly suitable for a young child. The "video prompt" should be a vivid, highly-detailed, and cinematic description of the entire story arc, suitable for an adult-facing video generation model. It should focus on visual elements, camera movements (like 'dynamic drone shot', 'close-up'), and overall mood, while avoiding words like "child", "kid", or "toddler". It must also include the dialogue from the 'conversation' field for each scene, enclosed in double quotes. For each scene in the script, include a short line of conversation or a sound effect, and a short, simple, rhyming stanza (2-4 lines) that poetically describes the scene for a child to read in a storybook. Provide the entire output as a single JSON object.`,
                },
            ],
        },
        config: {
            systemInstruction: "You are a creative storyteller for young children. Your primary goal is to generate content that is 100% safe, wholesome, and positive. Avoid any words, even common ones, that could be flagged by safety filters (e.g., words related to violence, conflict, or any mature themes). Focus on themes of friendship, wonder, and gentle adventure.",
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "A short, catchy title for the story."
                    },
                    video_prompt: {
                        type: Type.STRING,
                        description: "A single, descriptive paragraph for a video generation model, focusing on visual elements and cinematic language. This prompt should be safe for all audiences and avoid direct references to children."
                    },
                    scenes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene_number: {
                                    type: Type.INTEGER,
                                    description: "The sequence number of the scene.",
                                },
                                description: {
                                    type: Type.STRING,
                                    description: "A detailed one-sentence description of the action and setting in this scene.",
                                },
                                rhyming_stanza: {
                                    type: Type.STRING,
                                    description: "A short, 2-4 line rhyming stanza describing the scene poetically for a child.",
                                },
                                camera_shot: {
                                    type: Type.STRING,
                                    description: "A simple camera instruction, e.g., 'Wide shot', 'Close-up on character'.",
                                },
                                apparels: {
                                    type: Type.STRING,
                                    description: "The apparels should be consistent in all the scenes",
                                },
                                conversation: {
                                    type: Type.STRING,
                                    description: "A short line of dialogue or a sound effect for the scene.",
                                },
                            },
                            required: ["scene_number", "description", "rhyming_stanza", "camera_shot", "apparels", "conversation"],
                        },
                    }
                },
                required: ["title", "video_prompt", "scenes"],
            },
        },
    });

    const jsonString = response.text.trim();
    try {
        const storyData = JSON.parse(jsonString);
        return { title: storyData.title, script: storyData.scenes as StoryScript, videoPrompt: storyData.video_prompt };
    } catch (e) {
        console.error("Failed to parse story script JSON:", e);
        throw new Error("Could not parse the story script from AI response.");
    }
};

export const generateSceneImage = async (
    scene: StoryScene,
    referenceImageBase64: string,
    referenceImageMimeType: string,
): Promise<{ imageBase64: string; mimeType: string }> => {
    const prompt = `Create a cinematic scene. The scene should depict: ${scene.description}.
    The main character must be based on the person in the reference image — use the same face and skin tone to ensure consistency. Keep the character’s body features unchanged.
    Clothing/Apparel: ${scene.apparels}.
    Camera shot/angle: ${scene.camera_shot}.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: referenceImageBase64,
                        mimeType: referenceImageMimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { 
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
        };
      }
    }
    
    throw new Error("No image was generated for the scene.");
};

export const generateVideoFromScenes = async (
    videoPrompt: string,
    generatedScenes: GeneratedScene[]
): Promise<string> => {
    if (generatedScenes.length === 0) {
        throw new Error("No scenes provided for video generation.");
    }

    const firstSceneImageUrl = generatedScenes[0].imageUrl;
    const match = firstSceneImageUrl.match(/^data:(image\/.+);base64,(.+)$/);

    if (!match) {
        throw new Error("Invalid data URL for the first scene image.");
    }
    const mimeType = match[1];
    const imageBase64 = match[2];
    let operation = await ai.models.generateVideos({
        model: 'veo-3.0-generate-preview',
        prompt: videoPrompt,
        // image: {
        //     imageBytes: imageBase64,
        //     mimeType: mimeType,
        // },
        config: {
            numberOfVideos: 1
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!downloadLink) {
        console.error("VEO operation finished but no video URI found. Full response:", JSON.stringify(operation, null, 2));
        if (operation.error) {
             throw new Error(`Video generation failed: ${operation.error.message}`);
        }
        // FIX: The `finishReason` property might not be present in the SDK's `GeneratedVideo` type definition.
        // We cast to `any` to access it, as it's expected in the runtime response for blocked content.
        const finishReason = (operation.response?.generatedVideos?.[0] as any)?.finishReason;
        if (finishReason && finishReason !== 'FINISH_REASON_UNSPECIFIED' && finishReason !== 'SUCCESS') {
             throw new Error(`Video generation was blocked. Reason: ${finishReason}`);
        }
        throw new Error("Video generation succeeded but no download link was provided.");
    }

    if (!genApiKey) {
      throw new Error("API_KEY environment variable not set.");
    }

    const response = await fetch(`${downloadLink}&key=${genApiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to download video file. Status: ${response.status}`);
    }
    
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};