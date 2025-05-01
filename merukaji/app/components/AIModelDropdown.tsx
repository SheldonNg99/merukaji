import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { AIModel, AIModelDropdownProps } from '@/types/ai-models';

export default function AIModelDropdown({ selectedModel, onChange, disabled = false }: AIModelDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const models: AIModel[] = [
        { value: 'google', label: 'Google AI' },
        { value: 'openai', label: 'OpenAI' }
    ];

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`h-12 px-4 rounded-xl bg-gray-50 dark:bg-[#2E2E2E] text-gray-600 dark:text-gray-300 
                  transition-colors flex items-center gap-2 border border-transparent dark:border-gray-700
                  ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-100 dark:hover:bg-[#383838] cursor-pointer shadow-sm'}`}
            >
                <span className="text-sm">{selectedModel ? models.find(m => m.value === selectedModel)?.label : 'Auto-select AI'}</span>
                <ChevronDown className="h-4 w-4" />
            </button>

            {isOpen && !disabled && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-[#2E2E2E] border border-gray-100 
                      dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {models.map((model) => (
                            <li
                                key={model.value}
                                onClick={() => {
                                    onChange(model.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#383838] cursor-pointer 
                          transition-colors text-sm ${selectedModel === model.value
                                        ? 'text-orange-500 dark:text-orange-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {model.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}