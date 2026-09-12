Add-Type -AssemblyName System.Drawing

function New-BandoneonIcon {
    param([int]$size, [string]$outPath, [bool]$maskablePad)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bgColor = [System.Drawing.Color]::FromArgb(255, 42, 16, 21)
    $g.Clear($bgColor)

    $pad = $size * 0.10
    if ($maskablePad) { $pad = $size * 0.22 }
    $inner = $size - ($pad * 2)

    $gold = [System.Drawing.Color]::FromArgb(255, 196, 154, 74)
    $goldDark = [System.Drawing.Color]::FromArgb(255, 150, 112, 48)
    $foldCount = 5
    $foldH = $inner / $foldCount

    for ($i = 0; $i -lt $foldCount; $i++) {
        $y = $pad + ($i * $foldH)
        if ($i % 2 -eq 0) { $color = $gold } else { $color = $goldDark }
        $brush = New-Object System.Drawing.SolidBrush($color)
        $shrink = $inner * 0.06 * $i
        $x1 = $pad + $shrink
        $x2 = $size - $pad - $shrink
        $p1 = New-Object System.Drawing.PointF($x1, $y)
        $p2 = New-Object System.Drawing.PointF($x2, $y)
        $p3 = New-Object System.Drawing.PointF(($x2 - $inner*0.04), ($y + $foldH))
        $p4 = New-Object System.Drawing.PointF(($x1 + $inner*0.04), ($y + $foldH))
        $points = [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4)
        $g.FillPolygon($brush, $points)
        $brush.Dispose()
    }

    $g.Flush()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output ("Generado: " + $outPath)
}

New-BandoneonIcon -size 512 -outPath "C:\Proyectos\bandoneon-app\icons\icon-512.png" -maskablePad $false
New-BandoneonIcon -size 512 -outPath "C:\Proyectos\bandoneon-app\icons\icon-512-maskable.png" -maskablePad $true
New-BandoneonIcon -size 192 -outPath "C:\Proyectos\bandoneon-app\icons\icon-192.png" -maskablePad $false
New-BandoneonIcon -size 180 -outPath "C:\Proyectos\bandoneon-app\icons\icon-180.png" -maskablePad $false
New-BandoneonIcon -size 32 -outPath "C:\Proyectos\bandoneon-app\icons\favicon-32.png" -maskablePad $false
