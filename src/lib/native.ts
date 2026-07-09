// Detects whether the web app is running inside a Capacitor native shell
const isNative = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    type CapacitorWindow = Window & { Capacitor?: { isNativePlatform: () => boolean } }
    return !!(window as CapacitorWindow).Capacitor?.isNativePlatform()
  } catch { return false }
}

// Light haptic — use on swipe commits, item selection
export async function hapticLight() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch { /* not available on this device */ }
}

// Medium haptic — use on confirmations, publishes
export async function hapticMedium() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch { /* not available */ }
}

// Selection haptic — use on nav taps, toggle switches
export async function hapticSelection() {
  if (!isNative()) return
  try {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.selectionChanged()
  } catch { /* not available */ }
}

// Called once on app boot: sets dark status bar, hides splash screen
export async function initNativeShell() {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    // Overlay lets web content extend under the status bar (we manage padding via env())
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch { /* not available */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 350 })
  } catch { /* not available */ }
}

// Request push notification permission and return the device token (or null on web)
export async function requestPushPermission(): Promise<string | null> {
  if (!isNative()) return null
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.requestPermissions()
    if (result.receive !== 'granted') return null
    await PushNotifications.register()
    return new Promise(resolve => {
      PushNotifications.addListener('registration', token => resolve(token.value))
      PushNotifications.addListener('registrationError', () => resolve(null))
    })
  } catch { return null }
}
