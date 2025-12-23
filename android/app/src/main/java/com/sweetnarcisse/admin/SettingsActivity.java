package com.sweetnarcisse.admin;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

/**
 * Activité des paramètres
 */
public class SettingsActivity extends AppCompatActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);
        
        // Setup toolbar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("Paramètres");
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        // Version de l'app
        TextView versionText = findViewById(R.id.versionText);
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            String version = packageInfo.versionName + " (" + packageInfo.versionCode + ")";
            versionText.setText(version);
        } catch (PackageManager.NameNotFoundException e) {
            versionText.setText("Inconnue");
        }
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}
