import { StoryScript } from '../types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY as string;
const VOICE_ADD_URL = 'https://api.elevenlabs.io/v1/voices/add';
const TTS_URL_TEMPLATE = (voiceId: string) => `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

const addVoice = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('files', audioBlob, 'voice_sample.webm');
    formData.append('name', `Doodlemagic Voice ${Date.now()}`);
    formData.append('description', 'A temporary voice clone for a Doodlemagic story.');

    const response = await fetch(VOICE_ADD_URL, {
        method: 'POST',
        headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs Add Voice Error:", errorText);
        throw new Error(`Failed to add voice. Status: ${response.status}`);
    }

    const { voice_id } = await response.json();
    if (!voice_id) {
        throw new Error("Could not get voice_id from ElevenLabs response.");
    }
    return voice_id;
};

const generateSpeech = async (text: string, voiceId: string): Promise<string> => {
    const payload = {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
        },
    };

    const response = await fetch(TTS_URL_TEMPLATE(voiceId), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
            'accept': 'audio/mpeg',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs TTS Error:", errorText);
        throw new Error(`Failed to generate speech. Status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
};

export const cloneVoiceAndGenerateNarrations = async (
    audioBlob: Blob, 
    storyScript: StoryScript
): Promise<string> => {
    if (!ELEVENLABS_API_KEY) {
        console.warn("ELEVENLABS_API_KEY is not set. Using mock service.");
        const mockUrl = "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg";
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(mockUrl);
            }, 1000);
        });
    }

    console.log("Cloning voice with ElevenLabs...");
    const voiceId = await addVoice(audioBlob);
    console.log(`Voice cloned successfully. Voice ID: ${voiceId}`);
    
    console.log("Generating single narration for the whole story...");
    const fullNarrationText = storyScript.map(scene => scene.conversation).join(' \n');
    console.log(`Generating audio for text: "${fullNarrationText}"`);
    const narrationUrl = await generateSpeech(fullNarrationText, voiceId);
    
    console.log("Full narration generated.");
    return narrationUrl;
};
