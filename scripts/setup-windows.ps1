[CmdletBinding()]
param(
  [switch]$CheckOnly,
  [switch]$SkipDesktop,
  [switch]$SkipAndroid,
  [switch]$SkipProjectInstall,
  [switch]$SkipVerification
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Official references used by this bootstrapper:
# https://learn.microsoft.com/windows/package-manager/winget/install
# https://v2.tauri.app/start/prerequisites/
# https://pnpm.io/installation
# https://developer.android.com/tools/sdkmanager
# https://developer.android.com/studio/

$projectRoot = Split-Path -Parent $PSScriptRoot
$requiredPnpmVersion = "9.12.0"
$configuredAndroidSdk = if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) {
  $env:ANDROID_HOME
} elseif (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) {
  $env:ANDROID_SDK_ROOT
} else {
  Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
$androidSdk = [IO.Path]::GetFullPath($configuredAndroidSdk)
$androidSdkRoot = [IO.Path]::GetPathRoot($androidSdk)
if ($androidSdk -eq $androidSdkRoot) {
  throw "ANDROID_HOME 不能指向磁盘根目录：$androidSdk"
}
$androidCommandToolsVersion = "15859902"
$androidCommandToolsSha256 = "90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a"
$androidCommandToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-${androidCommandToolsVersion}_latest.zip"
$androidPackages = @(
  "platform-tools",
  "platforms;android-35",
  "build-tools;35.0.0",
  "ndk;26.1.10909125"
)
$script:missing = [System.Collections.Generic.List[string]]::new()

function Write-Step([string]$message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Write-Ok([string]$message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Add-Missing([string]$message) {
  $script:missing.Add($message)
  Write-Host "[MISSING] $message" -ForegroundColor Yellow
}

function Test-Command([string]$name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = @($machinePath, $userPath) -join ";"
}

function Add-UserPathEntry([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return }
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $entries = @($current -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($entries -notcontains $path) {
    $updatedPath = (@($entries) + @($path)) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $updatedPath, "User")
  }
}

function Install-WingetPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Override
  )

  Write-Step "安装 $Name"
  $arguments = @(
    "install", "--exact", "--id", $Id, "--source", "winget",
    "--accept-package-agreements", "--accept-source-agreements",
    "--disable-interactivity", "--silent"
  )
  if (-not [string]::IsNullOrWhiteSpace($Override)) {
    $arguments += @("--override", $Override)
  }

  & winget.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name 安装失败，winget exit code: $LASTEXITCODE"
  }
  Refresh-ProcessPath
}

function Ensure-CommandPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$PackageId,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (Test-Command $Command) {
    Write-Ok "$Name 已安装"
    return
  }
  if ($CheckOnly) {
    Add-Missing $Name
    return
  }

  Install-WingetPackage -Id $PackageId -Name $Name
  if (-not (Test-Command $Command)) {
    throw "$Name 已由 winget 安装，但当前 PowerShell 仍找不到 $Command。请重新打开终端后重试。"
  }
}

function Test-VsCppTools {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path -LiteralPath $vswhere)) { return $false }
  $installation = & $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  return -not [string]::IsNullOrWhiteSpace(($installation | Select-Object -First 1))
}

