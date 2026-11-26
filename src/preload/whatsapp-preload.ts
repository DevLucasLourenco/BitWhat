import { contextBridge } from 'electron'

// Preload exclusivo do BrowserView do WhatsApp Web.
//
// Roda antes dos scripts do WhatsApp e não expõe nenhuma API para a página.
// 1) Notificações com o BitWhat bloqueado (senha do BitWhat, opção "Ocultar
//    conteúdo"): sem nome, texto nem foto. O processo principal liga o modo
//    em `window.__bitWhatNotificationMode`.
// 2) Fazer o WhatsApp Web seguir o tema do sistema (chave
// `system-theme-mode`), que o BitWhat controla via `nativeTheme.themeSource`.
// Assim o tema escolhido no BitWhat (padrão: escuro) é aplicado automaticamente,
// mesmo que o tema tenha sido fixado como "Claro" dentro do WhatsApp.

const WHATSAPP_ORIGIN = 'https://web.whatsapp.com'
const SYSTEM_THEME_MODE_KEY = 'system-theme-mode'

try {
  if (window.location.origin === WHATSAPP_ORIGIN && window.localStorage.getItem(SYSTEM_THEME_MODE_KEY) !== 'true') {
    window.localStorage.setItem(SYSTEM_THEME_MODE_KEY, 'true')
  }
} catch {
  // Armazenamento indisponível: o WhatsApp mantém o tema que já tinha.
}

try {
  contextBridge.executeInMainWorld({
    func: () => {
      const w = window as unknown as {
        __bitWhatNotificationMode?: string
        Notification?: typeof Notification
        ServiceWorkerRegistration?: typeof ServiceWorkerRegistration
      }
      const mask = (title: string, options?: NotificationOptions): [string, NotificationOptions | undefined] => {
        if (w.__bitWhatNotificationMode !== 'hide') {
          return [title, options]
        }
        const masked: NotificationOptions = { ...(options ?? {}), body: 'Nova mensagem' }
        delete masked.icon
        delete masked.badge
        delete (masked as { image?: string }).image
        return ['BitWhat', masked]
      }

      const Native = w.Notification
      if (typeof Native === 'function') {
        class BitWhatNotification extends Native {
          constructor(title: string, options?: NotificationOptions) {
            const [maskedTitle, maskedOptions] = mask(title, options)
            super(maskedTitle, maskedOptions)
          }
        }
        Object.defineProperty(BitWhatNotification, 'name', { value: 'Notification' })
        w.Notification = BitWhatNotification
      }

      const registration = w.ServiceWorkerRegistration?.prototype
      const nativeShow = registration?.showNotification
      if (registration && typeof nativeShow === 'function') {
        registration.showNotification = function (title: string, options?: NotificationOptions) {
          const [maskedTitle, maskedOptions] = mask(title, options)
          return nativeShow.call(this, maskedTitle, maskedOptions)
        }
      }
    }
  })
} catch {
  // Sem o filtro, as notificações seguem como o WhatsApp as cria.
}
