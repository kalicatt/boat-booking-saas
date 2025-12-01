package com.sweetnarcisse.admin.overlays;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.Nullable;

/**
 * Semi-transparent overlay with a rounded rectangle cutout to highlight the scan area.
 */
public class ScannerOverlayView extends View {

    private final Paint dimPaint = new Paint();
    private final Paint framePaint = new Paint();
    private final RectF frameRect = new RectF();
    private final Paint clearPaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    public ScannerOverlayView(Context context) {
        super(context);
        init();
    }

    public ScannerOverlayView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public ScannerOverlayView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        setWillNotDraw(false);
        setClickable(false);
        setFocusable(false);
        setLayerType(LAYER_TYPE_HARDWARE, null);
        dimPaint.setColor(0x990F172A); // translucent slate background
        dimPaint.setStyle(Paint.Style.FILL);

        framePaint.setColor(0xFFFFFFFF);
        framePaint.setStyle(Paint.Style.STROKE);
        framePaint.setStrokeWidth(dpToPx(4f));
        framePaint.setAntiAlias(true);

        clearPaint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
    }

    private float dpToPx(float dp) {
        return dp * getResources().getDisplayMetrics().density;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        float frameSize = Math.min(w, h) * 0.55f;
        float left = (w - frameSize) / 2f;
        float top = (h - frameSize) / 2f;
        frameRect.set(left, top, left + frameSize, top + frameSize);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float radius = dpToPx(28f);
        canvas.drawRect(0, 0, getWidth(), getHeight(), dimPaint);
        canvas.drawRoundRect(frameRect, radius, radius, clearPaint);
        canvas.drawRoundRect(frameRect, radius, radius, framePaint);
    }
}
