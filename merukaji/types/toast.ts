export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
};

export interface ToastContextType {
    showToast: (message: string, type: ToastType, duration?: number) => void;
}