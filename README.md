# Finance Tracker

A modern finance tracking application built with React, TypeScript, and Capacitor for Android deployment.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Android Studio
- JDK 11 or higher
- Android SDK

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a keystore for Android signing:
```bash
keytool -genkey -v -keystore android/app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias your-key-alias
```

3. Update the keystore configuration in `capacitor.config.ts` with your keystore details.

## Development

Run the development server:
```bash
npm run dev
```

## Building for Android

1. Build the web app:
```bash
npm run build
```

2. Sync with Android:
```bash
npm run sync
```

3. Open in Android Studio:
```bash
npm run open
```

Or use the combined script:
```bash
npm run android
```

## Android Deployment

1. Open the project in Android Studio
2. Update the app version in `android/app/build.gradle`
3. Generate a signed APK/Bundle:
   - Build > Generate Signed Bundle/APK
   - Select APK or Android App Bundle
   - Use your keystore
   - Choose release build variant
   - Click Finish

## Features

- Transaction tracking (income and expenses)
- Category management
- Payment method tracking
- Search and filtering
- List and card views
- Responsive design
- Offline support
- Dark mode support
- SMS Transaction Scanner
  - Automatic transaction extraction from SMS messages
  - Configurable parser rules
  - Scan history tracking
  - Dashboard quick scan button
  - Cross-component history synchronization

## Troubleshooting

1. If you encounter build issues:
   - Clean the project: `cd android && ./gradlew clean`
   - Rebuild: `./gradlew build`

2. If the app crashes on launch:
   - Check the Android logs in Android Studio
   - Verify all permissions are properly set
   - Ensure the keystore is properly configured

3. If the web assets aren't updating:
   - Run `npm run sync` to force a sync
   - Check the `dist` directory exists and contains the latest build

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
