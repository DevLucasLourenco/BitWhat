param(
  [ValidateSet('dev', 'install', 'typecheck', 'build', 'build-win', 'preview', 'icons', 'repair-electron', 'where', 'help')]
  [string]$Task = 'dev',

  [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Section {
  param([string]$Message)

  Write-Host ''
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando nao encontrado: $Name"
  }
}

function Invoke-Npm {
  param([string[]]$Arguments)

  & npm.cmd @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') falhou com codigo $LASTEXITCODE"
  }
}

function Show-Help {
  Write-Host 'BitWhat starter'
  Write-Host ''
  Write-Host 'Uso:'
  Write-Host '  .\starter.ps1'
  Write-Host '  .\starter.ps1 -Task install'
  Write-Host '  .\starter.ps1 -Task dev'
  Write-Host '  .\starter.ps1 -Task typecheck'
  Write-Host '  .\starter.ps1 -Task build'
  Write-Host '  .\starter.ps1 -Task build-win'
  Write-Host '  .\starter.ps1 -Task preview'
  Write-Host '  .\starter.ps1 -Task icons'
  Write-Host '  .\starter.ps1 -Task repair-electron'
  Write-Host '  .\starter.ps1 -Task where'
  Write-Host ''
  Write-Host 'Opcoes:'
  Write-Host '  -SkipInstall   Nao instala dependencias automaticamente quando node_modules nao existe.'
}

function Show-Environment {
  Write-Section 'Ambiente'
  Assert-Command 'node'
  Assert-Command 'npm.cmd'

  $nodeVersion = & node --version
  $npmVersion = & npm.cmd --version

  Write-Host "Projeto: $ProjectRoot"
  Write-Host "Node:    $nodeVersion"
  Write-Host "npm:     $npmVersion"
}

function Ensure-Dependencies {
  if ($SkipInstall) {
    return
  }

  if (Test-Path (Join-Path $ProjectRoot 'node_modules')) {
    return
  }

  Write-Section 'Instalando dependencias'
  Invoke-Npm @('install')
}

function Test-ElectronBinary {
  $electronExe = Join-Path $ProjectRoot 'node_modules\electron\dist\electron.exe'
  return Test-Path $electronExe
}

function Repair-Electron {
  $installScript = Join-Path $ProjectRoot 'node_modules\electron\install.js'

  if (-not (Test-Path $installScript)) {
    throw 'Pacote electron nao encontrado. Rode .\starter.ps1 -Task install primeiro.'
  }

  Write-Section 'Reparando binario do Electron'
  Write-Host 'O pacote electron existe, mas o executavel local nao foi encontrado.'
  Write-Host 'Executando node_modules\electron\install.js...'

  & node $installScript
  if ($LASTEXITCODE -ne 0) {
    throw "Instalador do Electron falhou com codigo $LASTEXITCODE"
  }

  if (-not (Test-ElectronBinary)) {
    throw 'O instalador terminou, mas node_modules\electron\dist\electron.exe ainda nao foi encontrado.'
  }
}

function Ensure-ElectronBinary {
  Ensure-Dependencies

  if (Test-ElectronBinary) {
    return
  }

  Repair-Electron
}

function Show-Outputs {
  Write-Section 'Saidas do projeto'

  $installer = Join-Path $ProjectRoot 'dist\BitWhat-0.1.0-Setup.exe'
  $unpacked = Join-Path $ProjectRoot 'dist\win-unpacked\BitWhat.exe'

  if (Test-Path $installer) {
    Write-Host "Instalador: $installer"
  } else {
    Write-Host 'Instalador: ainda nao gerado'
  }

  if (Test-Path $unpacked) {
    Write-Host "Executavel unpacked: $unpacked"
  } else {
    Write-Host 'Executavel unpacked: ainda nao gerado'
  }
}

if ($Task -eq 'help') {
  Show-Help
  exit 0
}

Show-Environment

switch ($Task) {
  'install' {
    Write-Section 'Instalacao'
    Invoke-Npm @('install')
  }

  'dev' {
    Ensure-ElectronBinary
    Write-Section 'Iniciando BitWhat em desenvolvimento'
    Write-Host 'Dica: se existir uma build antiga aberta, saia pelo icone da bandeja antes de testar.'
    Invoke-Npm @('run', 'dev')
  }

  'typecheck' {
    Ensure-Dependencies
    Write-Section 'Validando TypeScript'
    Invoke-Npm @('run', 'typecheck')
  }

  'build' {
    Ensure-Dependencies
    Write-Section 'Gerando build'
    Invoke-Npm @('run', 'build')
    Show-Outputs
  }

  'build-win' {
    Ensure-Dependencies
    Write-Section 'Gerando instalador Windows'
    Write-Host 'Dica: feche o BitWhat antigo pela bandeja antes de instalar/testar a nova build.'
    Invoke-Npm @('run', 'build:win')
    Show-Outputs
  }

  'preview' {
    Ensure-ElectronBinary
    Write-Section 'Abrindo preview'
    Invoke-Npm @('run', 'preview')
  }

  'icons' {
    Ensure-Dependencies
    Write-Section 'Gerando icones'
    Invoke-Npm @('run', 'icons')
  }

  'where' {
    Show-Outputs
  }

  'repair-electron' {
    Ensure-Dependencies
    Repair-Electron
  }
}
