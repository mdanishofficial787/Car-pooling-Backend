#!/usr/bin/env pwsh

# Test the Carpool Results API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Carpool Results API" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Basic Search
Write-Host "Test 1: Basic Search (NUML → Rawalpindi, 2026-05-20)" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/carpool/results?pickup=NUML&destination=Rawalpindi&travelDate=2026-05-20" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer 123456"}
    
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Results: $($data.pagination.totalResults)" -ForegroundColor Green
        if ($data.results.Count -gt 0) {
            Write-Host "First Result: $($data.results[0].driver.name) - PKR $($data.results[0].pricing.baseFare)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ FAILED: $($data.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Price Range Filter
Write-Host "Test 2: Price Range Filter (300-600)" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/carpool/results?minFare=300&maxFare=600" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer 123456"}
    
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Total Results: $($data.pagination.totalResults)" -ForegroundColor Green
        foreach ($result in $data.results) {
            Write-Host "  - $($result.driver.name): PKR $($result.pricing.baseFare)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ FAILED: $($data.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Pagination
Write-Host "Test 3: Pagination (page=1, limit=2)" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/carpool/results?page=1&limit=2" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer 123456"}
    
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success) {
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Page: $($data.pagination.page) / Total Pages: $($data.pagination.totalPages)" -ForegroundColor Green
        Write-Host "Results on this page: $($data.results.Count) / Limit: $($data.pagination.limit)" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: $($data.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Detailed Response
Write-Host "Test 4: Detailed Response Analysis" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/carpool/results" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer 123456"}
    
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.success -and $data.results.Count -gt 0) {
        $carpool = $data.results[0]
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        Write-Host "Carpool Details:" -ForegroundColor Green
        Write-Host "  Driver: $($carpool.driver.name)" -ForegroundColor Green
        Write-Host "  Verification Score: $($carpool.driver.verification.verification_score)" -ForegroundColor Green
        Write-Host "  Rating: $($carpool.driver.rating)" -ForegroundColor Green
        Write-Host "  Pickup: $($carpool.pickupLocation.area)" -ForegroundColor Green
        Write-Host "  Destination: $($carpool.destination.station)" -ForegroundColor Green
        Write-Host "  Departure: $($carpool.departure.time)" -ForegroundColor Green
        Write-Host "  Seats Available: $($carpool.seats.available)/$($carpool.seats.total)" -ForegroundColor Green
        Write-Host "  Base Fare: PKR $($carpool.pricing.baseFare)" -ForegroundColor Green
        Write-Host "  Luggage Surcharge: PKR $($carpool.pricing.luggageSurcharge)" -ForegroundColor Green
        Write-Host "  Ranking Score: $($carpool.ranking.routeMatchScore)" -ForegroundColor Green
    } else {
        Write-Host "❌ No results found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
