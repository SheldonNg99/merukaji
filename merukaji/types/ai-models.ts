export type AIModelType = 'google' | 'openai';

export interface AIModel {
    value: AIModelType;
    label: string;
}

export interface AIModelDropdownProps {
    selectedModel: AIModelType | null;
    onChange: (model: AIModelType) => void;
}