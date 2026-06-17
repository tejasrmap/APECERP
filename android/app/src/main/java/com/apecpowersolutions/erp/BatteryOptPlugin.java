package com.apecpowersolutions.erp;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BatteryOpt")
public class BatteryOptPlugin extends Plugin {
    private static final String TAG = "APEC_BatteryOpt";

    @PluginMethod
    public void requestIgnore(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String packageName = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
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
