import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProfileContextType {
  notifications: boolean;
  toggleNotifications: (value: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState(true);

  const toggleNotifications = useCallback((value: boolean) => {
    setNotifications(value);
  }, []);

  return (
    <ProfileContext.Provider value={{ notifications, toggleNotifications }}>
      {children}
    </ProfileContext.Provider>
  );
};