import { app, nativeImage } from 'electron'
import type { NativeImage } from 'electron'
import path from 'node:path'

export function getAssetPath(fileName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', fileName)
  }

  return path.join(app.getAppPath(), 'build', fileName)
}

export function getTrayImage(): NativeImage {
  const image = nativeImage.createFromPath(getAssetPath('tray.png'))

  if (!image.isEmpty()) {
    image.setTemplateImage(false)
    return image
  }

  return nativeImage.createFromPath(getAssetPath('icon.png'))
}
