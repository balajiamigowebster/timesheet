Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Building Frontend React Application..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Change directory to frontend and run build
Push-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend compilation failed!"
    Pop-Location
    Exit 1
}
Pop-Location

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "2. Copying built files to backend..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Create backend/public directory if it doesn't exist, and clean it
$publicDir = "backend/public"
if (Test-Path $publicDir) {
    Remove-Item -Path "$publicDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $publicDir -Force
}

# Copy compiled frontend dist files to backend public
Copy-Item -Path "frontend/dist\*" -Destination $publicDir -Recurse -Force

Write-Host "Static files successfully copied to backend/public/" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "3. Creating Zip Archive for Hostinger..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Create a clean temporary directory for zipping
$tempDir = "temp_build"
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $tempDir -Force

# Copy backend files except node_modules to the temp directory
Get-ChildItem -Path "backend" -Exclude "node_modules" | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

$zipPath = "timesheet_hostinger_build.zip"
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}

# Compress the temporary build folder
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temporary folder
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Successfully packaged build into: $zipPath" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
