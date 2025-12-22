#!/usr/bin/env node
/**
 * Lighthouse Audit Script
 * 
 * Runs automated Lighthouse audits on specified pages
 * Generates HTML and JSON reports
 * 
 * Usage:
 *   npm run lighthouse
 *   npm run lighthouse -- --url=https://example.com
 *   npm run lighthouse -- --mobile
 */

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs')
const path = require('path')

// Configuration
const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000'
const OUTPUT_DIR = path.join(__dirname, '..', 'lighthouse-reports')

// Pages to audit
const PAGES_TO_AUDIT = [
  { name: 'homepage', path: '/' },
  { name: 'login', path: '/login' },
]

// Lighthouse config
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  },
}

// Mobile config
const MOBILE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    },
  },
}

async function runLighthouse(url, config, chrome) {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: ['html', 'json'],
    logLevel: 'error',
  }, config)
  
  return result
}

function formatScore(score) {
  if (score === null) return 'N/A'
  const percentage = Math.round(score * 100)
  if (percentage >= 90) return `✅ ${percentage}`
  if (percentage >= 50) return `⚠️  ${percentage}`
  return `❌ ${percentage}`
}

function printResults(pageName, lhr) {
  console.log(`\n📊 Results for ${pageName}:`)
  console.log('─'.repeat(40))
  console.log(`  Performance:    ${formatScore(lhr.categories.performance?.score)}`)
  console.log(`  Accessibility:  ${formatScore(lhr.categories.accessibility?.score)}`)
  console.log(`  Best Practices: ${formatScore(lhr.categories['best-practices']?.score)}`)
  console.log(`  SEO:            ${formatScore(lhr.categories.seo?.score)}`)
}

async function main() {
  const args = process.argv.slice(2)
  const isMobile = args.includes('--mobile')
  const customUrl = args.find(a => a.startsWith('--url='))?.split('=')[1]
  
  const baseUrl = customUrl || BASE_URL
  const config = isMobile ? MOBILE_CONFIG : LIGHTHOUSE_CONFIG
  const deviceType = isMobile ? 'mobile' : 'desktop'
  
  console.log('🔍 Lighthouse Audit')
  console.log(`📱 Device: ${deviceType}`)
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log('═'.repeat(50))
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  
  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  })
  
  const results = []
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  
  try {
    for (const page of PAGES_TO_AUDIT) {
      const url = `${baseUrl}${page.path}`
      console.log(`\n🔄 Auditing: ${url}`)
      
      try {
        const result = await runLighthouse(url, config, chrome)
        const lhr = result.lhr
        
        // Save reports
        const baseName = `${page.name}-${deviceType}-${timestamp}`
        
        // HTML report
        const htmlPath = path.join(OUTPUT_DIR, `${baseName}.html`)
        fs.writeFileSync(htmlPath, result.report[0])
        
        // JSON report
        const jsonPath = path.join(OUTPUT_DIR, `${baseName}.json`)
        fs.writeFileSync(jsonPath, result.report[1])
        
        printResults(page.name, lhr)
        
        results.push({
          page: page.name,
          url,
          scores: {
            performance: lhr.categories.performance?.score,
            accessibility: lhr.categories.accessibility?.score,
            bestPractices: lhr.categories['best-practices']?.score,
            seo: lhr.categories.seo?.score,
          },
          htmlReport: htmlPath,
          jsonReport: jsonPath,
        })
        
        console.log(`  📁 Report saved: ${baseName}.html`)
      } catch (error) {
        console.error(`  ❌ Failed to audit ${url}: ${error.message}`)
        results.push({
          page: page.name,
          url,
          error: error.message,
        })
      }
    }
  } finally {
    await chrome.kill()
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50))
  console.log('📋 SUMMARY')
  console.log('═'.repeat(50))
  
  let allPassed = true
  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.page}: Error - ${r.error}`)
      allPassed = false
    } else {
      const perf = Math.round((r.scores.performance || 0) * 100)
      const a11y = Math.round((r.scores.accessibility || 0) * 100)
      const bp = Math.round((r.scores.bestPractices || 0) * 100)
      const seo = Math.round((r.scores.seo || 0) * 100)
      
      const status = (perf >= 90 && a11y >= 90) ? '✅' : '⚠️'
      console.log(`${status} ${r.page}: Perf=${perf} A11y=${a11y} BP=${bp} SEO=${seo}`)
      
      if (perf < 90 || a11y < 90) allPassed = false
    }
  }
  
  console.log('\n📁 Reports saved in:', OUTPUT_DIR)
  
  // Save summary JSON
  const summaryPath = path.join(OUTPUT_DIR, `summary-${deviceType}-${timestamp}.json`)
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl,
    deviceType,
    results,
  }, null, 2))
  
  // Exit with error if any audit failed the threshold
  if (!allPassed) {
    console.log('\n⚠️  Some pages did not meet the 90+ threshold')
    process.exit(1)
  }
  
  console.log('\n✅ All audits passed!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
