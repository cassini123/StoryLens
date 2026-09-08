import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'zh' | 'en'

const KEY = 'chitest.locale'

const zh = {
  observe:
    '请先看这张图。用你自己的话，尽可能清楚地写下你希望 AI 重新生成的画面。日常说法或你本来就会用的专业表达都可以，怎么写最清楚就怎么写。没有标准答案。',
  refine:
    '请看生成结果。如果还想调整，请继续改你的描述（以及草图，如有）。用你觉得最清楚的方式写即可。',
  generating: '正在根据你的描述生成画面，请稍候。',
  viewImage: '这是根据你的描述生成的反馈图，用来帮你对照，不是评分。',
  introduction:
    '接下来你会看到几张静帧。请根据每张图，写下你希望 AI 重新生成的画面。没有标准答案。用你觉得最清楚的方式描述即可。',
  introCount: '一共 7 张图：T0 × 1，T1 × 2，T2 × 2，T3 × 2。',
  setupTitle: '填写信息',
  setupLead: '开始一场新的实验。请不要重复使用已经做过的编号。',
  participantId: '被试编号',
  cineExp: '影像 / 摄影经验',
  cineYears: '影像经验年数（没有就填 0）',
  visualExp: '视觉 / 设计经验',
  aiFam: '对生成式 AI 的熟悉程度',
  select: '请选择',
  none: '没有',
  some: '有一些',
  frequent: '经常接触',
  continue: '继续',
  startOver: '重新开始',
  introTitle: '说明',
  completeTitle: '实验结束',
  completeLead: '谢谢。请下载本次数据，交给实验员。',
  downloadData: '下载我的实验数据',
  home: '首页',
  error: '出错了',
  noTask: '当前没有进行中的题目。',
  original: '原图',
  sketch: '草图',
  generated: 'AI 生成',
  description: '你的描述',
  submit: '提交',
  generate: '生成',
  satisfied: '满意，下一题',
  emptyGenerated: '点击「生成」后，这里会出现画面。',
  loadingGenerated: '正在载入生成图…',
  round: '第 {n} 轮 / 共 {max} 轮',
  questionnaireTitle: '简短问卷',
  questionnaireLead: '下面几题是次要的，请按整场实验的整体感受作答。',
  control: '掌控感',
  controlHint: '你觉得自己在多大程度上把想要的画面表达清楚了？',
  usefulness: '有帮助',
  usefulnessHint: '这个过程对你理清自己想要的画面有多大帮助？',
  effort: '费力程度',
  effortHint: '整场实验需要你花多少心力？',
  confidence: '把握',
  confidenceHint: '如果换一个人来布置你想要的画面，你觉得他能多大程度上做对？',
  restartConfirm: '要丢掉这台浏览器上尚未完成的实验、从头开始吗？',
  idUsed: '这个编号已经做过完整实验。',
  settings: '设置',
  save: '保存',
  refresh: '刷新',
  exit: '退出',
  export: '导出',
  saved: '已保存到本机',
  nothingToSave: '还没有可保存的进度',
  nothingToExport: '还没有可导出的数据',
  exported: '已导出到下载文件夹',
  progressAria: '实验进度',
  progressIntro: '说明',
  progressSurvey: '问卷',
  progressDone: '完成',
  progressNotStarted: '未开始',
  apiMissing: '即梦接口尚未配置。',
  homeLead: '这是一项关于草图脚手架如何帮助人们向生成式图像模型表达画面意图的对照实验。',
  homeBody:
    '每位被试完成 7 张图：T0 基线、T1 AI 画面反馈、T2 草图介入、T3 带草图的迁移。生成图只作反馈。主要结果是意图精度，不是点击次数或速度。',
  apiChecking: '正在检查即梦接口…',
  apiReady: '即梦接口已连接',
  apiHint: '请在 Vercel Production 设置 JIMENG_ACCESS_KEY 与 JIMENG_SECRET_KEY，然后 Redeploy。',
  participant: '被试',
  expert: '专家评分',
  coding: '研究者编码',
  exportPage: '导出',
  language: '语言',
}

export type Copy = typeof zh

