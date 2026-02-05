# Fix Large Commit - Remove Images and Push
Write-Host "`n=== FIXING LARGE COMMIT ===" -ForegroundColor Cyan
Write-Host "This will remove images from your commit and push to GitHub`n" -ForegroundColor Yellow

# Step 1: Reset the problematic commit
Write-Host "1. Undoing the large commit..." -ForegroundColor Green
git reset --soft HEAD~1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error resetting commit!" -ForegroundColor Red
    exit 1
}

# Step 2: Unstage everything
Write-Host "2. Unstaging all files..." -ForegroundColor Green  
git reset HEAD

# Step 3: Remove images from Git tracking (keeps them locally)
Write-Host "3. Removing images from Git..." -ForegroundColor Green
git rm -r --cached --ignore-unmatch backend/backend/storage/

# Step 4: Add only code files
Write-Host "4. Staging code files..." -ForegroundColor Green
git add backend/services/
git add backend/routers/
git add backend/*.py
git add .gitignore
git add *.md

# Step 5: Check what will be committed
Write-Host "`n5. Files to commit:" -ForegroundColor Yellow
git status --short

# Step 6: Commit
Write-Host "`n6. Creating new commit..." -ForegroundColor Green
git commit -m "feat: Album builder module with face recognition and album organization"

# Step 7: Push to GitHub
Write-Host "`n7. Pushing to GitHub..." -ForegroundColor Green
git push origin main

Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
Write-Host "Your code is now on GitHub (without the large image files)" -ForegroundColor Green
Write-Host "Images are still on your computer in backend/backend/storage/`n" -ForegroundColor Cyan
