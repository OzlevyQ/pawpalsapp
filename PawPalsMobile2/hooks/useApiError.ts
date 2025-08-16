import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export const useApiError = () => {
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isRTL } = useLanguage();

  const showError = useCallback((error: ApiError | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const title = isRTL ? 'שגיאה' : 'Error';
    
    Alert.alert(title, errorMessage, [
      { text: isRTL ? 'אוקיי' : 'OK' }
    ]);
  }, [isRTL]);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options?: {
      showErrorAlert?: boolean;
      loadingState?: boolean;
    }
  ): Promise<T | null> => {
    const {
      showErrorAlert = true,
      loadingState = true
    } = options || {};

    try {
      if (loadingState) {
        setIsLoading(true);
      }
      setError(null);

      const result = await apiCall();
      return result;
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        code: (err as any)?.code,
        details: err
      };

      setError(apiError);

      if (showErrorAlert) {
        showError(apiError);
      }

      return null;
    } finally {
      if (loadingState) {
        setIsLoading(false);
      }
    }
  }, [showError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    showError,
    handleApiCall,
    clearError
  };
};