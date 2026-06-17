package com.apecpowersolutions.erp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTracking")
public class NativeTrackingPlugin extends Plugin {
    private static final String TAG = "APEC_NativeTracking";

    @PluginMethod
    public void startTracking(PluginCall call) {
        try {
            String employeeId = call.getString("employeeId");
            String userName = call.getString("userName");
            String userEmail = call.getString("userEmail");
            String apiKey = call.getString("apiKey");
            String refreshToken = call.getString("refreshToken");
            String projectId = call.getString("projectId");

            if (employeeId == null || projectId == null) {
                call.reject("Failed: employeeId and projectId are required parameters.");
                return;
            }

            SharedPreferences prefs = getContext().getSharedPreferences("APEC_NATIVE_TRACKING", Context.MODE_PRIVATE);
            prefs.edit()
                .putString("employeeId", employeeId)
                .putString("userName", userName != null ? userName : "")
                .putString("userEmail", userEmail != null ? userEmail : "")
                .putString("apiKey", apiKey != null ? apiKey : "")
                .putString("refreshToken", refreshToken != null ? refreshToken : "")
                .putString("projectId", projectId)
                .putLong("last_bg_update_time", 0)
                .apply();

            getActivity().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    android.widget.Toast.makeText(getContext(), "APEC: Starting tracking service...", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
            Intent serviceIntent = new Intent(getContext(), LocationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            Log.d(TAG, "Native LocationService started for: " + employeeId);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start LocationService", e);
            call.reject("Failed to start location tracking: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("APEC_NATIVE_TRACKING", Context.MODE_PRIVATE);
        prefs.edit().clear().apply();

        try {
            Intent serviceIntent = new Intent(getContext(), LocationService.class);
            getContext().stopService(serviceIntent);
            Log.d(TAG, "Native LocationService stopped.");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop LocationService", e);
            call.reject("Failed to stop location tracking: " + e.getMessage());
        }
    }
}
