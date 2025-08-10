import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Language = 'en' | 'he';
export type TextDirection = 'ltr' | 'rtl';

interface Translations {
  // Common
  cancel: string;
  ok: string;
  save: string;
  delete: string;
  edit: string;
  back: string;
  loading: string;
  error: string;
  success: string;
  
  // Profile Screen
  profile: string;
  welcome: string;
  guest: string;
  continueAsGuest: string;
  loginToAccount: string;
  createNewAccount: string;
  joinPawPalsCommunity: string;
  settings: string;
  darkMode: string;
  notifications: string;
  language: string;
  helpAndSupport: string;
  myDogs: string;
  addNewDog: string;
  addYourFaithfulFriend: string;
  dogName: string;
  breed: string;
  age: string;
  weight: string;
  size: string;
  gender: string;
  male: string;
  female: string;
  small: string;
  medium: string;
  large: string;
  personality: string;
  friendly: string;
  energetic: string;
  social: string;
  aggressive: string;
  description: string;
  vaccinated: string;
  medicalInfo: string;
  addDog: string;
  addPhoto: string;
  basicInformation: string;
  characteristics: string;
  activity: string;
  myBadges: string;
  badgesEarned: string;
  myStatistics: string;
  viewYourData: string;
  visitLog: string;
  visitHistory: string;
  points: string;
  level: string;
  streak: string;
  
  // Auth Screens
  loginTitle: string;
  welcomeBack: string;
  emailAddress: string;
  enterEmail: string;
  password: string;
  enterPassword: string;
  forgotPassword: string;
  login: string;
  or: string;
  continueWithGoogle: string;
  noAccount: string;
  signUpNow: string;
  registerTitle: string;
  joinCommunity: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
  createAccount: string;
  signUpWithGoogle: string;
  alreadyHaveAccount: string;
  loginText: string;
  termsAgreement: string;
  
  // Home Screen
  hello: string;
  helloGuest: string;
  discoverParks: string;
  howCanWeHelpToday: string;
  signUpNow2: string;
  getAccessToAllFeatures: string;
  whatCanYouDo: string;
  findParks: string;
  discoverDogParks: string;
  parkInfo: string;
  hoursAndFacilities: string;
  popularParks: string;
  openNow: string;
  dailyMissions: string;
  visitDogPark: string;
  completed: string;
  quickActions: string;
  quickCheckIn: string;
  scanQrInPark: string;
  nearbyParks: string;
  findParksNearby: string;
  
  // Language Selection
  selectLanguage: string;
  english: string;
  hebrew: string;
  languageChanged: string;
  
  // Parks Screen
  dogParks: string;
  searchParks: string;
  all: string;
  nearMe: string;
  openNow: string;
  highRating: string;
  loading: string;
  loadingParks: string;
  checkIn: string;
  navigate: string;
  public: string;
  private: string;
  km: string;
  signUpForCheckinAndMore: string;
  noParkAvailable: string;
  reviews: string;
  
  // Social Screen
  social: string;
  joinCommunity: string;
  connectWithDogOwners: string;
  signUpForSocialFeatures: string;
  activeFriends: string;
  recentChats: string;
  friend: string;
  dogOwner: string;
  community: string;
  sharePhoto: string;
  uploadDogPhoto: string;
  rateDogs: string;
  rateDogsYouMet: string;
  dogDiary: string;
  recordMeetingsAndExperiences: string;
  registrationRequired: string;
  signUpForSocial: string;
  hours: string;
  howIsYourDog: string;
  
  // Events Screen
  events: string;
  discoverExcitingEvents: string;
  joinEventsAndMeetOthers: string;
  filterEvents: string;
  upcoming: string;
  myEvents: string;
  participants: string;
  organized: string;
  availableEvents: string;
  eventIsFull: string;
  signUpToEvent: string;
  joinNow: string;
  date: string;
  location: string;
  time: string;
  organizer: string;
  participationLevel: string;
  full: string;
  available: string;
  signUpForEvents: string;
  
  // Tab Navigation
  homeTab: string;
  parksTab: string;
  socialTab: string;
  eventsTab: string;
  profileTab: string;
  
