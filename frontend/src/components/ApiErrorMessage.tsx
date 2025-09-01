import React from 'react';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

interface ApiErrorMessageProps {
  error: FetchBaseQueryError & { statusText?: string };
}

const ApiErrorMessage: React.FC<ApiErrorMessageProps> = ({ error }) => {
  let message: string;
  const data: any = (error as any)?.data;
  if (data && typeof data === 'object' && data.detail) {
    message = String(data.detail);
  } else {
    const status = error.status;
    const statusText = (error as any).statusText || (error as any).error || 'Unknown Error';
    message = `HTTP ${status}: ${statusText}`;
  }
  return <>{message}</>;
};

export default ApiErrorMessage;
