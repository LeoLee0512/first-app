param(
    [string]$InputDocx,
    [string]$OutputPdf
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if (-not $InputDocx) {
    $manualDirectory = Join-Path $root "docs\manual\v1.5.1"
    $matches = @(Get-ChildItem -LiteralPath $manualDirectory -File -Filter "Computational-Mechanics-Solver-v1.5.1-*.docx")
    if ($matches.Count -ne 1) {
        throw "Expected one generated v1.5.1 manual DOCX, found $($matches.Count)."
    }
    $InputDocx = $matches[0].FullName
}
if (-not $OutputPdf) {
    $OutputPdf = Join-Path $root "web\downloads\computational-mechanics-solver-v1.5.1-manual.pdf"
}

$inputPath = [System.IO.Path]::GetFullPath($InputDocx)
$outputPath = [System.IO.Path]::GetFullPath($OutputPdf)
if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
    throw "Manual DOCX not found: $inputPath"
}
New-Item -ItemType Directory -Path (Split-Path -Parent $outputPath) -Force | Out-Null

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $documents = $word.Documents
    $flags = [System.Reflection.BindingFlags]::InvokeMethod
    $document = $documents.GetType().InvokeMember(
        "Open",
        $flags,
        $null,
        $documents,
        @($inputPath, $false, $false, $false)
    )

    $equationNames = @()
    foreach ($bookmark in $document.Bookmarks) {
        if ($bookmark.Name -like "eqbody_*") {
            $equationNames += $bookmark.Name
        }
    }
    foreach ($name in $equationNames) {
        if (-not $document.Bookmarks.Exists($name)) {
            continue
        }
        $range = $document.Bookmarks.Item($name).Range
        if ($range.OMaths.Count -eq 0) {
            $document.OMaths.Add($range) | Out-Null
            $range.OMaths.BuildUp()
        }
    }

    foreach ($toc in $document.TablesOfContents) {
        $toc.Update()
    }
    foreach ($styleName in @("TOC 1", "TOC 2")) {
        $style = $document.Styles.Item($styleName)
        $style.Font.Size = 10.5
        $style.ParagraphFormat.LineSpacingRule = 0
        $style.ParagraphFormat.SpaceBefore = 0
        $style.ParagraphFormat.SpaceAfter = 2
    }
    $document.Fields.Update() | Out-Null
    foreach ($section in $document.Sections) {
        foreach ($header in $section.Headers) {
            $header.Range.Fields.Update() | Out-Null
        }
        foreach ($footer in $section.Footers) {
            $footer.Range.Fields.Update() | Out-Null
        }
    }
    $document.Repaginate()
    foreach ($toc in $document.TablesOfContents) {
        $toc.Update()
    }
    $document.Repaginate()
    $document.Save()

    if (Test-Path -LiteralPath $outputPath) {
        Remove-Item -LiteralPath $outputPath -Force
    }
    $document.GetType().InvokeMember(
        "ExportAsFixedFormat",
        $flags,
        $null,
        $document,
        @($outputPath, 17)
    ) | Out-Null

    [pscustomobject]@{
        Docx = $inputPath
        Pdf = $outputPath
        Pages = $document.ComputeStatistics(2)
        Equations = $document.OMaths.Count
        Tables = $document.Tables.Count
        Figures = $document.InlineShapes.Count
        TocEntries = if ($document.TablesOfContents.Count -gt 0) {
            $document.TablesOfContents.Item(1).Range.Paragraphs.Count
        } else {
            0
        }
    } | ConvertTo-Json -Compress
}
finally {
    if ($document -ne $null) {
        [object]$saveChanges = 0
        $document.Close([ref]$saveChanges)
    }
    $word.Quit()
    if ($document -ne $null) {
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) | Out-Null
    }
    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
    throw "PDF export failed: $outputPath"
}
