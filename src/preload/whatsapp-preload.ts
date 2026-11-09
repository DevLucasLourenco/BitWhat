// Preload exclusivo do BrowserView do WhatsApp Web.
//
// Roda antes dos scripts do WhatsApp e não expõe nenhuma API para a página.
// Única função: fazer o WhatsApp Web seguir o tema do sistema (chave
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
