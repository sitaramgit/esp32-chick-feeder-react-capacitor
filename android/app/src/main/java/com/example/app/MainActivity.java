package com.example.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This fixes the WebView permission denied for getUserMedia on Android
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Auto-grant camera & audio capture requests (safe for your use-case)
                runOnUiThread(() -> {
                    // Optional: Only grant if it's video/audio (extra safety)
                    String[] resources = request.getResources();
                    boolean hasVideo = false;
                    boolean hasAudio = false;
                    for (String res : resources) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) hasVideo = true;
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) hasAudio = true;
                    }
                    if (hasVideo || hasAudio) {
                        request.grant(resources);
                    } else {
                        request.deny();
                    }
                });
            }
        });
    }
}