const en: Copy = {
  observe:
    'Look at this picture. In your own words, describe as clearly as you can the image you want the AI to regenerate. Everyday language is fine, and so is any specialized vocabulary you already use — write in whichever way makes your intent clearest. There is no single correct answer.',
  refine:
    'Look at the generated result. If you want to adjust it, keep editing your description (and the sketch, if there is one). Write in whichever way feels clearest to you.',
  generating: 'Generating an image from your description. Please wait.',
  viewImage: 'This is feedback generated from your description, for you to compare against — it is not a score.',
  introduction:
    'You will see a series of still images. For each one, write the picture you want an AI to regenerate. There is no single correct answer. Describe it in whichever way feels clearest to you.',
  introCount: 'You will complete 7 pictures: T0 × 1, T1 × 2, T2 × 2, T3 × 2.',
  setupTitle: 'Participant setup',
  setupLead: 'Start a new session. Do not reuse a participant ID that has already been used.',
  participantId: 'Participant ID',
  cineExp: 'Cinematography / photography experience',
  cineYears: 'Years of cinematography experience (0 if none)',
  visualExp: 'Visual / design experience',
  aiFam: 'Familiarity with generative AI',
  select: 'Select',
  none: 'None',
  some: 'Some',
  frequent: 'Frequent',
  continue: 'Continue',
  startOver: 'Start over',
  introTitle: 'Introduction',
  completeTitle: 'Session complete',
  completeLead: 'Thank you. Please download your session data and give the file to the experimenter.',
  downloadData: 'Download my session data',
  home: 'Home',
  error: 'Error',
  noTask: 'No active task.',
  original: 'Original',
  sketch: 'Sketch',
  generated: 'AI generated',
  description: 'Your description',
  submit: 'Submit',
  generate: 'Generate',
  satisfied: 'Satisfied / Next',
  emptyGenerated: 'The generated image appears after you click Generate.',
  loadingGenerated: 'Loading generated image…',
  round: 'Round {n} / {max}',
  questionnaireTitle: 'Short questionnaire',
  questionnaireLead: 'These questions are secondary. Answer based on the session as a whole.',
  control: 'Perceived control',
  controlHint: 'How much control did you feel over expressing your intended picture?',
  usefulness: 'Perceived usefulness',
  usefulnessHint: 'How useful was the process for clarifying your intention?',
  effort: 'Cognitive effort',
  effortHint: 'How much mental effort did the session require?',
  confidence: 'Confidence',
  confidenceHint: 'How confident are you that someone else could stage your intended pictures?',
  restartConfirm: 'Discard this incomplete session on this browser and start over?',
  idUsed: 'This participant ID already completed a session.',
  settings: 'Settings',
  save: 'Save',
  refresh: 'Refresh',
  exit: 'Exit',
  export: 'Export',
  saved: 'Saved on this device',
  nothingToSave: 'Nothing to save yet',
  nothingToExport: 'Nothing to export yet',
  exported: 'Exported to your downloads folder',
  progressAria: 'Experiment progress',
  progressIntro: 'Intro',
  progressSurvey: 'Survey',
  progressDone: 'Done',
  progressNotStarted: 'Not started',
  apiMissing: 'Jimeng API is not configured on this deployment.',
  homeLead: 'A controlled study of sketch-based cognitive scaffolding for generative image models.',
  homeBody:
    'Each participant completes 7 pictures from a 20-image pool: T0 baseline, T1 AI visual feedback, T2 sketch intervention, and T3 transfer with sketch. Generated images are feedback. The primary outcome is Intent Precision, not click counts or speed.',
  apiChecking: 'Checking Jimeng API…',
  apiReady: 'Jimeng API connected',
  apiHint: 'Vercel Production must define JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY, then Redeploy.',
  participant: 'Participant',
  expert: 'Expert evaluation',
  coding: 'Researcher coding',
  exportPage: 'Export',
  language: 'Language',
}

export const COPY: Record<Locale, Copy> = { zh, en }

export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'zh' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'zh'
}

export function writeLocale(locale: Locale): void {
  localStorage.setItem(KEY, locale)
}

function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Copy
  format: (template: string, vars: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readLocale())

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        writeLocale(next)
        setLocaleState(next)
      },
      t: COPY[locale],
      format: formatTemplate,
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider')
  return ctx
}

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      <button type="button" className={locale === 'zh' ? 'on' : ''} onClick={() => setLocale('zh')}>
        中文
      </button>
      <button type="button" className={locale === 'en' ? 'on' : ''} onClick={() => setLocale('en')}>
        EN
      </button>
    </div>
  )
}
