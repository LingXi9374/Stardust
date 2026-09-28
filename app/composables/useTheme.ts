/**
 * 明暗主题。
 *
 * 默认浅色：多数读者在浅色模式下阅读体验更优（AGENTS.md 4.9）。
 * 暗色令牌由同一色相家族推导，而非浅色值的机械反转。
 * localStorage 中的显式选择优先于默认值，并由 head 中的内联脚本在首次绘制前应用，
 * 因此不会出现主题闪烁。
 */
const STORAGE_KEY = 'stardust-theme'

/** 在 <head> 中同步执行，先于首次绘制，避免主题闪烁。 */
export const themeInitScript = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var d=v==='dark';var e=document.documentElement;if(d){e.classList.add('dark');e.style.colorScheme='dark';}}catch(e){}})();`

export function useTheme() {
  const isDark = useState<boolean>('stardust:dark', () => false)

  function apply(next: boolean): void {
    isDark.value = next

    if (import.meta.client) {
      const root = document.documentElement
      root.classList.toggle('dark', next)
      root.style.colorScheme = next ? 'dark' : 'light'

      try {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      } catch {
        // 隐私模式 / 禁用存储：仅当前会话生效，静默降级。
      }
    }
  }

  function toggle(): void {
    apply(!isDark.value)
  }

  onMounted(() => {
    // 与内联初始化脚本写入的 DOM 状态对齐。
    isDark.value = document.documentElement.classList.contains('dark')
  })

  return { isDark, toggle, apply }
}
