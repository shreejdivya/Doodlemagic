export interface StoryScene {
  scene_number: number;
  description: string;
  camera_shot: string;
  apparels: string;
  conversation: string;
}

export type StoryScript = StoryScene[];

export interface GeneratedScene {
    scene_number: number;
    imageUrl: string;
    description: string;
    conversation: string;
}

export enum AppStep {
  DRAWING = 'DRAWING',
  PHOTO = 'PHOTO',
  SCENES = 'SCENES',
  FINALE = 'FINALE',
}

export enum StepStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
}