import { toast as sonnerToast } from 'sonner';

import Alert from '@/components/uix/alert';

interface ToastButton {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  type?: 'success' | 'error';
  title: string;
  message: string;
  button?: ToastButton;
}

export function useToast() {
  function show({ type = 'success', title, message, button }: ToastOptions) {
    return sonnerToast.custom(id => (
      <Alert
        type={type}
        title={title}
        message={message}
        button={
          button
            ? {
                label: button.label,
                onClick: () => {
                  button.onClick?.();
                  sonnerToast.dismiss(id);
                },
              }
            : undefined
        }
        onDismiss={() => sonnerToast.dismiss(id)}
      />
    ));
  }

  function showError(message: string, title: string = 'Error') {
    return show({
      type: 'error',
      title,
      message,
    });
  }

  return { show, showError };
}
