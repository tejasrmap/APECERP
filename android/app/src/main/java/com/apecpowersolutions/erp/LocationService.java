package com.apecpowersolutions.erp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.OnSuccessListener;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LocationService extends Service {
    private static final String TAG = "APEC_LocationService";
    private static final String CHANNEL_ID = "APEC_LOCATION_SERVICE_CHANNEL";
    private static final int NOTIFICATION_ID = 8472;

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private HandlerThread serviceHandlerThread;
    private android.os.PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        // Start a dedicated background thread for location callbacks
        serviceHandlerThread = new HandlerThread("LocationServiceThread");
        serviceHandlerThread.start();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult != null) {
                    Location location = locationResult.getLastLocation();
                    if (location != null) {
                        Log.d(TAG, "Location callback triggered: " + location.getLatitude() + ", " + location.getLongitude());
                        sendLocationToFirestore(location, false);
                    }
                }
            }
        };

        // Initialize WakeLock to keep CPU running when screen is turned off
        android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "APEC::LocationTrackingWakeLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Location Tracking Active")
                .setContentText("APEC ERP is recording shift location data.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();

        // Android 10 (Q) and above requires specifying the foreground service type
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        
        // Acquire wake lock with a timeout (e.g. 12 hours) as absolute safety fallback
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L); // 12 hours in milliseconds
            Log.d(TAG, "WakeLock acquired");
        }
        
        // Request immediate last-known location update to populate portal instantly
        requestImmediateLocation();

        // Start periodic tracking
        startLocationUpdates();
        
        return START_STICKY;
    }

    private void requestImmediateLocation() {
        try {
            fusedLocationClient.getLastLocation()
                .addOnSuccessListener(new OnSuccessListener<Location>() {
                    @Override
                    public void onSuccess(Location location) {
                        if (location != null) {
                            Log.d(TAG, "Immediate last-known location fetched: " + location.getLatitude() + ", " + location.getLongitude());
                            sendLocationToFirestore(location, true); // Force send immediate location (bypass throttle)
                        } else {
                            Log.d(TAG, "No cached last-known location available");
                        }
                    }
                });
        } catch (SecurityException e) {
            Log.e(TAG, "Permission missing for last-known location access", e);
        }
    }

    private void startLocationUpdates() {
        try {
            // Using modern LocationRequest.Builder (supported in play-services-location 21.3.0)
            LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60000)
                    .setMinUpdateIntervalMillis(30000)
                    .setMinUpdateDistanceMeters(0) // irrespective of distance change, tracks updates even when stationary
                    .build();

            // Run location updates on the background thread looper
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, serviceHandlerThread.getLooper());
            Log.d(TAG, "Periodic location updates requested successfully on background thread");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission missing", e);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        if (serviceHandlerThread != null) {
            serviceHandlerThread.quitSafely();
        }
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock released");
        }
        Log.d(TAG, "Location updates stopped and service destroyed");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Location Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    private void sendLocationToFirestore(Location location, boolean bypassThrottle) {
        SharedPreferences prefs = getSharedPreferences("APEC_NATIVE_TRACKING", Context.MODE_PRIVATE);
        final String empId = prefs.getString("employeeId", null);
        final String empName = prefs.getString("userName", null);
        final String empEmail = prefs.getString("userEmail", null);
        final String apiKey = prefs.getString("apiKey", null);
        final String refreshToken = prefs.getString("refreshToken", null);
        final String projectId = prefs.getString("projectId", null);

        if (empId == null || projectId == null) {
            Log.d(TAG, "Tracking configuration missing. Aborting Firestore write.");
            return;
        }

        final double latitude = location.getLatitude();
        final double longitude = location.getLongitude();
        final float accuracy = location.getAccuracy();

        if (!bypassThrottle) {
            // Throttle check: permit updates if at least 50 seconds (50000ms) have passed
            long now = System.currentTimeMillis();
            long lastUpdate = prefs.getLong("last_bg_update_time", 0);
            if (now - lastUpdate < 50000) {
                Log.d(TAG, "Throttled: Less than 50 seconds since last background update.");
                return;
            }
            prefs.edit().putLong("last_bg_update_time", now).apply();
        } else {
            // For immediate/forced updates, still cache the update time to throttle next periodic update
            prefs.edit().putLong("last_bg_update_time", System.currentTimeMillis()).apply();
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String idToken = null;
                    if (apiKey != null && refreshToken != null) {
                        idToken = refreshIdToken(apiKey, refreshToken);
                    }

                    URL url = new URL("https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/telemetry");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (idToken != null) {
                        conn.setRequestProperty("Authorization", "Bearer " + idToken);
                    }
                    conn.setDoOutput(true);

                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                    String timestamp = sdf.format(new Date());

                    // Static address parameter to save data bandwidth (no reverse geocoding)
                    String jsonBody = "{"
                        + "\"fields\":{"
                        + "\"employeeId\":{\"stringValue\":\"" + empId + "\"},"
                        + "\"userName\":{\"stringValue\":\"" + empName + "\"},"
                        + "\"userEmail\":{\"stringValue\":\"" + empEmail + "\"},"
                        + "\"type\":{\"stringValue\":\"telemetry\"},"
                        + "\"photoUrl\":{\"nullValue\":null},"
                        + "\"location\":{\"mapValue\":{\"fields\":{"
                        + "\"latitude\":{\"doubleValue\":" + latitude + "},"
                        + "\"longitude\":{\"doubleValue\":" + longitude + "},"
                        + "\"accuracy\":{\"doubleValue\":" + accuracy + "},"
                        + "\"address\":{\"stringValue\":\"Background Telemetry (Foreground Service)\"}"
                        + "}}},"
                        + "\"timestamp\":{\"timestampValue\":\"" + timestamp + "\"}"
                        + "}"
                        + "}";

                    byte[] postData = jsonBody.getBytes(StandardCharsets.UTF_8);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(postData);
                    }

                    int respCode = conn.getResponseCode();
                    if (respCode == 200 || respCode == 201) {
                        Log.d(TAG, "Native telemetry write succeeded for lat=" + latitude + ", lng=" + longitude);
                    } else {
                        String error = "";
                        try {
                            InputStream es = conn.getErrorStream();
                            if (es != null) {
                                error = readStream(es);
                            }
                        } catch (Exception e) {
                            // ignore
                        }
                        Log.e(TAG, "Native telemetry write failed with response code: " + respCode + " - " + error);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Native telemetry network error", e);
                }
            }
        }).start();
    }

    private String refreshIdToken(String apiKey, String refreshToken) {
        try {
            URL url = new URL("https://securetoken.googleapis.com/v1/token?key=" + apiKey);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            conn.setDoOutput(true);

            String payload = "grant_type=refresh_token&refresh_token=" + refreshToken;
            byte[] postData = payload.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(postData);
            }

            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                String response = readStream(conn.getInputStream());
                org.json.JSONObject jsonObj = new org.json.JSONObject(response);
                return jsonObj.optString("id_token", null);
            } else {
                String error = "";
                try {
                    InputStream es = conn.getErrorStream();
                    if (es != null) {
                        error = readStream(es);
                    }
                } catch (Exception e) {
                    // ignore
                }
                Log.e(TAG, "Refresh ID token failed: HTTP " + responseCode + " - " + error);
            }
        } catch (Exception e) {
            Log.e(TAG, "Refresh ID token network exception", e);
        }
        return null;
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();
        return sb.toString();
    }
}
