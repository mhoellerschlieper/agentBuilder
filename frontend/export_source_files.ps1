# ============================================================================
# file_name: export_source_files.ps1
# description: Exportiert Dateien aus einem Projekt in eine einzelne
#   Ausgabedatei.
#   Unterstuetzt:
#   - frei definierbare Dateiendungen fuer rekursive Suche ab root
#   - frei definierbare file patterns fuer bestimmte Dateien und Wildcards
#   - absolute und relative Pfade in a_files
#   - .gitignore basierte Ausschluesse ohne Negation
#
# history:
#   2026-03-29 - initial creation
#   2026-03-29 - fixed directory matching for .gitignore entries
#   2026-04-06 - fixed null handling for gitignore rules
#   2026-04-06 - added configurable files array and extension based scan
#   2026-04-06 - added support for absolute paths in a_files
#
# author: Marcus Schlieper
# company: ExpChat.ai
# ============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$s_root_path = ".",

    [Parameter(Mandatory = $false)]
    [string]$s_output_file = "combined_source_output.txt"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_message
    )

    Write-Host $s_message
}

function Get-Normalized-Full-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_path
    )

    return [System.IO.Path]::GetFullPath($s_path)
}

function Get-Normalized-Relative-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_base_path,

        [Parameter(Mandatory = $true)]
        [string]$s_full_path
    )

    $s_base_full = [System.IO.Path]::GetFullPath($s_base_path)
    $s_item_full = [System.IO.Path]::GetFullPath($s_full_path)

    $o_base_uri = New-Object System.Uri(($s_base_full.TrimEnd("\") + "\"))
    $o_item_uri = New-Object System.Uri($s_item_full)

    $s_relative_path = [System.Uri]::UnescapeDataString(
        $o_base_uri.MakeRelativeUri($o_item_uri).ToString()
    )

    $s_relative_path = $s_relative_path -replace "\\", "/"
    return $s_relative_path
}

function Convert-Gitignore-Pattern-To-Regex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_pattern
    )

    $s_work_pattern = $s_pattern.Trim()

    if ([string]::IsNullOrWhiteSpace($s_work_pattern)) {
        return $null
    }

    if ($s_work_pattern.StartsWith("/")) {
        $s_work_pattern = $s_work_pattern.Substring(1)
    }

    $b_directory_only = $false
    if ($s_work_pattern.EndsWith("/")) {
        $b_directory_only = $true
        $s_work_pattern = $s_work_pattern.TrimEnd("/")
    }

    $s_regex = [Regex]::Escape($s_work_pattern)
    $s_regex = $s_regex -replace "\\\*\\\*", "___DOUBLESTAR___"
    $s_regex = $s_regex -replace "\\\*", "[^/]*"
    $s_regex = $s_regex -replace "___DOUBLESTAR___", ".*"
    $s_regex = $s_regex -replace "\\\?", "."

    if ($s_work_pattern -notmatch "/") {
        return "(^|.*/)$s_regex($|/.*)"
    }

    if ($b_directory_only) {
        return "^$s_regex($|/.*)"
    }

    return "^$s_regex$"
}

function Get-Gitignore-Rules {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path
    )

    $a_rules = @()
    $s_gitignore_path = Join-Path $s_root_path ".gitignore"

    if (-not (Test-Path -LiteralPath $s_gitignore_path -PathType Leaf)) {
        return @($a_rules)
    }

    $a_lines = Get-Content -LiteralPath $s_gitignore_path -ErrorAction Stop

    foreach ($s_line_raw in $a_lines) {
        $s_line = $s_line_raw.Trim()

        if ([string]::IsNullOrWhiteSpace($s_line)) {
            continue
        }

        if ($s_line.StartsWith("#")) {
            continue
        }

        if ($s_line.StartsWith("!")) {
            # Negation wird in dieser Version bewusst nicht verarbeitet.
            continue
        }

        $s_regex = Convert-Gitignore-Pattern-To-Regex -s_pattern $s_line

        if ($null -ne $s_regex) {
            $a_rules += [PSCustomObject]@{
                s_pattern = $s_line
                s_regex   = $s_regex
            }
        }
    }

    return @($a_rules)
}

function Test-Is-Ignored {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [string]$s_full_path,

        [Parameter(Mandatory = $true)]
        [array]$a_rules
    )

    if (-not (Test-Is-Inside-Root -s_root_path $s_root_path -s_full_path $s_full_path)) {
        return $false
    }

    $s_relative_path = Get-Normalized-Relative-Path -s_base_path $s_root_path -s_full_path $s_full_path
    $s_relative_path = $s_relative_path -replace "\\", "/"

    foreach ($o_rule in $a_rules) {
        if ($s_relative_path -match $o_rule.s_regex) {
            return $true
        }
    }

    return $false
}

function Test-Is-Inside-Root {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [string]$s_full_path
    )

    $s_root_full_path = [System.IO.Path]::GetFullPath($s_root_path).TrimEnd("\") + "\"
    $s_item_full_path = [System.IO.Path]::GetFullPath($s_full_path)

    return $s_item_full_path.StartsWith(
        $s_root_full_path,
        [System.StringComparison]::OrdinalIgnoreCase
    )
}

