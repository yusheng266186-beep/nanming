param(
    [Parameter(Mandatory = $true)]
    [string] $ImagePath,

    [string] $Language = 'zh-Hans',

    [switch] $Json
)

$ErrorActionPreference = 'Stop'
# Emit UTF-8 regardless of the console code page, so callers that decode as UTF-8
# (utf-8-sig) get valid JSON on every Windows locale instead of the ANSI code page.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] > $null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] > $null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] > $null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] > $null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime] > $null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] > $null
[Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime] > $null
[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime] > $null

function Await-WinRt {
    param(
        [Parameter(Mandatory = $true)] $Operation,
        [Parameter(Mandatory = $true)] [Type] $ResultType
    )

    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethod -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1
    $task = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$resolved = (Resolve-Path -LiteralPath $ImagePath).Path
$file = Await-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolved)) ([Windows.Storage.StorageFile])
$stream = Await-WinRt ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await-WinRt ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new($Language))
if ($null -eq $engine) {
    throw "Windows OCR engine is unavailable for language: $Language"
}
$result = Await-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
if ($Json) {
    $lines = @(
        foreach ($line in $result.Lines) {
            [ordered]@{
                text = $line.Text
                words = @(
                    foreach ($word in $line.Words) {
                        [ordered]@{
                            text = $word.Text
                            x = $word.BoundingRect.X
                            y = $word.BoundingRect.Y
                            width = $word.BoundingRect.Width
                            height = $word.BoundingRect.Height
                        }
                    }
                )
            }
        }
    )
    [ordered]@{
        language = $Language
        text_angle = $result.TextAngle
        text = $result.Text
        lines = $lines
    } | ConvertTo-Json -Depth 8
} else {
    $result.Text
}
