import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import heTranslations from '../locales/he.json';
import enTranslations from '../locales/en.json';

export type Language = 'en' | 'he';
export type TextDirection = 'ltr' | 'rtl';

// The actual JSON structure
type JSONTranslations = typeof enTranslations;

// The flat interface we want to use in the app
interface Translations extends JSONTranslations {
  // Flattened common keys
  cancel?: string;
  ok?: string;
  save?: string;
  delete?: string;
  edit?: string;
  back?: string;
  loading?: string;
  error?: string;
  success?: string;
  
  // Flattened profile keys
  profileTitle?: string;
  welcome?: string;
  guest?: string;
  continueAsGuest?: string;
  loginToAccount?: string;
  createNewAccount?: string;
  joinPawPalsCommunity?: string;
  settings?: string;
  darkMode?: string;
  notifications?: string;
  language?: string;
  helpAndSupport?: string;
  myDogs?: string;
  addNewDog?: string;
  addYourFaithfulFriend?: string;
  dogName?: string;
  breed?: string;
  age?: string;
  weight?: string;
  size?: string;
  gender?: string;
  male?: string;
  female?: string;
  small?: string;
  medium?: string;
  large?: string;
  personality?: string;
  friendly?: string;
  energetic?: string;
  social?: string;
  aggressive?: string;
  description?: string;
  vaccinated?: string;
  medicalInfo?: string;
  addDog?: string;
  addPhoto?: string;
  basicInformation?: string;
  characteristics?: string;
  activity?: string;
  myBadges?: string;
  badgesEarned?: string;
  myStatistics?: string;
  viewYourData?: string;
  visitLog?: string;
  visitHistory?: string;
  points?: string;
  level?: string;
  streak?: string;
  
  // Flattened auth keys
  loginTitle?: string;
  welcomeBack?: string;
  emailAddress?: string;
  enterEmail?: string;
  password?: string;
  enterPassword?: string;
  forgotPassword?: string;
  login?: string;
  or?: string;
  continueWithGoogle?: string;
  noAccount?: string;
  signUpNow?: string;
  registerTitle?: string;
  joinCommunity?: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  createAccount?: string;
  signUpWithGoogle?: string;
  alreadyHaveAccount?: string;
  loginText?: string;
  termsAgreement?: string;
  
  // Flattened home keys
  hello?: string;
  helloGuest?: string;
  discoverParks?: string;
  howCanWeHelpToday?: string;
  signUpNow2?: string;
  getAccessToAllFeatures?: string;
  whatCanYouDo?: string;
  findParks?: string;
  discoverDogParks?: string;
  parkInfo?: string;
  hoursAndFacilities?: string;
  popularParks?: string;
  openNow?: string;
  dailyMissions?: string;
  visitDogPark?: string;
  completed?: string;
  quickActions?: string;
  quickCheckIn?: string;
  scanQrInPark?: string;
  nearbyParks?: string;
  findParksNearby?: string;
  
  // Flattened events keys
  eventsTitle?: string;
  
  // Flattened parks keys
  parksTitle?: string;
  dogParks?: string;
  
  // Flattened social keys
  socialTitle?: string;
  
  // Tab navigation
  homeTab?: string;
  parksTab?: string;
  socialTab?: string;
  eventsTab?: string;
  profileTab?: string;
  checkIn?: string;
}

