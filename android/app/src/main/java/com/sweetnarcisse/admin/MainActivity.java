package com.sweetnarcisse.admin;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;
import com.sweetnarcisse.admin.overlays.ScannerOverlayView;

public class MainActivity extends BridgeActivity {

	private ScannerOverlayView scannerOverlayView;
	private boolean scannerInterfaceRegistered = false;

	@Override
	protected void onCreate(@Nullable Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		scannerOverlayView = findViewById(R.id.scanner_overlay);
		if (scannerOverlayView != null) {
			scannerOverlayView.setVisibility(View.GONE);
		}
	}

	@Override
	public void onStart() {
		super.onStart();
		registerScannerListener();
	}

	@Override
	public void onStop() {
		super.onStop();
		unregisterScannerListener();
	}

	private void registerScannerListener() {
		if (bridge == null || bridge.getWebView() == null || scannerInterfaceRegistered) {
			return;
		}

		WebView webView = bridge.getWebView();
		webView.addJavascriptInterface(new ScannerOverlayBridge(webView), "ScannerOverlay");
		scannerInterfaceRegistered = true;
	}

	private void unregisterScannerListener() {
		if (scannerOverlayView != null) {
			scannerOverlayView.setVisibility(View.GONE);
		}
		if (bridge != null && bridge.getWebView() != null) {
			bridge.getWebView().setAlpha(1f);
			bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
		}
	}

	private final class ScannerOverlayBridge {
		@Nullable
		private final WebView webView;

		ScannerOverlayBridge(@Nullable WebView webView) {
			this.webView = webView;
		}

		@JavascriptInterface
		public void showOverlay() {
			runOnUiThread(
				() -> {
					if (scannerOverlayView != null) {
						scannerOverlayView.setVisibility(View.VISIBLE);
					}
				}
			);
		}

		@JavascriptInterface
		public void hideOverlay() {
			runOnUiThread(
				() -> {
					if (scannerOverlayView != null) {
						scannerOverlayView.setVisibility(View.GONE);
					}
				}
			);
		}

		@JavascriptInterface
		public void hideWebView() {
			runOnUiThread(
				() -> {
					if (webView != null) {
						webView.setAlpha(0f);
						webView.setBackgroundColor(Color.TRANSPARENT);
					}
				}
			);
		}

		@JavascriptInterface
		public void showWebView() {
			runOnUiThread(
				() -> {
					if (webView != null) {
						webView.setAlpha(1f);
						webView.setBackgroundColor(Color.TRANSPARENT);
					}
				}
			);
		}
	}
}
