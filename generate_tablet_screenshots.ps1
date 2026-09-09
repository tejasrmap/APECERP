Add-Type -AssemblyName System.Drawing

$outputDir = "c:\Users\tejag\Downloads\APECERP\play_store_assets\tablet_screenshots"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$images = @(
    @{
        Source = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\tablet_screen_1_dashboard_direct_1788983201864.jpg"
        Name   = "tablet_screenshot_1_dashboard.jpg"
    },
    @{
        Source = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\tablet_screen_2_attendance_1788983074013.jpg"
        Name   = "tablet_screenshot_2_attendance_map.jpg"
    },
    @{
        Source = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\tablet_screen_3_reports_1788983106656.jpg"
        Name   = "tablet_screenshot_3_inspection_report.jpg"
    },
    @{
        Source = "C:\Users\tejag\.gemini\antigravity-ide\brain\435cc483-67f3-41bc-91fa-badad5bf60b8\tablet_screen_4_tracking_1788983152374.jpg"
        Name   = "tablet_screenshot_4_workforce_tracking.jpg"
    }
)

foreach ($item in $images) {
    if (Test-Path $item.Source) {
        $src = [System.Drawing.Image]::FromFile($item.Source)
        
        # Target exact 1920 x 1080 (16:9 ratio)
        $targetW = 1920
        $targetH = 1080
        $destBmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        # Source aspect ratio fit/crop
        $srcW = $src.Width
        $srcH = $src.Height
        $targetRatio = 1920.0 / 1080.0
        $srcRatio = [double]$srcW / [double]$srcH

        if ($srcRatio -gt $targetRatio) {
            # Source is wider, crop width
            $cropW = [int]($srcH * $targetRatio)
            $cropH = $srcH
            $cropX = [int](($srcW - $cropW) / 2)
            $cropY = 0
        } else {
            # Source is taller, crop height
            $cropW = $srcW
            $cropH = [int]($srcW / $targetRatio)
            $cropX = 0
            $cropY = [int](($srcH - $cropH) / 2)
        }

        $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)
        $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

        $destPath = Join-Path $outputDir $item.Name
        $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

        $g.Dispose()
        $destBmp.Dispose()
        $src.Dispose()

        Write-Host "Created: $destPath (1920x1080 px)"
    } else {
        Write-Host "File not found: $($item.Source)"
    }
}
