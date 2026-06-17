package com.apecpowersolutions.erp;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.HandlerThread;
import android.os.IBinder;
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

    // AlarmManager restart heartbeat - every 90 seconds
    private static final long ALARM_INTERVAL_MS = 90_000L;
    public static final String ACTION_RESTART = "com.apecpowersolutions.erp.APEC_RESTART_SERVICE";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private HandlerThread serviceHandlerThread;
    private android.os.PowerManager.WakeLock wakeLock;

    // Schedule a periodic UI updater (notification + toast) every minute
    private final Runnable uiUpdater = new Runnable() {
        @Override
        public void run() {
            // Update notification with current time (even if no data sent)
            java.text.SimpleDateFormat timeFmt = new java.text.SimpleDateFormat("hh:mm:ss a", java.util.Locale.getDefault());
            String now = timeFmt.format(new java.util.Date());
            updateNotification("Service alive – " + now);
            // Show a short toast so the user knows the service is still running
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() ->
                android.widget.Toast.makeText(getApplicationContext(), "APEC Service alive: " + now, android.widget.Toast.LENGTH_SHORT).show()
            );
            // Re‑post for the next minute
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(this, 60_000L);
        }
    };

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
                        Log.d(TAG, "Location callback: " + location.getLatitude() + ", " + location.getLongitude());
                        sendLocationToFirestore(location, false);
                    }
                }
            }
        };

        // Acquire PARTIAL_WAKE_LOCK so CPU stays awake when screen is off
        android.os.PowerManager powerManager = (android.os.PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                android.os.PowerManager.PARTIAL_WAKE_LOCK,
                "APEC::LocationTrackingWakeLock"
            );
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("APEC Location Tracking Active")
                .setContentText("Recording your shift location. Do not disable.")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)       // Cannot be dismissed by user
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build();

        // Android 10 (Q)+ requires specifying foreground service type
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // Acquire wake lock (12 hour timeout as absolute safety net)
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L);
            Log.d(TAG, "WakeLock acquired.");
        }

        // Schedule AlarmManager heartbeat to restart service if killed
        scheduleRestartAlarm();

        // Immediately fetch last known location to populate admin portal
        requestImmediateLocation();

        // Begin FusedLocation periodic updates
        startLocationUpdates();

        // Start periodic UI updater
        new android.os.Handler(android.os.Looper.getMainLooper()).post(uiUpdater);

        // Show Toast that service has initialized
        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                android.widget.Toast.makeText(getApplicationContext(), "APEC Service Active!", android.widget.Toast.LENGTH_SHORT).show();
            }
        });

        // START_STICKY: system will restart service with null intent if killed
        return START_STICKY;
    }

    /**
     * Schedule a recurring AlarmManager alarm that fires every 90 seconds.
     * If the service is alive, ServiceRestartReceiver will see it's running and skip.
     * If the service was killed, ServiceRestartReceiver will restart it.
     */
    private void scheduleRestartAlarm() {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent restartIntent = new Intent(this, ServiceRestartReceiver.class);
        restartIntent.setAction(ACTION_RESTART);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, 9001, restartIntent, flags);

        long triggerAt = System.currentTimeMillis() + ALARM_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // setAndAllowWhileIdle is inexact and does NOT require SCHEDULE_EXACT_ALARM permission, but still fires in Doze
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }

        Log.d(TAG, "Restart alarm scheduled in " + (ALARM_INTERVAL_MS / 1000) + "s.");
    }

    private void requestImmediateLocation() {
        try {
            fusedLocationClient.getLastLocation()
                .addOnSuccessListener(new OnSuccessListener<Location>() {
                    @Override
                    public void onSuccess(Location location) {
                        if (location != null) {
                            Log.d(TAG, "Immediate location: " + location.getLatitude() + ", " + location.getLongitude());
                            sendLocationToFirestore(location, true);
                        } else {
                            Log.d(TAG, "No cached last-known location available.");
                        }
                    }
                });
        } catch (SecurityException e) {
            Log.e(TAG, "Permission missing for immediate location", e);
        }
    }

    private void startLocationUpdates() {
        try {
            // Request location every 60 seconds, accept updates as fast as every 30s
            LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60_000L)
                    .setMinUpdateIntervalMillis(30_000L)
                    .setMinUpdateDistanceMeters(0) // Track even when stationary
                    .setMaxUpdateDelayMillis(90_000L) // Max batching delay
                    .build();

            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, serviceHandlerThread.getLooper());
            Log.d(TAG, "FusedLocation periodic updates started (every 60s).");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission missing", e);
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Called when user swipes app from recents. Schedule alarm-based service restart watchdog.
        Log.d(TAG, "Task removed - scheduling alarm-based service restart watchdog.");
        
        Intent restartIntent = new Intent(getApplicationContext(), ServiceRestartReceiver.class);
        restartIntent.setAction(ACTION_RESTART);

        int flags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getApplicationContext(), 9002, restartIntent, flags
        );

        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            // Restart after 2 seconds
            alarmManager.set(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + 2000, pendingIntent);
        }
        super.onTaskRemoved(rootIntent);
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
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock released.");
        }
        // Cancel the periodic UI updater when the service is destroyed
        new android.os.Handler(android.os.Looper.getMainLooper()).removeCallbacks(uiUpdater);

        // Schedule restart so service comes back after onDestroy
        scheduleRestartAlarm();
        Log.d(TAG, "LocationService destroyed - restart alarm rescheduled.");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void updateNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("APEC Location Tracking Active")
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build();

        manager.notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "APEC Location Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps location tracking active during shift");
            serviceChannel.setShowBadge(false);
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
            Log.d(TAG, "Tracking config missing - skipping Firestore write.");
            return;
        }

        final double latitude = location.getLatitude();
        final double longitude = location.getLongitude();
        final float accuracy = location.getAccuracy();

        if (!bypassThrottle) {
            // Throttle: only send if at least 50 seconds have passed since last update
            long now = System.currentTimeMillis();
            long lastUpdate = prefs.getLong("last_bg_update_time", 0);
            if (now - lastUpdate < 50_000L) {
                Log.d(TAG, "Throttled: < 50s since last update.");
                return;
            }
            prefs.edit().putLong("last_bg_update_time", now).apply();
        } else {
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
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);

                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                    String timestamp = sdf.format(new Date());

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
                        Log.d(TAG, "Telemetry write OK: lat=" + latitude + ", lng=" + longitude);
                        SimpleDateFormat timeFormat = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault());
                        final String formattedTime = timeFormat.format(new Date());
                        updateNotification("Last update sent: " + formattedTime);
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                android.widget.Toast.makeText(getApplicationContext(), "APEC GPS Sent: " + formattedTime, android.widget.Toast.LENGTH_SHORT).show();
                            }
                        });
                    } else {
                        String error = "";
                        try {
                            InputStream es = conn.getErrorStream();
                            if (es != null) error = readStream(es);
                        } catch (Exception ignored) {}
                        Log.e(TAG, "Telemetry write failed: HTTP " + respCode + " - " + error);
                        SimpleDateFormat timeFormat = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault());
                        final String formattedTime = timeFormat.format(new Date());
                        updateNotification("Last update failed: " + formattedTime + " (HTTP " + respCode + ")");
                        final String finalError = error;
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                android.widget.Toast.makeText(getApplicationContext(), "APEC Write Error: HTTP " + respCode + " - " + finalError, android.widget.Toast.LENGTH_LONG).show();
                            }
                        });
                    }
                } catch (final Exception e) {
                    Log.e(TAG, "Telemetry network error", e);
                    SimpleDateFormat timeFormat = new SimpleDateFormat("hh:mm:ss a", Locale.getDefault());
                    final String formattedTime = timeFormat.format(new Date());
                    updateNotification("Offline. Last update attempt: " + formattedTime);
                    new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            android.widget.Toast.makeText(getApplicationContext(), "APEC Offline: " + e.getMessage(), android.widget.Toast.LENGTH_SHORT).show();
                        }
                    });
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
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            String payload = "grant_type=refresh_token&refresh_token=" + refreshToken;
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }

            if (conn.getResponseCode() == 200) {
                String response = readStream(conn.getInputStream());
                org.json.JSONObject jsonObj = new org.json.JSONObject(response);
                return jsonObj.optString("id_token", null);
            } else {
                Log.e(TAG, "Token refresh failed: HTTP " + conn.getResponseCode());
            }
        } catch (Exception e) {
            Log.e(TAG, "Token refresh exception", e);
        }
        return null;
    }

    private String readStream(InputStream is) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }
}
