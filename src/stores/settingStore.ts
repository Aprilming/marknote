import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'

export interface ShortcutSettings {
  showMain: string      // 显示主页面（全局）
  prevNote: string      // 上一页
  nextNote: string      // 下一页
  newNote: string       // 新增页面
  deleteNote: string   // 删除页面
  pin: string          // 置顶窗口
}

export interface AppSettings {
  theme: Theme
  fontSize: number
  fontFamily: string
  showGrid: boolean
  translucent: boolean
  windowAlpha: number // 窗口透明度 0.1 - 1.0
  alwaysOnTop: boolean
  autoLaunch: boolean // 开机自启动
  globalHotkey: string
  autoSaveInterval: number // milliseconds
  autoDeleteDays: number // 0 = disabled
  shortcuts: ShortcutSettings
  // AI 设置
  aiUrl: string
  aiKey: string
  aiModel: string
  aiOptimizePrompt: string
  aiTodoPrompt: string
}

export const useSettingStore = defineStore('setting', () => {
  // State
  const settings = ref<AppSettings>({
    theme: 'auto',
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    showGrid: false,
    translucent: true,
    windowAlpha: 1.0,
    alwaysOnTop: false,
    autoLaunch: false,
    globalHotkey: 'Option+Cmd+A',
    autoSaveInterval: 500,
    autoDeleteDays: 0,
    shortcuts: {
      showMain: 'Option+Cmd+A',
      prevNote: 'Cmd+[',
      nextNote: 'Cmd+]',
      newNote: 'Cmd+N',
      deleteNote: 'Cmd+Backspace',
      pin: 'Cmd+P',
    },
    aiUrl: 'https://api.deepseek.com/chat/completions',
    aiKey: '',
    aiModel: 'deepseek-chat',
    aiOptimizePrompt: '你是一个笔记优化助手，帮我优化笔记内容，以下是你的规则\n' +
        '返回格式要求：返回格式为字符串， 不是markdown code语法\n' +
        '优化笔记要求\n' +
        '1. 去除笔记中的信息来源\n' +
        '2. 去除笔记中tag标签\n' +
        '3. 如何没有标题，在内容最上面生成一个H2的标题， 如果有标题，就不用生成，全文只保留一个H2标题\n' +
        '4. 不要出现与笔记无关的话语，例如：我已优化你的笔记、 优化笔记等\n' +
        '5. 保留关键的url，禁止去除核心内容中的url（信息来源不再此规则内）\n' +
        '6. 禁止生产注：、备注、注意等信息\n' +
        '7. 禁止修改链接，如果链接没有使用markdown格式，可以修改为markdown样式的链接显示\n' +
        '8. 如果没有链接，禁止生成链接\n' +
        '9. 返回的结果不要用```包起来\n',
    aiTodoPrompt: '请从以下文本中提取待办事项，不要显示“以下是提取的待办事项列表”等信息， 保留时间日期等重要信息\n' +
        '返回的格式如下：1.总结信息在上，总结当前笔记的内容， 控制在10个字以内，使用h1-h3作为标题，标题下面的正文的内容包含日期、时间、其他重要信息；2. 然后是具体的任务列表， 以- [ ] xxx 的形式展现，不要有序、无序列表；3.如果无法提取到任务，则优化一下笔记的格式； 4. 可以适当的添加一些表情。',
  })

  // Actions
  function updateSettings<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    settings.value[key] = value
    // Save to localStorage
    saveSettings()
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('marknote-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        settings.value = { ...settings.value, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('marknote-settings', JSON.stringify(settings.value))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  function resetSettings() {
    settings.value = {
      theme: 'auto',
      fontSize: 14,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      showGrid: false,
      translucent: true,
      windowAlpha: 1.0,
      alwaysOnTop: false,
      autoLaunch: false,
      globalHotkey: 'Option+Cmd+A',
      autoSaveInterval: 500,
      autoDeleteDays: 0,
      shortcuts: {
        showMain: 'Option+Cmd+A',
        prevNote: 'Ctrl+[',
        nextNote: 'Ctrl+]',
        newNote: 'Cmd+N',
        deleteNote: 'Cmd+Backspace',
        pin: 'Cmd+P',
      },
      aiUrl: 'https://api.deepseek.com/chat/completions',
      aiKey: '',
      aiModel: 'deepseek-chat',
      aiOptimizePrompt: '请优化以下文本，不要显示“以下是优化话的文本”等信息， 使其更加清晰、简洁：',
      aiTodoPrompt: '请从以下文本中提取待办事项，不要显示“以下是提取的待办事项列表”等信息， 保留时间日期等重要信息' +
          '返回的格式如下：' +
          '总览信息在上，包含日期、时间、其他重要信息；' +
          '具体的任务， 以- [ ] xxx 的形式返回；' +
          '如果无法提取到任务，则优化一下笔记的格式',
    }
    saveSettings()
  }

  // Initialize
  loadSettings()

  return {
    settings,
    updateSettings,
    loadSettings,
    saveSettings,
    resetSettings,
  }
})
