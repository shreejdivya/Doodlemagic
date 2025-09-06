import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryScene, StoryScript } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateStoryFromDrawing = async (imageBase64: string): Promise<StoryScript> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: imageBase64,
                    },
                },
                {
                    text: `Analyze this child's drawing. Generate a short, 3-scene story script with continuity from scene to scene for a 30-second video based on the main elements in the drawing. The story should be magical, adventurous, and suitable for a young child. Provide the output as a JSON array.`,
                },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
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
                        camera_shot: {
                            type: Type.STRING,
                            description: "A simple camera instruction, e.g., 'Wide shot', 'Close-up on character'.",
                        },
                        apparels: {
                            type: Type.STRING,
                            description: "The apparels should be consistent in all the scenes",
                        },
                    },
                    required: ["scene_number", "description", "camera_shot", "apparels"],
                },
            },
        },
    });

    const jsonString = response.text.trim();
    try {
        const script = JSON.parse(jsonString);
        return script as StoryScript;
    } catch (e) {
        console.error("Failed to parse story script JSON:", e);
        throw new Error("Could not parse the story script from AI response.");
    }
};

export const generateSceneImage = async (
    scene: StoryScene,
    referenceImageBase64: string,
): Promise<string> => {
    const prompt = `Create a scene for a story. The scene depicts: '${scene.description}'. The main character is based on the person in the reference image. Maintain the character's appearance (facial features, hair, skin tone, and clothing specified in apparels) from the reference image. Apparels: "${scene.apparels}". Camera shot: "${scene.camera_shot}".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: referenceImageBase64,
                        mimeType: 'image/jpeg',
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
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image was generated for the scene.");
};