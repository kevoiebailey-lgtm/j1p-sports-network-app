import React from 'react';
import { useFormSubmit, UseFormSubmitOptions } from '../../hooks/useFormSubmit';
import { SubmissionToast } from './SubmissionToast';
import { FormSubmitButton } from './FormSubmitButton';

export interface FormWrapperProps<TData = any, TResult = any> {
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
  submitButtonLabel?: string;
  submitButtonIcon?: React.ReactNode;
  children: (props: {
    isSubmitting: boolean;
    submitSuccess: boolean;
    submitError: string | null;
    submitForm: (data: TData) => void;
    FormSubmitButton: React.FC<{ label?: string; loadingLabel?: string; className?: string }>;
  }) => React.ReactNode;
  getFormData: () => TData;
  className?: string;
}

export function FormWrapper<TData = any, TResult = any>({
  onSubmit,
  onSuccess,
  onError,
  resetForm,
  loadingMessage = 'Saving Form Data...',
  successMessage = '✅ Form Submitted Successfully!',
  errorMessage = '❌ Submission Failed. Please try again.',
  redirectUrl,
  onRedirect,
  redirectDelayMs = 1500,
  submitButtonLabel = 'Submit Entry',
  submitButtonIcon,
  children,
  getFormData,
  className = ''
}: FormWrapperProps<TData, TResult>) {
  const {
    isSubmitting,
    submitSuccess,
    submitError,
    toast,
    submitForm,
    dismissToast
  } = useFormSubmit<TData, TResult>({
    onSubmit,
    onSuccess,
    onError,
    resetForm,
    loadingMessage,
    successMessage,
    errorMessage,
    redirectUrl,
    onRedirect,
    redirectDelayMs
  });

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const data = getFormData();
    submitForm(data);
  };

  const BoundSubmitButton: React.FC<{ label?: string; loadingLabel?: string; className?: string }> = ({
    label = submitButtonLabel,
    loadingLabel = loadingMessage,
    className: btnClassName = ''
  }) => (
    <FormSubmitButton
      isSubmitting={isSubmitting}
      submitSuccess={submitSuccess}
      label={label}
      loadingLabel={loadingLabel}
      icon={submitButtonIcon}
      className={btnClassName}
    />
  );

  return (
    <div className={`relative ${className}`}>
      {/* Top Floating Glassmorphic Submission Toast */}
      <SubmissionToast toast={toast} onClose={dismissToast} />

      {/* Form Element */}
      <form onSubmit={handleSubmitEvent} className="space-y-6">
        {children({
          isSubmitting,
          submitSuccess,
          submitError,
          submitForm: (data: TData) => submitForm(data),
          FormSubmitButton: BoundSubmitButton
        })}
      </form>
    </div>
  );
}
