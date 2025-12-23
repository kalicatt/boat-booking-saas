package com.sweetnarcisse.admin;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.util.Size;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.Task;
import com.google.android.material.button.MaterialButton;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.sweetnarcisse.admin.api.ApiClient;
import com.sweetnarcisse.admin.api.BookingService;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

import java.io.IOException;
import java.net.URLDecoder;

/**
 * Activité de scan de QR Code pour check-in
 * Utilise CameraX + ML Kit
 */
public class ScannerActivity extends AppCompatActivity {
    
    private static final String TAG = "ScannerActivity";
    private static final int CAMERA_PERMISSION_REQUEST = 100;
    
    private PreviewView previewView;
    private MaterialButton cancelButton;
    
    private ExecutorService cameraExecutor;
    private BarcodeScanner barcodeScanner;
    private BookingService bookingService;
    
    private boolean isProcessing = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scanner);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Scanner QR Code");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Bind views
        previewView = findViewById(R.id.previewView);
        cancelButton = findViewById(R.id.cancelButton);
        
        // Setup scanner
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build();
        barcodeScanner = BarcodeScanning.getClient(options);
        
        // Setup API service
        bookingService = new BookingService(ApiClient.getInstance());
        
        // Setup buttons
        cancelButton.setOnClickListener(v -> finish());
        
        // Setup camera executor
        cameraExecutor = Executors.newSingleThreadExecutor();
        
        // Check camera permission
        if (hasCameraPermission()) {
            startCamera();
        } else {
            requestCameraPermission();
        }
    }
    
    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
    }
    
    private void requestCameraPermission() {
        ActivityCompat.requestPermissions(this,
            new String[]{Manifest.permission.CAMERA},
            CAMERA_PERMISSION_REQUEST);
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                          @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Permission caméra requise", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }
    
    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
            ProcessCameraProvider.getInstance(this);
        
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                bindCamera(cameraProvider);
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Erreur lors de l'initialisation de la caméra", e);
            }
        }, ContextCompat.getMainExecutor(this));
    }
    
    private void bindCamera(ProcessCameraProvider cameraProvider) {
        // Preview
        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());
        
        // Image analysis pour le scan QR
        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
            .setTargetResolution(new Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build();
        
        imageAnalysis.setAnalyzer(cameraExecutor, imageProxy -> {
            if (!isProcessing) {
                @androidx.camera.core.ExperimentalGetImage
                android.media.Image mediaImage = imageProxy.getImage();
                
                if (mediaImage != null) {
                    InputImage image = InputImage.fromMediaImage(mediaImage,
                        imageProxy.getImageInfo().getRotationDegrees());
                    
                    processImage(image);
                }
            }
            
            imageProxy.close();
        });
        
        // Camera selector (back camera)
        CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;
        
        try {
            // Unbind all before rebinding
            cameraProvider.unbindAll();
            
            // Bind use cases to camera
            Camera camera = cameraProvider.bindToLifecycle(
                this, cameraSelector, preview, imageAnalysis);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du binding de la caméra", e);
        }
    }
    
    private void processImage(InputImage image) {
        Task<List<Barcode>> result = barcodeScanner.process(image);
        
        result.addOnSuccessListener(barcodes -> {
            for (Barcode barcode : barcodes) {
                if (barcode.getFormat() == Barcode.FORMAT_QR_CODE) {
                    String rawValue = barcode.getRawValue();
                    if (rawValue != null && !isProcessing) {
                        handleQrCode(rawValue);
                    }
                }
            }
        }).addOnFailureListener(e -> {
            Log.e(TAG, "Erreur lors du scan", e);
        });
    }
    
    private void handleQrCode(String qrData) {
        isProcessing = true;
        
        Log.d(TAG, "QR Code détecté: " + qrData);
        
        try {
            // Parser l'URL du QR code
            // Format attendu: https://sweet-narcisse.fr/booking/{bookingId}?token={token}
            
            if (!qrData.contains("/booking/")) {
                runOnUiThread(() -> {
                    Toast.makeText(this, "QR Code invalide", Toast.LENGTH_SHORT).show();
                    isProcessing = false;
                });
                return;
            }
            
            // Extraire bookingId et token
            String[] parts = qrData.split("/booking/");
            if (parts.length < 2) {
                throw new IllegalArgumentException("Format QR invalide");
            }
            
            String[] idAndToken = parts[1].split("\\?token=");
            if (idAndToken.length < 2) {
                throw new IllegalArgumentException("Token manquant");
            }
            
            String bookingId = idAndToken[0];
            String token = URLDecoder.decode(idAndToken[1], "UTF-8");
            
            // Appel API pour vérifier et check-in
            verifyAndCheckin(bookingId, token);
            
        } catch (Exception e) {
            Log.e(TAG, "Erreur lors du parsing du QR", e);
            runOnUiThread(() -> {
                Toast.makeText(this, "QR Code invalide", Toast.LENGTH_SHORT).show();
                isProcessing = false;
            });
        }
    }
    
    private void verifyAndCheckin(String bookingId, String token) {
        bookingService.verifyAndCheckin(bookingId, token, true, new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Erreur réseau lors de la vérification", e);
                runOnUiThread(() -> {
                    Toast.makeText(ScannerActivity.this,
                        "Erreur réseau", Toast.LENGTH_SHORT).show();
                    isProcessing = false;
                });
            }
            
            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String body = response.body().string();
                
                if (response.isSuccessful()) {
                    // Parse la réponse et afficher confirmation
                    runOnUiThread(() -> {
                        Intent intent = new Intent(ScannerActivity.this,
                            CheckinConfirmationActivity.class);
                        intent.putExtra("response", body);
                        startActivity(intent);
                        finish();
                    });
                } else {
                    runOnUiThread(() -> {
                        String message;
                        if (response.code() == 404) {
                            message = "Réservation introuvable";
                        } else if (response.code() == 400) {
                            message = "QR Code invalide ou expiré";
                        } else {
                            message = "Erreur: " + response.code();
                        }
                        
                        Toast.makeText(ScannerActivity.this, message,
                            Toast.LENGTH_LONG).show();
                        isProcessing = false;
                    });
                }
            }
        });
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        cameraExecutor.shutdown();
        barcodeScanner.close();
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
