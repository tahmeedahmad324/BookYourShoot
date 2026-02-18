# Copy Test Images from Downloads to test_images folder
# This script copies the 2 most recent JPG images from Downloads

$downloadsPath = "$env:USERPROFILE\Downloads"
$testImagesPath = "C:\Users\hp\Documents\GitHub\BookYourShoot\test_images"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST IMAGES COPY SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get 2 most recent JPG files from Downloads
Write-Host "`nSearching for JPG images in Downloads..." -ForegroundColor Yellow
$recentImages = Get-ChildItem "$downloadsPath\*.jpg" -ErrorAction SilentlyContinue | 
                Sort-Object LastWriteTime -Descending | 
                Select-Object -First 2

if ($recentImages.Count -lt 2) {
    Write-Host "`n❌ ERROR: Found only $($recentImages.Count) JPG image(s) in Downloads" -ForegroundColor Red
    Write-Host "`nPLEASE DO THIS:" -ForegroundColor Yellow
    Write-Host "1. Download 2 photos of the SAME person to Downloads folder" -ForegroundColor White
    Write-Host "2. Make sure they are .jpg or .jpeg files" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ Found 2 recent images:" -ForegroundColor Green
$recentImages | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor White }

# Copy and rename
Write-Host "`nCopying images to test_images folder..." -ForegroundColor Yellow

$img1 = $recentImages[0]
$img2 = $recentImages[1]

Copy-Item $img1.FullName "$testImagesPath\ref1.jpg" -Force
Copy-Item $img2.FullName "$testImagesPath\event1.jpg" -Force

Write-Host "`n✅ SUCCESS! Images copied:" -ForegroundColor Green
Write-Host "   ref1.jpg   <- $($img1.Name)" -ForegroundColor White
Write-Host "   event1.jpg <- $($img2.Name)" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "NEXT STEP: Run the test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`ncd BookYourShoot" -ForegroundColor Yellow
Write-Host "python test_insightface_standalone.py" -ForegroundColor Yellow
Write-Host ""
