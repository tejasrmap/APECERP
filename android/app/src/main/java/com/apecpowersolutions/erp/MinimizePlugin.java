package com.apecpowersolutions.erp;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MinimizeApp")
public class MinimizePlugin extends Plugin {
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
