package com.apecpowersolutions.erp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(MinimizePlugin.class);
        registerPlugin(NativeTrackingPlugin.class);
        registerPlugin(BatteryOptPlugin.class);
    }
}

@CapacitorPlugin(name = "MinimizeApp")
class MinimizePlugin extends Plugin {
    @PluginMethod
    public void minimize(PluginCall call) {
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                getActivity().moveTaskToBack(true);
                call.resolve();
            }
        });
    }
}

/**
 * BatteryOptPlugin
 * Exposes requestIgnoreBatteryOptimizations() to JS layer.
 * Called on punch-in to ask user to whitelist the app from battery optimization.
 * This is the #1 fix for Android killing services after 2 minutes.
 */
@CapacitorPlugin(name = "BatteryOpt")
class BatteryOptPlugin extends Plugin {
    private static final String TAG = "APEC_BatteryOpt";

    @PluginMethod
    public void requestIgnore(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String packageName = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    // Opens the system dialog: "Allow app to run in background unrestricted?"
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    Log.d(TAG, "Requested battery optimization ignore dialog.");
                    call.resolve();
                } catch (Exception e) {
                    Log.e(TAG, "Could not open battery optimization settings", e);
                    call.reject("Failed: " + e.getMessage());
                }
            } else {
                Log.d(TAG, "Already ignoring battery optimizations.");
                call.resolve();
            }
        } else {
            // Not needed on older Android versions
            call.resolve();
        }
    }

    @PluginMethod
    public void isIgnoring(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String packageName = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(packageName);
            com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
            result.put("ignoring", ignoring);
            call.resolve(result);
        } else {
            com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
            result.put("ignoring", true);
            call.resolve(result);
        }
    }
}

@CapacitorPlugin(name = "NativeTracking")
class NativeTrackingPlugin extends Plugin {
    private static final String TAG = "APEC_NativeTracking";

    @PluginMethod
    public void startTracking(PluginCall call) {
        String employeeId = call.getString("employeeId");
        String userName = call.getString("userName");
        String userEmail = call.getString("userEmail");
        String apiKey = call.getString("apiKey");
        String refreshToken = call.getString("refreshToken");
        String projectId = call.getString("projectId");

        SharedPreferences prefs = getContext().getSharedPreferences("APEC_NATIVE_TRACKING", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("employeeId", employeeId)
            .putString("userName", userName)
            .putString("userEmail", userEmail)
            .putString("apiKey", apiKey)
            .putString("refreshToken", refreshToken)
            .putString("projectId", projectId)
            .putLong("last_bg_update_time", 0)
            .apply();

        try {
            android.widget.Toast.makeText(getContext(), "APEC: Starting tracking service...", android.widget.Toast.LENGTH_SHORT).show();
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
        // Clear employeeId so ServiceRestartReceiver won't restart service after punch-out
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
