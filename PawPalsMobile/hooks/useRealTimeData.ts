import { useState, useEffect, useCallback } from 'react';
import WebSocketService from '../services/websocket';

interface UseRealTimeDataOptions {
  // Which events to listen to
  events?: string[];
  // Whether to auto-connect/disconnect
  autoConnect?: boolean;
  // Callback for handling data updates
  onDataUpdate?: (event: string, data: any) => void;
}

export const useRealTimeData = <T>(options: UseRealTimeDataOptions = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('not_initialized');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const {
    events = [],
    autoConnect = true,
    onDataUpdate
  } = options;

  const updateConnectionState = useCallback(() => {
    const state = WebSocketService.getConnectionState();
    setConnectionState(state);
    setIsConnected(WebSocketService.isConnected());
  }, []);

  // Handle real-time data updates
  const handleDataUpdate = useCallback((event: string, newData: any) => {
    setData(prevData => {
      // Merge new data with existing data
      const updatedData = typeof prevData === 'object' && prevData !== null
        ? { ...prevData, ...newData }
        : newData;
      
      setLastUpdate(new Date());
      
      // Call custom handler if provided
      if (onDataUpdate) {
        onDataUpdate(event, updatedData);
      }
      
      return updatedData;
    });
  }, [onDataUpdate]);

  // Setup event listeners
  useEffect(() => {
    // Connection state listeners
    const connectionHandler = () => {
      updateConnectionState();
      if (__DEV__) {
        console.log('WebSocket connected - real-time data active');
      }
    };
    
    const disconnectionHandler = (data: any) => {
      updateConnectionState();
      if (__DEV__ && data?.reason !== 'transport close') {
        console.log('WebSocket disconnected:', data?.reason);
      }
    };

    const errorHandler = (error: any) => {
      updateConnectionState();
      // Only log detailed errors in development, and throttle them
      if (__DEV__ && error?.attempts <= 3) {
        console.warn('WebSocket connection issue (development mode)');
      }
    };

    // Add connection listeners
    WebSocketService.on('connected', connectionHandler);
    WebSocketService.on('disconnected', disconnectionHandler);
    WebSocketService.on('connectionError', errorHandler);

    // Add data event listeners
    events.forEach(event => {
      WebSocketService.on(event, (data: any) => handleDataUpdate(event, data));
    });

    // Auto-connect if requested and not connected
    if (autoConnect && !WebSocketService.isConnected()) {
      WebSocketService.connect();
    }

    // Update initial connection state
    updateConnectionState();

    // Cleanup
    return () => {
      WebSocketService.off('connected', connectionHandler);
      WebSocketService.off('disconnected', disconnectionHandler);
      WebSocketService.off('connectionError', errorHandler);
      
      events.forEach(event => {
        WebSocketService.off(event);
      });
    };
  }, [events, autoConnect, handleDataUpdate, updateConnectionState]);

  // Manual data update function
  const updateData = useCallback((newData: T) => {
    setData(newData);
    setLastUpdate(new Date());
  }, []);

  // Connect/disconnect functions
  const connect = useCallback(async () => {
    await WebSocketService.connect();
    updateConnectionState();
  }, [updateConnectionState]);

  const disconnect = useCallback(() => {
    WebSocketService.disconnect();
    updateConnectionState();
  }, [updateConnectionState]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    await WebSocketService.reconnect();
    updateConnectionState();
  }, [updateConnectionState]);

  return {
    // Data state
    data,
    isConnected,
    connectionState,
    lastUpdate,
    
    // Actions
    updateData,
    connect,
    disconnect,
    reconnect,
    
    // Utilities
    isLoading: connectionState === 'connecting',
    hasError: connectionState === 'disconnected' && lastUpdate !== null,
  };
};

// Specialized hooks for different data types

export const useUserRealTimeData = () => {
  return useRealTimeData<any>({
    events: ['notification', 'friendOnline', 'friendOffline'],
    autoConnect: true,
    onDataUpdate: (event, data) => {
      if (__DEV__) {
        console.log(`User real-time update - ${event}:`, data);
      }
    }
  });
};

export const useGardenRealTimeData = () => {
  return useRealTimeData<any>({
    events: ['gardenOccupancyUpdate', 'gardenStatusUpdate'],
    autoConnect: true,
    onDataUpdate: (event, data) => {
      if (__DEV__) {
        console.log(`Garden real-time update - ${event}:`, data);
      }
    }
  });
};

export const useEventRealTimeData = () => {
  return useRealTimeData<any>({
    events: ['eventUpdate'],
    autoConnect: true,
    onDataUpdate: (event, data) => {
      if (__DEV__) {
        console.log(`Event real-time update - ${event}:`, data);
      }
    }
  });
};

export const useChatRealTimeData = () => {
  return useRealTimeData<any>({
    events: ['message', 'userTyping'],
    autoConnect: true,
    onDataUpdate: (event, data) => {
      if (__DEV__) {
        console.log(`Chat real-time update - ${event}:`, data);
      }
    }
  });
};