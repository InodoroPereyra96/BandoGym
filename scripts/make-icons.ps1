# Genera todos los iconos de la PWA a partir de icons/logo-original.png (el
# logo real de BandoGym: Atlas sosteniendo un bandoneon). Reemplaza la version
# anterior de este script, que dibujaba un icono placeholder de fuelles con
# formas geometricas (ver DECISIONES.md punto 40).
#
# Paso 1: recorta el fondo plano del logo original (deja transparencia) y
#         guarda ese resultado reutilizable en icons/logo-cutout.png.
# Paso 2: a partir del cutout, compone cada tamano/variante final sobre un
#         fondo azul marino solido (tomado del propio arte) para que el
#         recorte redondeado del sistema operativo no deje bordes raros.
#
# Volver a correr este script (`powershell -File scripts/make-icons.ps1`)
# regenera todo desde cero si se reemplaza icons/logo-original.png por una
# version nueva del logo.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root "icons\logo-original.png"
$cutoutPath = Join-Path $root "icons\logo-cutout.png"

# ---------- Paso 1: quitar el fondo plano (flood fill desde los bordes) ----------

function Remove-FlatBackground {
  param([string]$InPath, [string]$OutPath, [int]$Threshold = 48)

  $src = New-Object System.Drawing.Bitmap($InPath)
  $w = $src.Width; $h = $src.Height
  $fmt = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb

  $bmp = New-Object System.Drawing.Bitmap($w, $h, $fmt)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($src, 0, 0, $w, $h)
  $g.Dispose()
  $src.Dispose()

  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $fmt)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

  # Color de referencia del fondo: la esquina superior izquierda.
  $refB = [int]$bytes[0]; $refG = [int]$bytes[1]; $refR = [int]$bytes[2]

  $visited = New-Object bool[] ($w * $h)
  $stack = New-Object System.Collections.Generic.Stack[int]
  for ($x = 0; $x -lt $w; $x++) {
    $stack.Push((0 * $w) + $x)
    $stack.Push((($h - 1) * $w) + $x)
  }
  for ($y = 0; $y -lt $h; $y++) {
    $stack.Push(($y * $w) + 0)
    $stack.Push(($y * $w) + ($w - 1))
  }

  while ($stack.Count -gt 0) {
    $p = $stack.Pop()
    if ($visited[$p]) { continue }
    $visited[$p] = $true
    $x = $p % $w
    $y = [int](($p - $x) / $w)
    $i = ($y * $stride) + ($x * 4)
    $b = [int]$bytes[$i]; $gg = [int]$bytes[$i + 1]; $r = [int]$bytes[$i + 2]
    if (([math]::Abs($r - $refR) -gt $Threshold) -or ([math]::Abs($gg - $refG) -gt $Threshold) -or ([math]::Abs($b - $refB) -gt $Threshold)) {
      continue
    }
    $bytes[$i] = 0; $bytes[$i + 1] = 0; $bytes[$i + 2] = 0; $bytes[$i + 3] = 0
    if ($x -gt 0) { $np = $p - 1; if (-not $visited[$np]) { $stack.Push($np) } }
    if ($x -lt ($w - 1)) { $np = $p + 1; if (-not $visited[$np]) { $stack.Push($np) } }
    if ($y -gt 0) { $np = $p - $w; if (-not $visited[$np]) { $stack.Push($np) } }
    if ($y -lt ($h - 1)) { $np = $p + $w; if (-not $visited[$np]) { $stack.Push($np) } }
  }

  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $bmp.UnlockBits($data)

  # Bounding box de lo que quedo opaco, para recortar el margen sobrante.
  $data2 = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, $fmt)
  $bytes2 = New-Object byte[] ($stride * $h)
  [System.Runtime.InteropServices.Marshal]::Copy($data2.Scan0, $bytes2, 0, $bytes2.Length)
  $bmp.UnlockBits($data2)
  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $i = ($y * $stride) + ($x * 4)
      if ($bytes2[$i + 3] -gt 10) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $cropRect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
  $cutout = $bmp.Clone($cropRect, $fmt)
  $bmp.Dispose()
  $cutout.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "Cutout: $OutPath ($($cutout.Width) x $($cutout.Height))"
  $cutout.Dispose()
}

# ---------- Paso 2: componer cada tamano sobre fondo solido ----------

function New-FlatIcon {
  param([System.Drawing.Bitmap]$Cutout, [int]$Size, [string]$OutPath, [double]$ContentFraction, [System.Drawing.Color]$BgColor)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $brush = New-Object System.Drawing.SolidBrush($BgColor)
  $g.FillRectangle($brush, 0, 0, $Size, $Size)
  $brush.Dispose()

  $targetMax = $Size * $ContentFraction
  $scale = $targetMax / [math]::Max($Cutout.Width, $Cutout.Height)
  $dw = $Cutout.Width * $scale
  $dh = $Cutout.Height * $scale
  $g.DrawImage($Cutout, (($Size - $dw) / 2), (($Size - $dh) / 2), $dw, $dh)
  $g.Dispose()

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "Generado: $OutPath ($Size x $Size, contenido $([math]::Round($ContentFraction * 100))%)"
}

Remove-FlatBackground -InPath $srcPath -OutPath $cutoutPath -Threshold 48

$cutout = New-Object System.Drawing.Bitmap($cutoutPath)
# Azul marino oscuro tomado del propio arte (interior de la insignia): el
# relleno de las esquinas transparentes queda practicamente invisible.
$navy = [System.Drawing.Color]::FromArgb(255, 9, 16, 32)

# Iconos normales: casi de borde a borde (98%, un pelo de margen para que no
# se sienta "cortado" al recortarlo el SO en forma redondeada).
New-FlatIcon -Cutout $cutout -Size 512 -OutPath (Join-Path $root "icons\icon-512.png") -ContentFraction 0.98 -BgColor $navy
New-FlatIcon -Cutout $cutout -Size 192 -OutPath (Join-Path $root "icons\icon-192.png") -ContentFraction 0.98 -BgColor $navy
New-FlatIcon -Cutout $cutout -Size 180 -OutPath (Join-Path $root "icons\icon-180.png") -ContentFraction 0.98 -BgColor $navy
New-FlatIcon -Cutout $cutout -Size 32  -OutPath (Join-Path $root "icons\favicon-32.png") -ContentFraction 0.98 -BgColor $navy

# Maskable: mas margen (zona segura) para que un recorte circular/squircle de
# Android no le coma la bandoneon ni las manos.
New-FlatIcon -Cutout $cutout -Size 512 -OutPath (Join-Path $root "icons\icon-512-maskable.png") -ContentFraction 0.72 -BgColor $navy

$cutout.Dispose()
