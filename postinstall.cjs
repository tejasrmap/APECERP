const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'node_modules', '@capacitor-community', 'background-geolocation', 'android', 'build.gradle');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Fix proguard setting
  content = content.replace(
    "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'",
    "proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'"
  );

  // Fix namespace warning
  content = content.replace(
    'namespace "com.equimaps.capacitor_background_geolocation"',
    'namespace = "com.equimaps.capacitor_background_geolocation"'
  );

  // Fix abortOnError warning
  content = content.replace(
    'abortOnError false',
    'abortOnError = false'
  );

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully patched capacitor-community-background-geolocation build.gradle');
} else {
  console.warn('capacitor-community-background-geolocation build.gradle not found to patch');
}
