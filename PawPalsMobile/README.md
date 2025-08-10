# 🐕 PawPals Mobile App

אפליקציית מובייל עבור קהילת בעלי הכלבים PawPals - מצא גני כלבים, התחבר עם בעלי כלבים אחרים, והשתתף באירועים קהילתיים.

## ✨ תכונות עיקריות

- 🗺️ **מיפוי גני כלבים** - חיפוש וגילוי גנים בסביבה
- 👤 **מצב אורח** - צפייה בגנים ללא הרשמה
- 🔐 **הרשמה והתחברות** - חשבון אישי עם אימות מאובטח
- 🏆 **גיימיפיקציה** - נקודות, רמות, תגים ומשימות יומיות
- 👥 **רשת חברתית** - חברויות וצ'אטים בזמן אמת
- 📅 **ניהול אירועים** - יצירה והרשמה לאירועים
- 🌙 **מצב כהה/בהיר** - תמיכה בשני מצבי תצוגה
- 🌐 **תמיכה דו-לשונית** - עברית ואנגלית עם RTL
- 📱 **PWA ו-Native** - עובד בדפדפן ובאפליקציות מובייל

## 🛠️ טכנולוגיות

- **Expo SDK 53** - פלטפורמת הפיתוח
- **React Native 0.79** - פריימוורק האפליקציה  
- **Expo Router v5** - ניווט מבוסס קבצים
- **NativeWind v4** - Tailwind CSS עבור React Native
- **TypeScript** - טיפוסים חזקים
- **Zustand** - ניהול state קל משקל
- **Socket.IO** - תקשורת בזמן אמת
- **Expo SecureStore** - שמירת נתונים מאובטחת

## 🚀 התקנה והרצה

### דרישות מוקדמות
- Node.js 18+
- Expo CLI
- Git

### שלבי התקנה

1. **שכפול הפרויקט**
   ```bash
   git clone <repository-url>
   cd PawPalsMobile
   ```

2. **התקנת תלויות**
   ```bash
   npm install
   ```

3. **הגדרת משתני סביבה**
   - העתק את `.env.example` ל-`.env`
   - עדכן את כתובת השרת:
   ```
   EXPO_PUBLIC_API_URL=http://your-backend-url:5000/api
   EXPO_PUBLIC_WEBSOCKET_URL=ws://your-backend-url:5000
   ```

4. **הרצת האפליקציה**
   ```bash
   # פיתוח עם Expo Go
   npm start
   
   # בניה לאנדרואיד
   npm run android
   
   # בניה ל-iOS
   npm run ios
   
   # בניה לאינטרנט
   npm run web
   ```

## 📱 מבנה האפליקציה

```
app/
├── (auth)/           # מסכי אימות
│   ├── welcome.tsx   # מסך ברוכים הבאים
│   ├── login.tsx     # התחברות
│   └── register.tsx  # הרשמה
├── (tabs)/           # ניווט עיקרי
│   ├── home.tsx      # מסך בית
│   ├── parks.tsx     # גני כלבים
│   ├── social.tsx    # רשת חברתית
│   ├── events.tsx    # אירועים
│   └── profile.tsx   # פרופיל
├── _layout.tsx       # Root Layout
└── index.tsx         # Entry Point

components/           # רכיבים משותפים
├── ui/              # רכיבי UI בסיסיים
├── home/            # רכיבי מסך הבית
└── common/          # רכיבים כלליים

services/            # שירותי API
├── api/             # קריאות REST
└── websocket.ts     # תקשורת בזמן אמת

store/               # ניהול State
├── authStore.ts     # מצב אימות
└── appStore.ts      # מצב אפליקציה כללי

locales/             # תרגומים
├── he.json          # עברית
└── en.json          # אנגלית
```

## 🎨 עיצוב

### פלטת צבעים
- **Primary Green**: `#10b981` (Emerald-500)
- **Secondary Teal**: `#14b8a6` (Teal-500)
- **Neutral Gray**: `#6B7280` (Gray-500)

### תכונות עיצוביות
- **כרטיסיות מעוגלות** עם צללים רכים
- **אנימציות חלקות** במעברים
- **Bottom Navigation** עם 5 טאבים
- **Glass Effects** ואלמנטים מודרניים
- **RTL Support** מלא לעברית

## 🔗 חיבור לבאקאנד

האפליקציה מתחברת לשרת Node.js/MongoDB הקיים ב-`../backend/`.

### נקודות חיבור עיקריות:
- `POST /api/auth/login` - התחברות
- `POST /api/auth/register` - הרשמה  
- `GET /api/gardens` - קבלת גני כלבים
- `POST /api/visits/checkin` - צ'ק-אין בגן
- `GET /api/events` - קבלת אירועים
- WebSocket לעדכונים בזמן אמת

## 👤 מצבי משתמש

### אורח (Guest)
- צפייה בגני כלבים
- מידע בסיסי על אירועים
- גישה מוגבלת לתכונות

### משתמש רשום
- כל תכונות האורח +
- צ'ק-אין בגנים
- מערכת נקודות ותגים
- חברויות וצ'אטים
- יצירה והרשמה לאירועים
- פרופיל אישי ויומן ביקורים

## 🔧 פיתוח

### הוספת מסך חדש
1. צור קובץ ב-`app/` עם הנתיב הרצוי
2. ייצא component כ-default export
3. הוסף ל-navigation אם נדרש

### הוספת API חדש
1. הוסף interface ב-`services/api/`
2. יצור service class עם methods
3. השתמש בו דרך Zustand store

### הוספת תרגום
1. הוסף מפתחות ל-`locales/he.json` ו-`locales/en.json`
2. השתמש דרך hook של i18n

## 🚢 פריסה

### Development
```bash
npm start
```

### Production Build
```bash
# Android APK
eas build --platform android --profile preview

# iOS IPA
eas build --platform ios --profile preview

# Web Build
npm run web
```

## 🐛 פתרון בעיות

### בעיות NativeWind
- ודא שהגירסה היא v4+
- נקה cache: `expo start --clear`
- בדוק את `tailwind.config.js`

### בעיות WebSocket
- ודא שהשרת רץ
- בדוק את משתני הסביבה
- בדוק חיבור רשת

### בעיות אימות
- נקה SecureStore: מחק ואותקן מחדש
- בדוק תוקף הטוקנים
- ודא שהשרת זמין

## 📞 תמיכה

- **מסמכי API**: [Documentation](../PROJECT_DOCUMENTATION.md)
- **Backend**: `../backend/`
- **Issues**: צור issue בפרויקט

---

**PawPals** - מחבר בעלי כלבים ברחבי הארץ 🐕❤️