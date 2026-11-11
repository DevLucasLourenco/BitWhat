// Gancho afterPack do electron-builder: grava o ícone e as informações de versão
// no BitWhat.exe em todo build Windows.
//
// O electron-builder.yml usa `win.signAndEditExecutable: false` (evita a falha
// de symlink do winCodeSign em contas sem Developer Mode/admin), e com isso o
// builder pula a edição do executável: o .exe ficaria com o ícone padrão do
// Electron. Aqui o rcedit faz só essa edição, sem assinatura.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rcedit } from 'rcedit'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const appInfo = context.packager.appInfo
  const exePath = path.join(context.appOutDir, `${appInfo.productFilename}.exe`)
  const iconPath = path.join(projectDir, 'build', 'icon.ico')

  if (!existsSync(exePath)) {
    throw new Error(`afterPack: executável não encontrado em ${exePath}`)
  }
  if (!existsSync(iconPath)) {
    throw new Error(`afterPack: ícone não encontrado em ${iconPath}`)
  }

  const version = appInfo.version
  // Versão de arquivo do Windows precisa de 4 partes (ex.: 0.1.15.0).
  const fileVersion = /^\d+\.\d+\.\d+$/.test(version) ? `${version}.0` : version

  await rcedit(exePath, {
    icon: iconPath,
    'file-version': fileVersion,
    'product-version': fileVersion,
    'version-string': {
      ProductName: appInfo.productName,
      FileDescription: appInfo.productName,
      InternalName: appInfo.productFilename,
      OriginalFilename: `${appInfo.productFilename}.exe`,
      LegalCopyright: appInfo.copyright ?? ''
    }
  })

  console.log(`  • ícone e versão gravados no executável  file=${path.basename(exePath)} version=${fileVersion}`)
}
