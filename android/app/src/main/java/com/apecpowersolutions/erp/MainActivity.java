package com.apecpowersolutions.erp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MinimizePlugin.class);
        registerPlugin(NativeTrackingPlugin.class);
        registerPlugin(BatteryOptPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