function Get-Configured-File-Patterns {
    param()

    # Diese Konfiguration definiert:
    # 1. Extension scan:
    #    *.* sucht rekursiv ab root in beliebiger Tiefe
    #    und filtert danach auf die erlaubten extensions.
    # 2. file patterns:
    #    konkrete Dateien oder Wildcards relativ zu root
    #    oder absolute Pfade.
    $o_config = [PSCustomObject]@{
        a_extensions = @(
            ".js",
            ".jsx",
            ".tsx",
            ".ts",
            ".css",
            ".py"
        )
        a_files = @(
            #"src\store\workflow_store.tsx",
            #"src\types\workflow.ts",
            #"src\components\agent_designer.tsx",
            #"src\components\runner_panel.tsx",
            #"src\components\properties_panel.tsx",
            #"src\components\tool_tree_panel.tsx",
            #"src\components\tool_variable_selector.tsx",
            #"src\components\right_sidebar_tabs.tsx"
            #"src\components\nodes\node_runtime_helpers.tsx",
            #"src\components\nodes\llm_node.tsx",
            #"src\components\nodes\http_node.tsx",
            #"src\components\nodes\code_node.tsx",
            #"src\components\nodes\start_node.tsx",
            #"src\components\nodes\condition_node.tsx",
            #"src\components\nodes\end_node.tsx",
            #"src\components\nodes\classifier_node.tsx"
            
            #"src\*.tsx"
            #"src\components\*.tsx",
            #"src\services\*.tsx",
            #"src\store\*.tsx",
            #"src\types\*.tsx",
            "src\components\nodes\*.tsx"

            #"c:\xampp\htdocs\expchat\agentBuilder\backend\app.py",
            #"c:\xampp\htdocs\expchat\agentBuilder\backend\services\workflow_runner.py"
        )
    }

    return $o_config
}

function Add-File-To-Map {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$h_files,

        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo]$o_file
    )

    if ($null -eq $o_file) {
        return
    }

    if (-not $h_files.ContainsKey($o_file.FullName)) {
        $h_files[$o_file.FullName] = $o_file
    }
}

function Test-Path-Contains-Wildcard {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_path
    )

    return ($s_path.Contains("*") -or $s_path.Contains("?"))
}

function Resolve-Configured-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [string]$s_configured_path
    )

    # Absolute Pfade werden direkt verwendet.
    # Relative Pfade werden gegen root aufgeloest.
    if ([System.IO.Path]::IsPathRooted($s_configured_path)) {
        return $s_configured_path
    }

    return (Join-Path $s_root_path $s_configured_path)
}

function Get-Files-By-Extension-Scan {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [array]$a_extensions,

        [Parameter(Mandatory = $true)]
        [array]$a_rules
    )

    $h_files = @{}
    $a_all_files = Get-ChildItem -Path $s_root_path -Recurse -File -Force -ErrorAction Stop

    foreach ($o_file in $a_all_files) {
        try {
            $s_extension = $o_file.Extension.ToLowerInvariant()

            if ($a_extensions -notcontains $s_extension) {
                continue
            }

            if (Test-Is-Ignored -s_root_path $s_root_path -s_full_path $o_file.FullName -a_rules $a_rules) {
                continue
            }

            Add-File-To-Map -h_files $h_files -o_file $o_file
        }
        catch {
            Write-Warning ("Fehler bei Datei: " + $o_file.FullName + " - " + $_.Exception.Message)
        }
    }

    return @($h_files.Values)
}

function Get-Files-By-Pattern {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [string]$s_pattern,

        [Parameter(Mandatory = $true)]
        [array]$a_rules
    )

    $h_files = @{}

    try {
        $s_search_path = Resolve-Configured-Path -s_root_path $s_root_path -s_configured_path $s_pattern
        $b_has_wildcard = Test-Path-Contains-Wildcard -s_path $s_search_path

        if ($b_has_wildcard) {
            $a_found_files = Get-ChildItem -Path $s_search_path -File -Force -ErrorAction SilentlyContinue
        }
        else {
            if (-not (Test-Path -LiteralPath $s_search_path -PathType Leaf)) {
                return @()
            }

            $a_found_files = @(Get-Item -LiteralPath $s_search_path -Force -ErrorAction Stop)
        }

        foreach ($o_file in $a_found_files) {
            if ($null -eq $o_file) {
                continue
            }

            if ($o_file.PSIsContainer) {
                continue
            }

            # Absolute Pfade ausserhalb von root sind jetzt erlaubt.
            # .gitignore Regeln werden nur auf Dateien innerhalb von root angewendet.
            if (Test-Is-Ignored -s_root_path $s_root_path -s_full_path $o_file.FullName -a_rules $a_rules) {
                continue
            }

            Add-File-To-Map -h_files $h_files -o_file $o_file
        }
    }
    catch {
        Write-Warning ("Fehler bei Pattern: " + $s_pattern + " - " + $_.Exception.Message)
    }

    return @($h_files.Values)
}