  // Garden Details
  details: string;
  address: string;
  hoursToday: string;
  facilities: string;
  parking: string;
  water: string;
  shade: string;
  lighting: string;
  fencing: string;
  wasteDisposal: string;
  seating: string;
  agilityEquipment: string;
  currentVisitors: string;
  dogsCurrentlyActive: string;
  hoursNotAvailable: string;
  addressNotAvailable: string;
  closedToday: string;
  
  // Status
  openNowStatus: string;
  closedNowStatus: string;
  unknown: string;
  
  // Notifications
  notifications: string;
  newMessages: string;
  markAllAsRead: string;
  viewAll: string;
  noNotifications: string;
  allNotificationsWillAppearHere: string;
  goToFullNotificationsPage: string;
  ago: string;
  newEvent: string;
  newFriend: string;
  newAchievement: string;
  reminder: string;
  
  // Navigation
  selectNavigationApp: string;
  openWith: string;
  appleMaps: string;
  googleMaps: string;
  waze: string;
  navigationNotAvailable: string;
  errorOpeningNavigation: string;
  installNavigationApp: string;
  noNavigationAppsFound: string;
  openInBrowser: string;

  // QR Scanner
  scanQR: string;
  scanQrToCheckin: string;
  scanning: string;
  scanQrInPark: string;
  quickCheckin: string;
  positionQrWithinFrame: string;
  qrScanAutomatically: string;
  manualCheckin: string;
  cameraPermissionRequired: string;
  cameraPermissionMessage: string;
  grantPermission: string;
  goBack: string;
  processing: string;
  invalidQrCode: string;
  invalidQrMessage: string;
  scanAgain: string;
  checkinSuccessful: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Common
    cancel: 'Cancel',
    ok: 'OK',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Profile Screen
    profile: 'Profile',
    welcome: 'Welcome!',
    guest: 'Guest',
    continueAsGuest: 'Continue as Guest 👤',
    loginToAccount: 'Login to Account ✨',
    createNewAccount: 'Create New Account',
    joinPawPalsCommunity: 'Join PawPals Community',
    settings: '⚙️ Settings',
    darkMode: 'Dark Mode',
    notifications: 'Notifications',
    language: 'Language',
    helpAndSupport: 'Help & Support',
    myDogs: '🐕 My Dogs',
    addNewDog: 'Add New Dog',
    addYourFaithfulFriend: 'Add your faithful friend',
    dogName: 'Dog Name',
    breed: 'Breed',
    age: 'Age',
    weight: 'Weight',
    size: 'Size',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    personality: 'Personality',
    friendly: 'Friendly',
    energetic: 'Energetic',
    social: 'Social',
    aggressive: 'Aggressive',
    description: 'Description',
    vaccinated: 'Vaccinated',
    medicalInfo: 'Medical Information',
    addDog: 'Add Dog',
    addPhoto: 'Add Photo',
    basicInformation: 'Basic Information',
    characteristics: 'Characteristics',
    activity: '📊 Activity',
    myBadges: 'My Badges',
    badgesEarned: '5 badges earned',
    myStatistics: 'My Statistics',
    viewYourData: 'View your data',
    visitLog: 'Visit Log',
    visitHistory: 'Visit history',
    points: 'Points',
    level: 'Level',
    streak: 'Streak',
    
    // Auth Screens
    loginTitle: 'Login to Account',
    welcomeBack: 'Welcome back! We\'re happy to see you again',
    emailAddress: 'Email Address',
    enterEmail: 'Enter email address',
    password: 'Password',
    enterPassword: 'Enter password',
    forgotPassword: 'Forgot Password?',
    login: 'Login',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    noAccount: 'Don\'t have an account? ',
    signUpNow: 'Sign up now',
    registerTitle: 'Create New Account',
    joinCommunity: 'Join our dog owners community',
    firstName: 'First Name',
    lastName: 'Last Name',
    confirmPassword: 'Confirm Password',
    createAccount: 'Create Account',
    signUpWithGoogle: 'Sign up with Google',
    alreadyHaveAccount: 'Already have an account? ',
    loginText: 'Login',
    termsAgreement: 'By signing up you agree to our Terms of Service and Privacy Policy',
    
