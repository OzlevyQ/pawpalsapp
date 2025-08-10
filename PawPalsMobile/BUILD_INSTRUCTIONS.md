# הוראות בנייה להתראות פוש

## הבעיה
Expo Go SDK 53 לא תומך בהתראות פוש מלאות. צריך לבנות Development Build.

## פתרון מהיר - EAS Build (מומלץ)

### 1. התקנת EAS CLI
```bash
npm install -g eas-cli
```

### 2. התחברות ל-Expo
```bash
eas login
```

### 3. הגדרת הפרויקט (רק פעם ראשונה)
```bash
eas build:configure
```

### 4. בניית Development Build

#### ל-iOS (סימולטור):
```bash
eas build --profile development --platform ios
```

#### ל-iOS (מכשיר פיזי):
```bash
eas build --profile development --platform ios --local
```

#### ל-Android:
```bash
eas build --profile development --platform android
```

### 5. התקנה על המכשיר
- **iOS**: הורד את הקובץ והתקן דרך Xcode או TestFlight
- **Android**: הורד את ה-APK והתקן על המכשיר

## פתרון חלופי - Prebuild מקומי

### ל-iOS:
```bash
npx expo prebuild --platform ios
cd ios
pod install
npx expo run:ios
```

### ל-Android:
```bash
npx expo prebuild --platform android
npx expo run:android
```

## בדיקת התראות פוש

אחרי התקנת ה-Development Build:

1. פתח את האפליקציה
2. היכנס למשתמש
3. לך לדף התראות
4. לחץ על כפתור הרקטה 🚀
5. צא מהאפליקציה
6. תקבל התראת פוש!

## הערות חשובות

- **Development Build** נדרש להתראות פוש מלאות
- התראות יעבדו גם כשהאפליקציה סגורה
- תומך ב-iOS ו-Android
- הטוקנים כבר נרשמים בבקנד (ראינו בלוגים)

## בעיות נפוצות

### "Push notifications don't work on simulator"
- השתמש במכשיר פיזי או בנה עבור מכשיר פיזי

### התראות לא מגיעות
1. וודא שה-Development Build מותקן
2. בדוק שנתת הרשאות להתראות
3. וודא שהבקנד רץ (port 5000)
4. בדוק בלוגים של הבקנד

## סטטוס נוכחי ✅
- ✅ Push Token נרשם בהצלחה: `ExponentPushToken[83fO_3DpWTfm--Z4VV4ztr]`
- ✅ Backend מוכן ועובד
- ✅ Notification Service מאותחל
- ⚠️ צריך Development Build במקום Expo Go