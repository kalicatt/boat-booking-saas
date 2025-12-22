#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Convert images to WebP format for better performance
.DESCRIPTION
    Converts JPEG/PNG images in public/images to WebP format
    Requires: sharp (npm package)
.EXAMPLE
    .\scripts\convert-to-webp.ps1
#>

param(
    [string]$InputDir = "public/images",
    [int]$Quality = 85,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "🖼️  Sweet Narcisse - Image Optimization Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if sharp is installed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$hasSharp = $packageJson.devDependencies.PSObject.Properties.Name -contains "sharp"

if (-not $hasSharp) {
    Write-Host "⚠️  sharp not found. Installing..." -ForegroundColor Yellow
    npm install --save-dev sharp
}

# Create conversion script
$conversionScript = @'
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2] || 'public/images';
const quality = parseInt(process.argv[3]) || 85;
const force = process.argv[4] === 'true';

async function convertImage(inputPath, outputPath) {
    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    
    await sharp(inputPath)
        .webp({ quality })
        .toFile(outputPath);
    
    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;
    const saved = originalSize - newSize;
    const percent = ((saved / originalSize) * 100).toFixed(1);
    
    return { originalSize, newSize, saved, percent };
}

async function main() {
    console.log(`\n🔄 Converting images in: ${inputDir}`);
    console.log(`📊 Quality: ${quality}%\n`);
    
    const files = fs.readdirSync(inputDir);
    const imageFiles = files.filter(f => 
        /\.(jpg|jpeg|png)$/i.test(f) && !f.startsWith('.')
    );
    
    if (imageFiles.length === 0) {
        console.log('❌ No images found to convert');
        return;
    }
    
    let totalOriginal = 0;
    let totalNew = 0;
    let converted = 0;
    
    for (const file of imageFiles) {
        const inputPath = path.join(inputDir, file);
        const baseName = path.parse(file).name;
        const outputPath = path.join(inputDir, `${baseName}.webp`);
        
        // Skip if WebP already exists and not forcing
        if (fs.existsSync(outputPath) && !force) {
            console.log(`⏭️  Skipping ${file} (WebP exists)`);
            continue;
        }
        
        try {
            const result = await convertImage(inputPath, outputPath);
            totalOriginal += result.originalSize;
            totalNew += result.newSize;
            converted++;
            
            console.log(`✅ ${file} → ${baseName}.webp`);
            console.log(`   ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.newSize / 1024).toFixed(1)}KB (-${result.percent}%)`);
        } catch (error) {
            console.error(`❌ Failed to convert ${file}:`, error.message);
        }
    }
    
    if (converted > 0) {
        const totalSaved = totalOriginal - totalNew;
        const totalPercent = ((totalSaved / totalOriginal) * 100).toFixed(1);
        
        console.log(`\n📊 Summary:`);
        console.log(`   Files converted: ${converted}`);
        console.log(`   Original size: ${(totalOriginal / 1024).toFixed(1)}KB`);
        console.log(`   WebP size: ${(totalNew / 1024).toFixed(1)}KB`);
        console.log(`   Saved: ${(totalSaved / 1024).toFixed(1)}KB (-${totalPercent}%)`);
    } else {
        console.log('\n✨ All images already converted!');
    }
}

main().catch(console.error);
'@

# Write conversion script
$scriptPath = "scripts/convert-images.js"
$conversionScript | Out-File -FilePath $scriptPath -Encoding UTF8 -Force

Write-Host "📝 Running conversion..." -ForegroundColor Yellow
node $scriptPath $InputDir $Quality $Force.ToString().ToLower()

Write-Host "`n✅ Conversion complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update components to use WebP with fallback" -ForegroundColor White
Write-Host "2. Add <picture> tags for progressive enhancement" -ForegroundColor White
Write-Host "3. Consider removing original JPEGs if WebP works well" -ForegroundColor White