    // Home Screen
    hello: 'Hello',
    helloGuest: 'Hello Guest! 👋',
    discoverParks: 'Discover dog parks around you',
    howCanWeHelpToday: 'How can we help you today?',
    signUpNow2: 'Sign up now!',
    getAccessToAllFeatures: 'Get access to all features: check-in at parks, friends, events and more',
    whatCanYouDo: 'What can you do?',
    findParks: 'Find Parks',
    discoverDogParks: 'Discover dog parks nearby',
    parkInfo: 'Park Info',
    hoursAndFacilities: 'Opening hours and facilities',
    popularParks: 'Popular Parks',
    openNow: 'Open now',
    dailyMissions: 'Daily Missions ⭐',
    visitDogPark: 'Visit a dog park',
    completed: 'completed',
    quickActions: 'Quick Actions',
    quickCheckIn: 'Quick Check-in',
    scanQrInPark: 'Scan QR at park',
    nearbyParks: 'Nearby Parks',
    findParksNearby: 'Find parks nearby',
    
    // Language Selection
    selectLanguage: 'Select Language',
    english: 'English 🇺🇸',
    hebrew: 'עברית 🇮🇱',
    languageChanged: 'Language changed successfully',
    
    // Parks Screen
    dogParks: 'Dog Parks',
    searchParks: 'Search dog parks...',
    all: 'All',
    nearMe: 'Near Me',
    openNow: 'Open Now',
    highRating: 'High Rating',
    loadingParks: 'Loading parks...',
    checkIn: 'Check-in',
    navigate: 'Navigate',
    public: 'Public',
    private: 'Private',
    km: 'km',
    signUpForCheckinAndMore: 'Sign up for check-in and more features',
    noParkAvailable: 'No dog parks available at the moment',
    reviews: 'reviews',
    
    // Social Screen
    social: 'Social',
    joinCommunity: 'Join the Community',
    connectWithDogOwners: 'Connect with other dog owners, share experiences and make new friends',
    signUpForSocialFeatures: 'To access social features, please sign up or login to your account',
    activeFriends: 'Active Friends',
    recentChats: 'Recent Chats',
    friend: 'Friend',
    dogOwner: 'Dog Owner',
    community: 'Community',
    sharePhoto: 'Share Photo',
    uploadDogPhoto: 'Upload a photo of your dog',
    rateDogs: 'Rate Dogs',
    rateDogsYouMet: 'Rate dogs you met at the park',
    dogDiary: 'Dog Diary',
    recordMeetingsAndExperiences: 'Record meetings and experiences',
    registrationRequired: 'Registration Required',
    signUpForSocial: 'Sign Up Now',
    hours: 'h',
    howIsYourDog: 'Hey! How is your dog?',
    
    // Events Screen
    events: 'Events',
    discoverExcitingEvents: 'Discover Exciting Events',
    joinEventsAndMeetOthers: 'Join events, meet other dog owners and create unforgettable experiences',
    filterEvents: 'Filter Events',
    upcoming: 'Upcoming',
    myEvents: 'My Events',
    participants: 'Participants',
    organized: 'Organized',
    availableEvents: 'Available Events',
    eventIsFull: 'Event is Full',
    signUpToEvent: 'Sign Up to Event',
    joinNow: 'Join Now',
    date: 'Date',
    location: 'Location',
    time: 'Time',
    organizer: 'Organizer',
    participationLevel: 'Participation Level',
    full: 'Full',
    available: 'Available',
    signUpForEvents: 'To sign up for events, please sign up or login to your account',
    
    // Tab Navigation
    homeTab: 'Home',
    parksTab: 'Parks',
    socialTab: 'Social',
    eventsTab: 'Events',
    profileTab: 'Profile',
    
    // Garden Details
    details: 'Details',
    address: 'Address',
    hoursToday: 'Hours today',
    facilities: 'Facilities',
    parking: 'Parking',
    water: 'Water',
    shade: 'Shade',
    lighting: 'Lighting',
    fencing: 'Fencing',
    wasteDisposal: 'Waste Disposal',
    seating: 'Seating',
    agilityEquipment: 'Agility Equipment',
    currentVisitors: 'Current Visitors',
    dogsCurrentlyActive: 'dogs currently active in the park',
    hoursNotAvailable: 'Hours not available',
    addressNotAvailable: 'Address not available',
    closedToday: 'Closed today',
    
    // Status
    openNowStatus: 'Open now',
    closedNowStatus: 'Closed now',
    unknown: 'Unknown',
    
