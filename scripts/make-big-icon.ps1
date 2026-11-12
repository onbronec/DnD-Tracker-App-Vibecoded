param(
    [string]$InputImg = "dnd-icon-preview.jpg",
    [string]$OutputPng = "dnd-cropped.png",
    [string]$OutputIco = "dnd.ico"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($InputImg)

# Bounding box of d20 die: minX=226, maxX=796, minY=170, maxY=844
# Center = (511, 507), Size = 570 x 674
$centerX = 511
$centerY = 507
$cropSize = 710 # Leaves ~18px margin on top/bottom, die fills 95%

$srcX = [int]($centerX - ($cropSize / 2))
$srcY = [int]($centerY - ($cropSize / 2))

# Create cropped 32-bit ARGB bitmap
$cropped = New-Object System.Drawing.Bitmap $cropSize, $cropSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle 0, 0, $cropSize, $cropSize
$srcRect = New-Object System.Drawing.Rectangle $srcX, $srcY, $cropSize, $cropSize
$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Now make dark background pixels transparent outside the die
# The background is dark navy/black (R < 35, G < 38, B < 42).
# We can do a flood fill or radial distance / threshold to make the outer background completely transparent:
$bgR = 22; $bgG = 27; $bgB = 31

for ($y = 0; $y -lt $cropSize; $y++) {
    for ($x = 0; $x -lt $cropSize; $x++) {
        $p = $cropped.GetPixel($x, $y)
        # Compute difference from background color
        $diff = [Math]::Sqrt([Math]::Pow($p.R - $bgR, 2) + [Math]::Pow($p.G - $bgG, 2) + [Math]::Pow($p.B - $bgB, 2))
        
        # If very close to background color, make transparent
        if ($diff -lt 15) {
            $cropped.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } elseif ($diff -lt 35) {
            # Smooth edge alpha transition
            $alpha = [int](($diff - 15) / 20 * 255)
            $cropped.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
        }
    }
}

$cropped.Save($OutputPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "[OK] Cropped PNG saved to $OutputPng"

# Now generate multi-resolution ICO: 16, 32, 48, 64, 128, 256
$sizes = @(16, 32, 48, 64, 128, 256)
$pngStreams = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($bmp)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.Clear([System.Drawing.Color]::Transparent)
    $g2.DrawImage($cropped, 0, 0, $sz, $sz)
    $g2.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += ,@($sz, $ms.ToArray())
    $ms.Dispose()
}

$cropped.Dispose()
$src.Dispose()

# Write ICO binary
$fs = [System.IO.File]::Create($OutputIco)
$bw = New-Object System.IO.BinaryWriter $fs

$numImages = $pngStreams.Count
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$numImages)

$offset = 6 + (16 * $numImages)

foreach ($entry in $pngStreams) {
    $sz = $entry[0]
    $bytes = $entry[1]
    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}

foreach ($entry in $pngStreams) {
    $bytes = $entry[1]
    $bw.Write($bytes)
}

$bw.Flush()
$bw.Close()
$fs.Close()

Write-Host "[OK] New large d20 ICO saved to $OutputIco"
