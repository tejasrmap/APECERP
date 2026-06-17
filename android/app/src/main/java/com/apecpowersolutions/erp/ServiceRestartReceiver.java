package com.apecpowersolutions.erp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * ServiceRestartReceiver
 * 
 * Receives broadcasts to restart the LocationService when it is killed by Android.
 * Triggered by:
 *   1. BOOT_COMPLETED - after phone restarts
 *   2. MY_PACKAGE_REPLACED - after app update
 *   3. Custom "APEC_RESTART_SERVICE" - fired by AlarmManager heartbeat in LocationService
 */
public class ServiceRestartReceiver extends BroadcastReceiver {
    private static final String TAG = "APEC_RestartReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Received broadcast: " + action);

        // Only restart if tracking was previously active (user had punched in)
        SharedPreferences prefs = context.getSharedPreferences("APEC_NATIVE_TRACKING", Context.MODE_PRIVATE);
        String employeeId = prefs.getString("employeeId", null);

        if (employeeId == null) {
            Log.d(TAG, "No active tracking session - skipping service restart.");
            return;
        }

        Log.d(TAG, "Active tracking session found for: " + employeeId + " - restarting LocationService.");

        try {
            Intent serviceIntent = new Intent(context, LocationService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "LocationService restarted successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to restart LocationService", e);
        }
    }
}
