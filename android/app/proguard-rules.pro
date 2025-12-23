# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---- Missing classes for R8 ----
# Java beans classes not available on Android
-dontwarn java.beans.**

# SLF4J logging
-dontwarn org.slf4j.**

# Jackson databind
-dontwarn com.fasterxml.jackson.databind.**
-keep class com.fasterxml.jackson.** { *; }

# Stripe Terminal SDK
-keep class com.stripe.stripeterminal.** { *; }
-dontwarn com.stripe.stripeterminal.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