function Get-Target-Files {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [array]$a_rules
    )

    # history:
    #   2026-04-06 - added support for mixed file config:
    #                extension scan plus explicit file patterns
    #   2026-04-06 - added support for absolute paths in a_files

    $o_config = Get-Configured-File-Patterns
    $h_result_files = @{}

    foreach ($s_file_entry in $o_config.a_files) {
        if ($s_file_entry -eq "*.*") {
            $a_extension_files = Get-Files-By-Extension-Scan `
                -s_root_path $s_root_path `
                -a_extensions $o_config.a_extensions `
                -a_rules $a_rules

            foreach ($o_file in $a_extension_files) {
                Add-File-To-Map -h_files $h_result_files -o_file $o_file
            }

            continue
        }

        $a_pattern_files = Get-Files-By-Pattern `
            -s_root_path $s_root_path `
            -s_pattern $s_file_entry `
            -a_rules $a_rules

        foreach ($o_file in $a_pattern_files) {
            Add-File-To-Map -h_files $h_result_files -o_file $o_file
        }
    }

    return @($h_result_files.Values | Sort-Object FullName)
}

function Get-Display-Path {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [string]$s_full_path
    )

    # Dateien innerhalb von root werden relativ dargestellt.
    # Absolute Dateien ausserhalb von root bleiben absolut.
    if (Test-Is-Inside-Root -s_root_path $s_root_path -s_full_path $s_full_path) {
        $s_relative_path = Get-Normalized-Relative-Path -s_base_path $s_root_path -s_full_path $s_full_path
        return ($s_relative_path -replace "\\", "/")
    }

    return ([System.IO.Path]::GetFullPath($s_full_path) -replace "\\", "/")
}

function Export-Files-To-Single-File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$s_root_path,

        [Parameter(Mandatory = $true)]
        [array]$a_files,

        [Parameter(Mandatory = $true)]
        [string]$s_output_file
    )

    # history:
    #   2026-03-29 - initial creation
    #   2026-03-29 - added file separators and utf8 output
    #   2026-03-29 - kept output file inside root path only
    #   2026-04-06 - improved empty array handling
    #   2026-04-06 - added display support for absolute files outside root

    $o_string_builder = New-Object System.Text.StringBuilder

    [void]$o_string_builder.AppendLine("export_generated_at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    [void]$o_string_builder.AppendLine("root_path: $([System.IO.Path]::GetFullPath($s_root_path))")
    [void]$o_string_builder.AppendLine("file_count: $($a_files.Count)")
    [void]$o_string_builder.AppendLine("")

    foreach ($o_file in $a_files) {
        $s_display_path = Get-Display-Path -s_root_path $s_root_path -s_full_path $o_file.FullName

        [void]$o_string_builder.AppendLine("================================================================")
        [void]$o_string_builder.AppendLine("file: $s_display_path")
        [void]$o_string_builder.AppendLine("================================================================")

        try {
            $s_content = Get-Content -LiteralPath $o_file.FullName -Raw -ErrorAction Stop
            [void]$o_string_builder.AppendLine($s_content)
        }
        catch {
            [void]$o_string_builder.AppendLine("[error] could_not_read_file: $($o_file.FullName)")
            [void]$o_string_builder.AppendLine("[error_details] $($_.Exception.Message)")
        }

        [void]$o_string_builder.AppendLine("")
    }

    $s_output_full_path = [System.IO.Path]::GetFullPath((Join-Path $s_root_path $s_output_file))
    $s_root_full_path = [System.IO.Path]::GetFullPath($s_root_path).TrimEnd("\") + "\"

    if (-not $s_output_full_path.StartsWith($s_root_full_path, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Output file must be inside the root path."
    }

    [System.IO.File]::WriteAllText(
        $s_output_full_path,
        $o_string_builder.ToString(),
        [System.Text.Encoding]::UTF8
    )
}

try {
    $s_root_full_path = Get-Normalized-Full-Path -s_path $s_root_path

    if (-not (Test-Path -LiteralPath $s_root_full_path -PathType Container)) {
        throw "Root path does not exist or is not a directory."
    }

    $a_rules = Get-Gitignore-Rules -s_root_path $s_root_full_path
    if ($null -eq $a_rules) {
        $a_rules = @()
    }

    $a_files = Get-Target-Files -s_root_path $s_root_full_path -a_rules $a_rules

    $a_files = @($a_files | Where-Object {
        $_.Name -ne $s_output_file
    })

    Export-Files-To-Single-File `
        -s_root_path $s_root_full_path `
        -a_files $a_files `
        -s_output_file $s_output_file

    Write-Log "Export erfolgreich abgeschlossen."
    Write-Log "Dateien exportiert: $($a_files.Count)"
    Write-Log "Ausgabedatei: $(Join-Path $s_root_full_path $s_output_file)"
}
catch {
    Write-Error ("Abbruch: " + $_.Exception.Message)
    exit 1
}
