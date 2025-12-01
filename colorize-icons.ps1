# colorize-icons.ps1
$src = "src\map\icons"
$fuzz = "50%"
$colonial = "#65875E"
$warden = "#2F5DAA"

Get-ChildItem -Path $src -Filter *.png | Where-Object { $_.BaseName -notmatch 'Colonial|Warden' } | ForEach-Object {
    $in = $_.FullName
    $base = $_.BaseName
    $ext = $_.Extension
    
    Write-Host "Processing: $($_.Name)"
    
    # Generate Colonial variant
    magick "$in" -fuzz $fuzz -fill $colonial -opaque white (Join-Path $src ($base + "Colonial" + $ext))
    
    # Generate Warden variant
    magick "$in" -fuzz $fuzz -fill $warden -opaque white (Join-Path $src ($base + "Warden" + $ext))
}

Write-Host "Done! Generated Colonial and Warden variants."