    // Notifications
    notifications: 'Notifications',
    newMessages: 'new messages',
    markAllAsRead: 'Mark all as read',
    viewAll: 'View all',
    noNotifications: 'No notifications',
    allNotificationsWillAppearHere: 'All your notifications will appear here',
    goToFullNotificationsPage: 'Go to full notifications page',
    ago: 'ago',
    newEvent: 'New event in park',
    newFriend: 'New friend',
    newAchievement: 'New achievement! 🏆',
    reminder: 'Reminder: Vet checkup',
    
    // Navigation
    selectNavigationApp: 'Select Navigation App',
    openWith: 'Choose your preferred navigation app',
    appleMaps: 'Apple Maps',
    googleMaps: 'Google Maps',
    waze: 'Waze',
    navigationNotAvailable: 'Navigation Not Available',
    errorOpeningNavigation: 'Could not open navigation app. Please try again.',
    installNavigationApp: 'Install Navigation App',
    noNavigationAppsFound: 'No navigation apps found on your device',
    openInBrowser: 'Open in Browser',

    // QR Scanner
    scanQR: 'Scan QR',
    scanQrToCheckin: 'Scan QR to check-in',
    scanning: 'Scanning...',
    scanQrInPark: 'Scan QR at park',
    quickCheckin: 'Quick Check-in',
    positionQrWithinFrame: 'Position QR code within the frame',
    qrScanAutomatically: 'The code will scan automatically',
    manualCheckin: 'Manual Check-in',
    cameraPermissionRequired: 'Camera Permission Required',
    cameraPermissionMessage: 'To scan QR codes, we need access to your camera',
    grantPermission: 'Grant Permission',
    goBack: 'Go Back',
    processing: 'Processing...',
    invalidQrCode: 'Invalid QR Code',
    invalidQrMessage: 'This QR code is not valid for a dog park',
    scanAgain: 'Scan Again',
    checkinSuccessful: 'Check-in successful!',
  },
  he: {
    // Common
    cancel: 'ביטול',
    ok: 'אוקיי',
    save: 'שמירה',
    delete: 'מחיקה',
    edit: 'עריכה',
    back: 'חזרה',
    loading: 'טוען...',
    error: 'שגיאה',
    success: 'הצלחה',
    
    // Profile Screen
    profile: 'פרופיל',
    welcome: 'ברוך הבא!',
    guest: 'אורח',
    continueAsGuest: 'המשך כאורח 👤',
    loginToAccount: 'התחבר לחשבון ✨',
    createNewAccount: 'צור חשבון חדש',
    joinPawPalsCommunity: 'הצטרף לקהילת PawPals',
    settings: '⚙️ הגדרות',
    darkMode: 'מצב כהה',
    notifications: 'התראות',
    language: 'שפה',
    helpAndSupport: 'עזרה ותמיכה',
    myDogs: '🐕 הכלבים שלי',
    addNewDog: 'הוסף כלב חדש',
    addYourFaithfulFriend: 'הוסף את החבר הנאמן שלך',
    dogName: 'שם הכלב',
    breed: 'גזע',
    age: 'גיל',
    weight: 'משקל',
    size: 'גודל',
    gender: 'מין',
    male: 'זכר',
    female: 'נקבה',
    small: 'קטן',
    medium: 'בינוני',
    large: 'גדול',
    personality: 'אישיות',
    friendly: 'חברותי',
    energetic: 'אנרגטי',
    social: 'חברתי',
    aggressive: 'תוקפני',
    description: 'תיאור',
    vaccinated: 'מחוסן',
    medicalInfo: 'מידע רפואי',
    addDog: 'הוסף כלב',
    addPhoto: 'הוסף תמונה',
    basicInformation: 'מידע בסיסי',
    characteristics: 'מאפיינים',
    activity: '📊 פעילות',
    myBadges: 'התגים שלי',
    badgesEarned: '5 תגים נרכשו',
    myStatistics: 'הסטטיסטיקות שלי',
    viewYourData: 'צפה בנתונים שלך',
    visitLog: 'יומן הביקורים',
    visitHistory: 'היסטוריית הביקורים',
    points: 'נקודות',
    level: 'רמה',
    streak: 'רצף',
    
    // Auth Screens
    loginTitle: 'התחברות לחשבון',
    welcomeBack: 'ברוך השב! אנו שמחים לראותך שוב',
    emailAddress: 'כתובת אימייל',
    enterEmail: 'הכנס כתובת אימייל',
    password: 'סיסמה',
    enterPassword: 'הכנס סיסמה',
    forgotPassword: 'שכחת סיסמה?',
    login: 'התחבר',
    or: 'או',
    continueWithGoogle: 'המשך עם Google',
    noAccount: 'אין לך חשבון? ',
    signUpNow: 'הירשם עכשיו',
    registerTitle: 'יצירת חשבון חדש',
    joinCommunity: 'הצטרף לקהילת בעלי הכלבים שלנו',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    confirmPassword: 'אימות סיסמה',
    createAccount: 'צור חשבון',
    signUpWithGoogle: 'הירשם עם Google',
    alreadyHaveAccount: 'יש לך כבר חשבון? ',
    loginText: 'התחבר',
    termsAgreement: 'בהרשמה אתה מסכים לתנאי השימוש ולמדיניות הפרטיות שלנו',
    
    // Home Screen
    hello: 'שלום',
    helloGuest: 'שלום אורח! 👋',
    discoverParks: 'גלה גני כלבים בסביבתך',
    howCanWeHelpToday: 'איך נעזור לך היום?',
    signUpNow2: 'הירשם עכשיו!',
    getAccessToAllFeatures: 'קבל גישה לכל התכונות: צ׳ק-אין בגנים, חברות, אירועים ועוד',
    whatCanYouDo: 'מה אפשר לעשות?',
    findParks: 'מצא גנים',
    discoverDogParks: 'גלה גני כלבים בסביבה',
    parkInfo: 'מידע על גנים',
    hoursAndFacilities: 'שעות פתיחה ומתקנים',
    popularParks: 'גנים פופולריים',
    openNow: 'פתוח עכשיו',
    dailyMissions: 'משימות יומיות ⭐',
    visitDogPark: 'בקר בגן כלבים',
    completed: 'הושלם',
    quickActions: 'פעולות מהירות',
    quickCheckIn: 'צ׳ק-אין מהיר',
    scanQrInPark: 'סרוק QR בגן',
    nearbyParks: 'גנים קרובים',
    findParksNearby: 'מצא גנים בסביבה',
    
    // Language Selection
    selectLanguage: 'בחר שפה',
    english: 'English 🇺🇸',
    hebrew: 'עברית 🇮🇱',
    languageChanged: 'השפה שונתה בהצלחה',
    
    // Parks Screen
    dogParks: 'גני כלבים',
    searchParks: 'חפש גני כלבים...',
    all: 'הכל',
    nearMe: 'קרוב אליי',
    openNow: 'פתוח עכשיו',
    highRating: 'דירוג גבוה',
    loadingParks: 'טוען גנים...',
    checkIn: 'צ׳ק-אין',
    navigate: 'נווט',
    public: 'ציבורי',
    private: 'פרטי',
    km: 'ק"מ',
    signUpForCheckinAndMore: 'הירשם לצ׳ק-אין ותכונות נוספות',
    noParkAvailable: 'אין גני כלבים זמינים כרגע',
    reviews: 'ביקורות',
    
    // Social Screen
    social: 'חברתי',
    joinCommunity: 'הצטרף לקהילה',
    connectWithDogOwners: 'חבר לבעלי כלבים אחרים, שתף חוויות וצור חברויות חדשות',
    signUpForSocialFeatures: 'כדי לגשת לתכונות החברתיות, אנא הירשם או התחבר לחשבון',
    activeFriends: 'חברים פעילים',
    recentChats: 'צ׳אטים אחרונים',
    friend: 'חבר',
    dogOwner: 'בעל כלב',
    community: 'קהילה',
    sharePhoto: 'שתף תמונה',
    uploadDogPhoto: 'העלה תמונה של הכלב שלך',
    rateDogs: 'דרג כלבים',
    rateDogsYouMet: 'דרג כלבים שפגשת בגן',
    dogDiary: 'יומן כלבים',
    recordMeetingsAndExperiences: 'תעד מפגשים וחוויות',
    registrationRequired: 'נדרשת הרשמה',
    signUpForSocial: 'הירשם עכשיו',
    hours: 'ש׳',
    howIsYourDog: 'היי! איך הכלב שלך?',
    
    // Events Screen
    events: 'אירועים',
    discoverExcitingEvents: 'גלה אירועים מרגשים',
    joinEventsAndMeetOthers: 'הצטרף לאירועים, פגש בעלי כלבים אחרים וצור חוויות בלתי נשכחות',
    filterEvents: 'סנן אירועים',
    upcoming: 'קרובים',
    myEvents: 'האירועים שלי',
    participants: 'משתתפים',
    organized: 'ארגנת',
    availableEvents: 'אירועים זמינים',
    eventIsFull: 'האירוע מלא',
    signUpToEvent: 'הירשם לאירוע',
    joinNow: 'הצטרף עכשיו',
    date: 'תאריך',
    location: 'מיקום',
    time: 'שעה',
    organizer: 'מארגן',
    participationLevel: 'רמת התמלאות',
    full: 'מלא',
    available: 'זמין',
    signUpForEvents: 'כדי להירשם לאירועים, אנא הירשם או התחבר לחשבון',
    
    // Tab Navigation
    homeTab: 'בית',
    parksTab: 'גנים',
    socialTab: 'חברתי',
    eventsTab: 'אירועים',
    profileTab: 'פרופיל',
    
    // Garden Details
    details: 'פרטים',
    address: 'כתובת',
    hoursToday: 'שעות פתיחה היום',
    facilities: 'מתקנים',
    parking: 'חניה',
    water: 'מים',
    shade: 'צל',
    lighting: 'תאורה',
    fencing: 'גידור',
    wasteDisposal: 'פינוי פסולת',
    seating: 'ישיבה',
    agilityEquipment: 'מכשירי כושר',
    currentVisitors: 'מבקרים כעת',
    dogsCurrentlyActive: 'כלבים פעילים בגן כעת',
    hoursNotAvailable: 'שעות לא זמינות',
    addressNotAvailable: 'כתובת לא זמינה',
    closedToday: 'סגור היום',
    
    // Status
    openNowStatus: 'פתוח עכשיו',
    closedNowStatus: 'סגור עכשיו',
    unknown: 'לא זמין',
    
    // Notifications
    notifications: 'התראות',
    newMessages: 'הודעות חדשות',
    markAllAsRead: 'סמן הכל כנקרא',
    viewAll: 'צפה בהכל',
    noNotifications: 'אין התראות',
    allNotificationsWillAppearHere: 'כל ההתראות שלך יופיעו כאן',
    goToFullNotificationsPage: 'עבור לדף התראות מלא',
    ago: 'לפני',
    newEvent: 'אירוע חדש בגן',
    newFriend: 'חבר חדש',
    newAchievement: 'הישג חדש! 🏆',
    reminder: 'תזכורת: בדיקה וטרינרית',
    
    // Navigation
    selectNavigationApp: 'בחר אפליקציית ניווט',
    openWith: 'בחר את אפליקציית הניווט המועדפת עליך',
    appleMaps: 'מפות אפל',
    googleMaps: 'גוגל מפות',
    waze: 'ווייז',
    navigationNotAvailable: 'ניווט לא זמין',
    errorOpeningNavigation: 'לא ניתן לפתוח אפליקציית ניווט. אנא נסה שוב.',
    installNavigationApp: 'התקן אפליקציית ניווט',
    noNavigationAppsFound: 'לא נמצאו אפליקציות ניווט במכשיר',
    openInBrowser: 'פתח בדפדפן',

    // QR Scanner
    scanQR: 'סרוק QR',
    scanQrToCheckin: 'סרוק QR כדי לבצע צ\'ק-אין',
    scanning: 'סורק...',
    scanQrInPark: 'סרוק QR בגן',
    quickCheckin: 'צ\'ק-אין מהיר',
    positionQrWithinFrame: 'מקם את קוד ה-QR במסגרת',
    qrScanAutomatically: 'הקוד ייסרק באופן אוטומטי',
    manualCheckin: 'צ\'ק-אין ידני',
    cameraPermissionRequired: 'נדרשת גישה למצלמה',
    cameraPermissionMessage: 'כדי לסרוק קודי QR, אנחנו צריכים גישה למצלמה שלך',
    grantPermission: 'אפשר גישה',
    goBack: 'חזור',
    processing: 'מעבד...',
    invalidQrCode: 'QR לא תקין',
    invalidQrMessage: 'קוד ה-QR אינו תקין עבור גן כלבים',
    scanAgain: 'סרוק שוב',
    checkinSuccessful: 'צ\'ק-אין בוצע בהצלחה!',
  },
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