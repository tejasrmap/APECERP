package com.apecpowersolutions.erp;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
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

@CapacitorPlugin(name = "NativeTracking")
class NativeTrackingPlugin extends Plugin {

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
            Intent serviceIntent = new Intent(getContext(), LocationService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            android.util.Log.d("APEC_NativeTracking", "Native LocationService started successfully");
            call.resolve();
        } catch (Exception e) {
            android.util.Log.e("APEC_NativeTracking", "Failed to start LocationService", e);
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
            android.util.Log.d("APEC_NativeTracking", "Native LocationService stopped");
            call.resolve();
        } catch (Exception e) {
            android.util.Log.e("APEC_NativeTracking", "Failed to stop LocationService", e);
            call.reject("Failed to stop location tracking: " + e.getMessage());
        }
    }
}