// Function to flatten nested translations and add direct access keys
function flattenTranslations(trans: JSONTranslations): Translations {
  const flattened: any = { ...trans };
  
  // Add flattened common keys
  if (trans.common) {
    Object.assign(flattened, trans.common);
  }
  
  // Add flattened profile keys
  if (trans.profile) {
    // Keep the nested structure for components that use it
    // But also add flat keys for components that need them
    flattened.profileTitle = trans.profile.title; // Flat access
    flattened.guest = trans.profile.guest;
    flattened.myDogs = trans.profile.myDogs;
    flattened.addDog = trans.profile.addDog;
    flattened.activity = trans.profile.activity;
    flattened.myBadges = trans.profile.myBadges;
    flattened.myStatistics = trans.profile.myStats;
    flattened.visitHistory = trans.profile.visitHistory;
    flattened.settings = trans.profile.settings;
    flattened.darkMode = trans.profile.darkMode;
    flattened.notifications = trans.profile.notifications;
    flattened.language = trans.profile.language;
    flattened.helpAndSupport = trans.profile.helpSupport;
  }
  
  // Add flattened auth keys
  if (trans.auth) {
    flattened.loginTitle = trans.auth.loginTitle;
    flattened.welcomeBack = trans.auth.loginSubtitle;
    flattened.emailAddress = trans.auth.email;
    flattened.password = trans.auth.password;
    flattened.forgotPassword = trans.auth.forgotPassword;
    flattened.login = trans.auth.login;
    flattened.continueWithGoogle = trans.auth.googleSignIn;
    flattened.noAccount = trans.auth.dontHaveAccount;
    flattened.signUpNow = trans.auth.registerNow;
    flattened.registerTitle = trans.auth.registerTitle;
    flattened.joinCommunity = trans.auth.registerSubtitle;
    flattened.firstName = trans.auth.firstName;
    flattened.lastName = trans.auth.lastName;
    flattened.confirmPassword = trans.auth.confirmPassword;
    flattened.alreadyHaveAccount = trans.auth.alreadyHaveAccount;
  }
  
  // Add flattened home keys
  if (trans.home) {
    flattened.hello = trans.home.greeting;
    flattened.helloGuest = trans.home.guestGreeting;
    flattened.discoverParks = trans.home.guestSubtitle;
    flattened.howCanWeHelpToday = trans.home.subtitle;
    flattened.signUpNow2 = trans.home.signUpPrompt;
    flattened.getAccessToAllFeatures = trans.home.signUpDescription;
    flattened.whatCanYouDo = trans.home.whatCanYouDo;
    flattened.findParks = trans.home.findParks;
    flattened.discoverDogParks = trans.home.discoverDogParks;
    flattened.parkInfo = trans.home.parkInfo;
    flattened.hoursAndFacilities = trans.home.hoursAndFacilities;
    flattened.popularParks = trans.home.popularParks;
    flattened.openNow = trans.home.openNow;
    flattened.dailyMissions = trans.home.dailyMissions;
    flattened.visitDogPark = trans.home.visitDogPark;
    flattened.completed = trans.home.completed;
    flattened.quickActions = trans.home.quickActions;
    flattened.quickCheckIn = trans.home.quickCheckin;
    flattened.scanQrInPark = trans.home.scanQrInPark;
    flattened.nearbyParks = trans.home.nearbyParks;
    flattened.findParksNearby = trans.home.findParksNearby;
    flattened.points = trans.home.points;
    flattened.level = trans.home.level;
    flattened.streak = trans.home.streak;
  }
  
  // Add flattened parks keys
  if (trans.parks) {
    // Keep the nested structure for components that use it
    flattened.parksTitle = trans.parks.title; // Flat access
    flattened.dogParks = trans.parks.title; // Also keep dogParks for backwards compatibility
    flattened.searchParks = trans.parks.searchPlaceholder;
    flattened.all = trans.parks.all;
    flattened.nearMe = trans.parks.nearMe;
    flattened.highRating = trans.parks.highRating;
    flattened.loadingParks = trans.parks.loadingParks;
    flattened.checkIn = trans.parks.checkIn;
    flattened.navigate = trans.parks.navigate;
    flattened.public = trans.parks.public;
    flattened.private = trans.parks.private;
    flattened.signUpForCheckinAndMore = trans.parks.signUpForCheckinAndMore;
    flattened.reviews = trans.parks.reviews;
  }
  
  // Add flattened events keys
  if (trans.events) {
    // Keep the nested structure for components that use it
    flattened.eventsTitle = trans.events.title; // Flat access
    flattened.discoverExcitingEvents = trans.events.discoverExcitingEvents;
    flattened.joinEventsAndMeetOthers = trans.events.joinEventsAndMeetOthers;
    flattened.filterEvents = trans.events.filterEvents;
    flattened.upcoming = trans.events.upcoming;
    flattened.myEvents = trans.events.myEvents;
    flattened.participants = trans.events.participants;
    flattened.date = trans.events.date;
    flattened.location = trans.events.location;
    flattened.time = trans.events.time;
    flattened.organizer = trans.events.organizer;
    flattened.participationLevel = trans.events.participationLevel;
    flattened.full = trans.events.full;
    flattened.available = trans.events.available;
    flattened.signUpForEvents = trans.events.authRequired;
  }
  
  // Add flattened social keys
  if (trans.social) {
    // Keep the nested structure for components that use it
    flattened.socialTitle = trans.social.title; // Flat access
    flattened.joinCommunity = trans.social.joinCommunity;
    flattened.connectWithDogOwners = trans.social.joinDescription;
    flattened.signUpForSocial = trans.social.authRequiredMessage;
    flattened.activeFriends = trans.social.activeFriends;
    flattened.recentChats = trans.social.recentChats;
    flattened.community = trans.social.community;
    flattened.sharePhoto = trans.social.sharePhoto;
    flattened.uploadDogPhoto = trans.social.sharePhotoDescription;
    flattened.rateDogs = trans.social.rateDogs;
    flattened.rateDogsYouMet = trans.social.rateDogsDescription;
    flattened.dogDiary = trans.social.dogJournal;
    flattened.recordMeetingsAndExperiences = trans.social.dogJournalDescription;
    flattened.registrationRequired = trans.social.authRequired;
  }
  
  // Add flattened checkin keys
  if (trans.checkin) {
    flattened.quickCheckin = trans.checkin.quickCheckin;
    flattened.scanQR = trans.checkin.scanQR;
    flattened.scanQrToCheckin = trans.checkin.scanQrToCheckin;
    flattened.manualCheckin = trans.checkin.manualCheckin;
    flattened.signUpForCheckin = trans.checkin.signUpForCheckin;
    flattened.registrationRequired = trans.checkin.registrationRequired;
  }
  
  // Add flattened diary keys
  if (trans.diary) {
    flattened.diaryTitle = trans.diary.title;
    flattened.recentActivities = trans.diary.recentActivities;
    flattened.addEntry = trans.diary.addEntry;
    flattened.todaysActivities = trans.diary.todaysActivities;
    flattened.activeMinutes = trans.diary.activeMinutes;
    flattened.pointsToday = trans.diary.pointsToday;
    flattened.recent = trans.diary.recent;
    flattened.calendar = trans.diary.calendar;
    flattened.stats = trans.diary.stats;
    flattened.weeklySummary = trans.diary.weeklySummary;
    flattened.activeDays = trans.diary.activeDays;
    flattened.totalActivities = trans.diary.totalActivities;
    flattened.dailyAverage = trans.diary.dailyAverage;
    flattened.activityTypes = trans.diary.activityTypes;
    flattened.comingSoon = trans.diary.comingSoon;
    flattened.calendarViewDescription = trans.diary.calendarViewDescription;
  }
  
  // Add flattened navigation keys (for tabs)
  if (trans.navigation) {
    flattened.homeTab = trans.navigation.home;
    flattened.parksTab = trans.navigation.parks;
    flattened.socialTab = trans.navigation.social;
    flattened.eventsTab = trans.navigation.events;
    flattened.profileTab = trans.navigation.profile;
  }
  
  // Add default values for missing keys
  flattened.profileTitle = flattened.profileTitle || 'Profile';
  flattened.eventsTitle = flattened.eventsTitle || 'Events';
  flattened.parksTitle = flattened.parksTitle || 'Parks';
  flattened.dogParks = flattened.dogParks || 'Dog Parks';
  flattened.socialTitle = flattened.socialTitle || 'Social';
  flattened.homeTab = flattened.homeTab || 'Home';
  flattened.parksTab = flattened.parksTab || 'Parks';
  flattened.socialTab = flattened.socialTab || 'Social';
  flattened.eventsTab = flattened.eventsTab || 'Events';
  flattened.profileTab = flattened.profileTab || 'Profile';
  flattened.checkIn = flattened.checkIn || 'Check In';
  flattened.welcome = flattened.welcome || 'Welcome!';
  flattened.continueAsGuest = flattened.continueAsGuest || 'Continue as Guest';
  flattened.loginToAccount = flattened.loginToAccount || 'Login to Account';
  flattened.createNewAccount = flattened.createNewAccount || 'Create New Account';
  flattened.joinPawPalsCommunity = flattened.joinPawPalsCommunity || 'Join PawPals Community';
  flattened.addNewDog = flattened.addNewDog || 'Add New Dog';
  flattened.addYourFaithfulFriend = flattened.addYourFaithfulFriend || 'Add your faithful friend';
  flattened.dogName = flattened.dogName || 'Dog Name';
  flattened.breed = flattened.breed || 'Breed';
  flattened.age = flattened.age || 'Age';
  flattened.weight = flattened.weight || 'Weight';
  flattened.size = flattened.size || 'Size';
  flattened.gender = flattened.gender || 'Gender';
  flattened.male = flattened.male || 'Male';
  flattened.female = flattened.female || 'Female';
  flattened.small = flattened.small || 'Small';
  flattened.medium = flattened.medium || 'Medium';
  flattened.large = flattened.large || 'Large';
  flattened.personality = flattened.personality || 'Personality';
  flattened.friendly = flattened.friendly || 'Friendly';
  flattened.energetic = flattened.energetic || 'Energetic';
  flattened.social = flattened.social || 'Social';
  flattened.aggressive = flattened.aggressive || 'Aggressive';
  flattened.description = flattened.description || 'Description';
  flattened.vaccinated = flattened.vaccinated || 'Vaccinated';
  flattened.medicalInfo = flattened.medicalInfo || 'Medical Information';
  flattened.addPhoto = flattened.addPhoto || 'Add Photo';
  flattened.basicInformation = flattened.basicInformation || 'Basic Information';
  flattened.characteristics = flattened.characteristics || 'Characteristics';
  flattened.badgesEarned = flattened.badgesEarned || 'Badges Earned';
  flattened.viewYourData = flattened.viewYourData || 'View Your Data';
  flattened.visitLog = flattened.visitLog || 'Visit Log';
  flattened.enterEmail = flattened.enterEmail || 'Enter email';
  flattened.enterPassword = flattened.enterPassword || 'Enter password';
  flattened.or = flattened.or || 'or';
  flattened.createAccount = flattened.createAccount || 'Create Account';
  flattened.signUpWithGoogle = flattened.signUpWithGoogle || 'Sign up with Google';
  flattened.loginText = flattened.loginText || 'Login';
  flattened.termsAgreement = flattened.termsAgreement || 'Terms & Agreement';
  flattened.km = flattened.km || 'km';
  flattened.noParkAvailable = flattened.noParkAvailable || 'No parks available';
  flattened.friend = flattened.friend || 'Friend';
  flattened.dogOwner = flattened.dogOwner || 'Dog Owner';
  flattened.hours = flattened.hours || 'hours';
  flattened.howIsYourDog = flattened.howIsYourDog || 'How is your dog?';
  flattened.organized = flattened.organized || 'Organized';
  flattened.availableEvents = flattened.availableEvents || 'Available Events';
  flattened.eventIsFull = flattened.eventIsFull || 'Event is Full';
  flattened.signUpToEvent = flattened.signUpToEvent || 'Sign up to Event';
  flattened.joinNow = flattened.joinNow || 'Join Now';
  
  return flattened;
}

const translations: Record<Language, Translations> = {
  en: flattenTranslations(enTranslations),
  he: flattenTranslations(heTranslations as JSONTranslations),
};

interface LanguageContextType {
  language: Language;
  t: Translations;
  textDirection: TextDirection;
  isRTL: boolean;
  changeLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en'); // Default to English
  
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await SecureStore.getItemAsync('language');
      if (savedLanguage === 'he' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
        // Update RTL for Hebrew
        if (savedLanguage === 'he') {
          I18nManager.forceRTL(true);
        } else {
          I18nManager.forceRTL(false);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      setLanguage(lang);
      await SecureStore.setItemAsync('language', lang);
      
      // Update RTL setting
      const shouldUseRTL = lang === 'he';
      I18nManager.forceRTL(shouldUseRTL);
      
      // Note: In a real app, you might want to restart the app here
      // to ensure RTL changes take full effect
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const textDirection: TextDirection = language === 'he' ? 'rtl' : 'ltr';
  const isRTL = language === 'he';
  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ 
      language, 
      t, 
      textDirection, 
      isRTL, 
      changeLanguage 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};