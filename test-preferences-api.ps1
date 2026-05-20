#!/usr/bin/env pwsh

# Test the Carpool Preferences API

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Carpool Preferences API" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Build the request body
$body = @{
    draftId = 1
    genderPreference = "ANY"
    organizationName = "NUML Islamabad"
    luggagePolicy = "LARGE"
    extraLuggageCharge = 200
    smokingPreference = "NO_SMOKING"
    paymentMethods = @("CASH", "EASYPAISA")
    paymentSchedule = "PER_RIDE"
    baseFare = 500
    note = "Please be on time"
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Yellow
$body | Write-Host
Write-Host ""

try {
    Write-Host "Sending POST request to /api/carpool/preferences..." -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/carpool/preferences" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer 123456"
            "Content-Type" = "application/json"
        } `
        -Body $body
    
    Write-Host "`n✅ SUCCESS - HTTP 201 Created" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ ERROR" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "`nError Response:" -ForegroundColor Red
        $errorContent | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Red
    } catch {
        # Ignore parsing errors
    }
}
