import { useState, useCallback } from 'react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

export interface UseFormSubmitOptions<TData = any, TResult = any> {
  onSubmit: (data: TData) => Promise<TResult>;
  onSuccess?: (result: TResult, data: TData) => void;
  onError?: (error: any) => void;
  resetForm?: () => void;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  redirectUrl?: string | ((result: TResult) => string);
  onRedirect?: (redirectUrl?: string, result?: TResult) => void;
  redirectDelayMs?: number;
}

export interface UseFormSubmitReturn<TData = any, TResult = any> {
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  toast: ToastNotification | null;
  submitForm: (data: TData, e?: React.FormEvent) => Promise<TResult | undefined>;
  dismissToast: () => void;
  resetSubmitState: () => void;
}

export function useFormSubmit<TData = any, TResult = any>(
  options: UseFormSubmitOptions<TData, TResult>
): UseFormSubmitReturn<TData, TResult> {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const {
    onSubmit,
    onSuccess,
    onError,
    resetForm,
    successMessage = 'Form Submitted Successfully!',
    errorMessage = 'Submission Failed. Please try again.',
    redirectUrl,
    onRedirect,
    redirectDelayMs = 1500
  } = options;

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const resetSubmitState = useCallback(() => {
    setIsSubmitting(false);
    setSubmitSuccess(false);
    setSubmitError(null);
    setToast(null);
  }, []);

  const submitForm = useCallback(
    async (data: TData, e?: React.FormEvent): Promise<TResult | undefined> => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      // 1. Immediate Lock & Loading state
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        const result = await onSubmit(data);

        // 2. Success state
        setSubmitSuccess(true);
        setToast({
          id: `toast-${Date.now()}`,
          type: 'success',
          title: 'Success!',
          message: successMessage
        });

        // 3. Reset form inputs
        if (resetForm) {
          resetForm();
        }

        if (onSuccess) {
          onSuccess(result, data);
        }

        // 4. Redirect or Modal close handling after 1.5s delay
        const computedRedirect = typeof redirectUrl === 'function' ? redirectUrl(result) : redirectUrl;

        if (computedRedirect || onRedirect) {
          setTimeout(() => {
            if (onRedirect) {
              onRedirect(computedRedirect, result);
            } else if (computedRedirect) {
              window.location.href = computedRedirect;
            }
          }, redirectDelayMs);
        }

        return result;

      } catch (err: any) {
        // Error handling & retry setup
        console.error('useFormSubmit Error:', err);
        const errMsg = err?.message || errorMessage;
        setSubmitError(errMsg);
        setSubmitSuccess(false);

        setToast({
          id: `toast-${Date.now()}`,
          type: 'error',
          title: 'Submission Error',
          message: errMsg
        });

        if (onError) {
          onError(err);
        }

        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onSuccess, onError, resetForm, successMessage, errorMessage, redirectUrl, onRedirect, redirectDelayMs]
  );

  return {
    isSubmitting,
    submitSuccess,
    submitError,
    toast,
    submitForm,
    dismissToast,
    resetSubmitState
  };
}
