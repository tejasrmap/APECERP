Add-Type -AssemblyName System.Drawing

$outputDir = "c:\Users\tejag\Downloads\APECERP\play_store_assets"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# 1. Official Logo -> 512x512
$srcLogoPath = "c:\Users\tejag\Downloads\APECERP\public\logo.jpeg"
$srcLogo = [System.Drawing.Image]::FromFile($srcLogoPath)
$iconBmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillRectangle($brush, 0, 0, 512, 512)

# Centered logo with padding
$pad = 26
$size = 460
$g.DrawImage($srcLogo, $pad, $pad, $size, $size)
$g.Dispose()
$srcLogo.Dispose()

$officialIconPath = Join-Path $outputDir "app_icon_512x512_official.png"
$iconBmp.Save($officialIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Dispose()
Write-Host "Created: $officialIconPath"

# 2. Modern 3D Helmet Icon -> 512x512
$src3dPath = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\apec_app_icon_1788982081596.jpg"
if (Test-Path $src3dPath) {
    $src3d = [System.Drawing.Image]::FromFile($src3dPath)
    $icon3dBmp = New-Object System.Drawing.Bitmap(512, 512)
    $g2 = [System.Drawing.Graphics]::FromImage($icon3dBmp)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.DrawImage($src3d, 0, 0, 512, 512)
    $g2.Dispose()
    $src3d.Dispose()

    $modernIconPath = Join-Path $outputDir "app_icon_512x512_modern_3d.png"
    $icon3dBmp.Save($modernIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $icon3dBmp.Dispose()
    Write-Host "Created: $modernIconPath"
}

# 3. Feature Graphic -> 1024x500
$srcFeatPath = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\apec_feature_graphic_1788982057997.jpg"
if (Test-Path $srcFeatPath) {
    $srcFeat = [System.Drawing.Image]::FromFile($srcFeatPath)
    $featBmp = New-Object System.Drawing.Bitmap(1024, 500)
    $g3 = [System.Drawing.Graphics]::FromImage($featBmp)
    $g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $srcW = $srcFeat.Width
    $srcH = [int]($srcW / (1024.0 / 500.0))
    $srcY = [int](($srcFeat.Height - $srcH) / 2)
    if ($srcY -lt 0) { $srcY = 0 }

    $destRect = New-Object System.Drawing.Rectangle(0, 0, 1024, 500)
    $srcRect = New-Object System.Drawing.Rectangle(0, $srcY, $srcW, $srcH)
    $g3.DrawImage($srcFeat, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g3.Dispose()
    $srcFeat.Dispose()

    $featPngPath = Join-Path $outputDir "feature_graphic_1024x500.png"
    $featJpgPath = Join-Path $outputDir "feature_graphic_1024x500.jpg"
    $featBmp.Save($featPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $featBmp.Save($featJpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $featBmp.Dispose()
    Write-Host "Created: $featPngPath"
    Write-Host "Created: $featJpgPath"
}