function Ensure-DesktopTools {
  Write-Step "检查桌面端开发环境"

  if (Test-VsCppTools) {
    Write-Ok "Visual Studio C++ Build Tools 已安装"
  } elseif ($CheckOnly) {
    Add-Missing "Visual Studio 2022 Build Tools（Desktop development with C++）"
  } else {
    Install-WingetPackage `
      -Id "Microsoft.VisualStudio.2022.BuildTools" `
      -Name "Visual Studio 2022 C++ Build Tools" `
      -Override "--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    if (-not (Test-VsCppTools)) {
      throw "Visual Studio Build Tools 已安装，但未检测到 C++ workload。请在 Visual Studio Installer 中确认已选择 Desktop development with C++。"
    }
  }

  if (Test-Command "rustup.exe") {
    Write-Ok "Rustup 已安装"
  } elseif ($CheckOnly) {
    Add-Missing "Rustup / Rust stable-msvc"
  } else {
    Install-WingetPackage -Id "Rustlang.Rustup" -Name "Rustup"
  }

  if (-not $CheckOnly) {
    & rustup.exe default stable-msvc
    if ($LASTEXITCODE -ne 0) { throw "Rust stable-msvc toolchain 配置失败。" }
  }

  if (Test-Command "rustc.exe") {
    Write-Ok "Rust 编译器可用：$(& rustc.exe --version)"
  } elseif ($CheckOnly) {
    Add-Missing "rustc（stable-msvc）"
  } else {
    throw "Rustup 已安装，但 rustc 仍不可用。请重新打开终端后重试。"
  }

  Write-Ok "Windows 10 1803 及更高版本通常已包含 Tauri 所需的 WebView2；如构建提示缺失，请安装 Evergreen WebView2 Runtime。"
}

function Find-Jdk17 {
  $candidates = [System.Collections.Generic.List[string]]::new()
  if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
    $candidates.Add($env:JAVA_HOME)
  }
  $adoptiumRoot = Join-Path $env:ProgramFiles "Eclipse Adoptium"
  if (Test-Path -LiteralPath $adoptiumRoot) {
    Get-ChildItem -LiteralPath $adoptiumRoot -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending |
      ForEach-Object { $candidates.Add($_.FullName) }
  }

  foreach ($candidate in $candidates) {
    $releaseFile = Join-Path $candidate "release"
    if ((Test-Path -LiteralPath $releaseFile) -and (Select-String -LiteralPath $releaseFile -Pattern '^JAVA_VERSION="17' -Quiet)) {
      return $candidate
    }
  }
  return $null
}

function Install-AndroidCommandTools {
  $sdkManager = Join-Path $androidSdk "cmdline-tools\latest\bin\sdkmanager.bat"
  if (Test-Path -LiteralPath $sdkManager) { return $sdkManager }
  if ($CheckOnly) {
    Add-Missing "Android SDK Command-line Tools"
    return $null
  }

  Write-Step "下载并校验 Android SDK Command-line Tools"
  $tempRoot = Join-Path ([IO.Path]::GetTempPath()) "job-tracker-android-tools-$PID"
  $archive = Join-Path $tempRoot "commandline-tools.zip"
  $extractRoot = Join-Path $tempRoot "extract"
  $latestRoot = Join-Path $androidSdk "cmdline-tools\latest"

  try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $androidCommandToolsUrl -OutFile $archive -UseBasicParsing
    $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $androidCommandToolsSha256) {
      throw "Android command-line tools SHA-256 不匹配。期望 $androidCommandToolsSha256，实际 $actualHash。"
    }

    Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force
    if (Test-Path -LiteralPath $latestRoot) {
      Remove-Item -LiteralPath $latestRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Path $latestRoot -Force | Out-Null
    Copy-Item -Path (Join-Path $extractRoot "cmdline-tools\*") -Destination $latestRoot -Recurse -Force
  } finally {
    if (Test-Path -LiteralPath $tempRoot) {
      Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
  }

  if (-not (Test-Path -LiteralPath $sdkManager)) {
    throw "Android SDK Command-line Tools 解压完成，但未找到 sdkmanager.bat。"
  }
  return $sdkManager
}

function Test-AndroidPackage([string]$relativePath) {
  return Test-Path -LiteralPath (Join-Path $androidSdk $relativePath)
}

function Ensure-AndroidTools {
  Write-Step "检查 Android 开发环境"

  $jdk17 = Find-Jdk17
  if ($null -eq $jdk17) {
    if ($CheckOnly) {
      Add-Missing "JDK 17"
    } else {
      Install-WingetPackage -Id "EclipseAdoptium.Temurin.17.JDK" -Name "Eclipse Temurin JDK 17"
      $jdk17 = Find-Jdk17
      if ($null -eq $jdk17) { throw "JDK 17 安装后仍无法定位 JAVA_HOME。" }
    }
  } else {
    Write-Ok "JDK 17 已安装：$jdk17"
  }

  if ($null -ne $jdk17 -and -not $CheckOnly) {
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdk17, "User")
    $env:JAVA_HOME = $jdk17
    Add-UserPathEntry (Join-Path $jdk17 "bin")
  }

  $androidStudio = Join-Path $env:ProgramFiles "Android\Android Studio\bin\studio64.exe"
  if (Test-Path -LiteralPath $androidStudio) {
    Write-Ok "Android Studio 已安装"
  } elseif ($CheckOnly) {
    Add-Missing "Android Studio"
  } else {
    Install-WingetPackage -Id "Google.AndroidStudio" -Name "Android Studio"
    if (-not (Test-Path -LiteralPath $androidStudio)) {
      throw "Android Studio 已由 winget 安装，但未在默认路径找到。请重新打开终端并确认安装位置。"
    }
  }

  $sdkManager = Install-AndroidCommandTools
  if ($null -eq $sdkManager) { return }

  if (-not $CheckOnly) {
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, "User")
    [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $androidSdk, "User")
    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk
    Add-UserPathEntry (Join-Path $androidSdk "platform-tools")
    Add-UserPathEntry (Join-Path $androidSdk "cmdline-tools\latest\bin")

    Write-Step "接受 Android SDK licenses"
    Write-Host "请阅读提示并输入 y 接受项目构建所需 licenses；拒绝时脚本会停止。" -ForegroundColor Yellow
    & $sdkManager "--sdk_root=$androidSdk" --licenses
    if ($LASTEXITCODE -ne 0) { throw "Android SDK licenses 未全部接受。" }

    Write-Step "安装 Android SDK 35、Build Tools 35.0.0、platform-tools 和 NDK 26.1"
    & $sdkManager "--sdk_root=$androidSdk" @androidPackages
    if ($LASTEXITCODE -ne 0) { throw "Android SDK 组件安装失败。" }

    $ndkHome = Join-Path $androidSdk "ndk\26.1.10909125"
    [Environment]::SetEnvironmentVariable("NDK_HOME", $ndkHome, "User")
    $env:NDK_HOME = $ndkHome
  }

  $requiredPaths = @{
    "Android platform-tools" = "platform-tools\adb.exe"
    "Android SDK Platform 35" = "platforms\android-35\android.jar"
    "Android Build Tools 35.0.0" = "build-tools\35.0.0\aapt2.exe"
    "Android NDK 26.1.10909125" = "ndk\26.1.10909125\source.properties"
  }
  foreach ($item in $requiredPaths.GetEnumerator()) {
    if (Test-AndroidPackage $item.Value) {
      Write-Ok "$($item.Key) 已安装"
    } elseif ($CheckOnly) {
      Add-Missing $item.Key
    } else {
      throw "$($item.Key) 安装后校验失败。"
    }
  }
}

function Ensure-Pnpm {
  if (Test-Command "pnpm.cmd") {
    $currentVersion = (& pnpm.cmd --version).Trim()
    if ($currentVersion -eq $requiredPnpmVersion) {
      Write-Ok "pnpm $requiredPnpmVersion 已安装"
      return
    }
    if ($CheckOnly) {
      Add-Missing "pnpm $requiredPnpmVersion（当前为 $currentVersion）"
      return
    }
  } elseif ($CheckOnly) {
    Add-Missing "pnpm $requiredPnpmVersion"
    return
  }

  Write-Step "安装 pnpm $requiredPnpmVersion"
  & npm.cmd install --global "pnpm@$requiredPnpmVersion"
  if ($LASTEXITCODE -ne 0) { throw "pnpm 安装失败。" }
  Refresh-ProcessPath
  $installedVersion = (& pnpm.cmd --version).Trim()
  if ($installedVersion -ne $requiredPnpmVersion) {
    throw "pnpm 版本校验失败：期望 $requiredPnpmVersion，实际 $installedVersion。"
  }
}

function Ensure-Project {
  Write-Step "配置项目依赖与本地环境文件"
  $desktopEnv = Join-Path $projectRoot "apps\desktop\.env"
  $mobileEnv = Join-Path $projectRoot "apps\mobile\.env"
  $envExample = Join-Path $projectRoot ".env.example"

  if ($CheckOnly) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) { Add-Missing "项目 node_modules" }
    if (-not (Test-Path -LiteralPath $desktopEnv)) { Add-Missing "apps/desktop/.env" }
    if (-not (Test-Path -LiteralPath $mobileEnv)) { Add-Missing "apps/mobile/.env" }
    return
  }

  Push-Location $projectRoot
  try {
    & pnpm.cmd install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败。" }
  } finally {
    Pop-Location
  }

  foreach ($target in @($desktopEnv, $mobileEnv)) {
    if (-not (Test-Path -LiteralPath $target)) {
      Copy-Item -LiteralPath $envExample -Destination $target
      Write-Host "已创建 $target；请手动填写 Supabase 公共客户端配置。" -ForegroundColor Yellow
    }
  }
}

function Invoke-ProjectVerification {
  if ($CheckOnly -or $SkipProjectInstall -or $SkipVerification) { return }
  Write-Step "验证项目"
  Push-Location $projectRoot
  try {
    & pnpm.cmd typecheck
    if ($LASTEXITCODE -ne 0) { throw "项目类型检查失败。" }
    & pnpm.cmd test
    if ($LASTEXITCODE -ne 0) { throw "项目测试失败。" }
  } finally {
    Pop-Location
  }
}

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw "此脚本仅支持 Windows。"
}

Write-Host "Job Hunting Tracker Windows 环境引导" -ForegroundColor White
Write-Host "模式：$(if ($CheckOnly) { '仅检查，不修改系统' } else { '安装并配置' })"

if (-not $CheckOnly) {
  if (-not (Test-Administrator)) {
    throw "安装模式需要管理员权限。请以管理员身份打开 PowerShell，再重新运行此脚本。"
  }
  if (-not (Test-Command "winget.exe")) {
    throw "未找到 winget。请先通过 Microsoft Store 安装或更新 App Installer。"
  }
} elseif (-not (Test-Command "winget.exe")) {
  Add-Missing "winget / Windows App Installer"
}

Write-Step "检查通用开发工具"
Ensure-CommandPackage -Command "git.exe" -PackageId "Git.Git" -Name "Git"
Ensure-CommandPackage -Command "node.exe" -PackageId "OpenJS.NodeJS.LTS" -Name "Node.js LTS"

if (Test-Command "npm.cmd") {
  Write-Ok "npm 可用：$(& npm.cmd --version)"
  Ensure-Pnpm
} else {
  if ($CheckOnly) {
    Add-Missing "npm（随 Node.js 安装）"
  } else {
    throw "Node.js 已安装，但 npm 不可用。请重新打开终端后重试。"
  }
}

if (-not $SkipDesktop) { Ensure-DesktopTools }
if (-not $SkipAndroid) { Ensure-AndroidTools }
if (-not $SkipProjectInstall) { Ensure-Project }
Invoke-ProjectVerification

if ($CheckOnly -and $script:missing.Count -gt 0) {
  Write-Host "`n环境检查完成，共发现 $($script:missing.Count) 项缺失。" -ForegroundColor Yellow
  exit 1
}

Write-Host "`n环境准备完成。" -ForegroundColor Green
if (-not $CheckOnly) {
  Write-Host "请填写 apps/desktop/.env 与 apps/mobile/.env 中的 Supabase 配置，并重新打开终端或 IDE 以加载永久环境变量。"
  if (-not $SkipAndroid) {
    Write-Host "如需 Android 模拟器，请在 Android Studio 的 Device Manager 中另行创建 AVD。"
  }
}
