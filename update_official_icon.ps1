Add-Type -AssemblyName System.Drawing

$outputDir = "c:\Users\tejag\Downloads\APECERP\play_store_assets"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# 1. Official Logo -> 512x512 Seamless Clean Background
$srcLogoPath = "c:\Users\tejag\Downloads\APECERP\public\logo.jpeg"
$srcLogoBmp = New-Object System.Drawing.Bitmap($srcLogoPath)
$cornerColor = $srcLogoBmp.GetPixel(4, 4)

$iconBmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$brush = New-Object System.Drawing.SolidBrush($cornerColor)
$g.FillRectangle($brush, 0, 0, 512, 512)

# Perfectly centered
$size = 472
$pad = [int]((512 - $size) / 2)
$g.DrawImage($srcLogoBmp, $pad, $pad, $size, $size)
$g.Dispose()
$srcLogoBmp.Dispose()

$officialIconPath = Join-Path $outputDir "app_icon_512x512_official.png"
$iconBmp.Save($officialIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Dispose()
Write-Host "Created: $officialIconPath"
