import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'zh' | 'en'

const KEY = 'chitest.locale'

const zh = {
  observeT0:
    '请观察这张图，用你自己的语言描述你从这个画面中读到的视觉信息。你可以描述人物、空间、位置关系、构图、镜头、动作或氛围。没有标准答案，也不需要使用专业术语。',
  observeAdjust:
    '请描述你希望 AI 生成的画面。生成结果出现后，请观察它与自己想表达的效果有什么差异，并修改你的描述，让下一次生成更接近你的想法。没有标准答案，也不需要使用专业术语。',
  observe:
    '请描述你希望 AI 生成的画面。生成结果出现后，请观察它与自己想表达的效果有什么差异，并修改你的描述，让下一次生成更接近你的想法。没有标准答案，也不需要使用专业术语。',
  observeT3:
    '请描述你希望 AI 生成的画面。生成结果出现后，请观察它与自己想表达的效果有什么差异，并修改你的描述，让下一次生成更接近你的想法。',
  refine:
    '请看生成结果。如果还想调整，请继续改你的描述。没有标准答案，也不需要使用专业术语。',
  refineT3: '请看生成结果。请观察它与自己想表达的效果有什么差异，并修改你的描述，让下一次生成更接近你的想法。',
  generating: '正在根据你的描述生成画面，请稍候。',
  viewImage: '这是根据你的描述生成的对照图，用来帮你继续调整，不是评分。',
  introduction:
    '接下来你会看到几张静帧。每张图都是生成过程中的一个当前结果。请用自己的语言描述你看到的内容，或你希望如何调整。没有标准答案，也不需要使用专业术语。',
  introCount: '一共 7 张图。',
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
  original: '当前画面',
  currentImage: '当前画面',
  sketch: '草图',
  generated: 'AI 生成',
  aiInterpretation: 'AI 对你草图变化的文字描述',
  autoPromptHint: '这段话只根据草图生成，供你对照阅读。它不会直接拿去生成，也不会覆盖你自己写的描述。',
  autoPromptEmpty: '改动草图后，这里会出现一段根据草图写出的描述。',
  userPrompt: '你可以修改的生成描述',
  description: '你的描述',
  submit: '提交',
  generate: '生成',
  satisfied: '满意，下一题',
  selfReportTitle: '这一题结束前',
  selfAlignment: '你最终想让 AI 完成的修改，与你原本想表达的内容有多一致？',
  selfAlignmentHint: '1 = 完全不一致，7 = 完全一致。这不是在给生成图打分。',
  resultAlignment: '当前生成结果与你想表达的画面有多一致？',
  resultAlignmentHint: '1 = 完全不一致，7 = 完全一致。',
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
  exportBlocked: '数据校验未通过，不能标记为导出完成',
  officialExport: '一次导出全部正式表',
  progressAria: '实验进度',
  progressIntro: '说明',
  progressSurvey: '问卷',
  progressDone: '完成',
  progressNotStarted: '未开始',
  apiMissing: '即梦接口尚未配置。',
  homeLead: '这是一项关于人们如何向生成式图像模型表达画面意图的实验。',
  homeBody:
    '每位被试完成 7 张图。请根据当前画面写下你希望如何调整。生成图只作对照，不是评分。',
  apiChecking: '正在检查即梦接口…',
  apiReady: '即梦接口已连接',
  apiHint: '请在 Vercel Production 设置 JIMENG_ACCESS_KEY 与 JIMENG_SECRET_KEY，然后 Redeploy。',
  participant: '被试',
  expert: '专家评分',
  coding: '研究者编码',
  exportPage: '导出',
  language: '语言',
  studyBrand: 'CHItest',
}

export type Copy = typeof zh

const en: Copy = {
  observeT0:
    'Look at this picture. In your own words, describe the visual information you read from the frame. You can mention people, space, positions, composition, the camera, action, or atmosphere. There is no single correct answer, and you do not need professional terms.',
  observeAdjust:
    'Describe the picture you want the AI to generate. After the result appears, look at how it differs from what you wanted, and revise your description so the next generation is closer. There is no single correct answer, and you do not need professional terms.',
  observe:
    'Describe the picture you want the AI to generate. After the result appears, look at how it differs from what you wanted, and revise your description so the next generation is closer. There is no single correct answer, and you do not need professional terms.',
  observeT3:
    'Describe the picture you want the AI to generate. After the result appears, look at how it differs from what you wanted, and revise your description so the next generation is closer.',
  refine:
    'Look at the generated result. If you want to adjust it, keep editing your description. There is no single correct answer, and you do not need professional terms.',
  refineT3:
    'Look at the generated result. Notice how it differs from what you wanted, and revise your description so the next generation is closer.',
  generating: 'Generating an image from your description. Please wait.',
  viewImage: 'This is a comparison image generated from your description. Use it to keep adjusting — it is not a score.',
  introduction:
    'You will see a series of still images. Each one is a current result from a generation process. In your own words, describe what you see, or how you would like to adjust it. There is no single correct answer, and you do not need professional terms.',
  introCount: 'You will complete 7 pictures.',
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
  original: 'Current image',
  currentImage: 'Current image',
  sketch: 'Sketch',
  generated: 'AI generated',
  aiInterpretation: 'AI wording of the changes in your sketch',
  autoPromptHint: 'This wording comes from the sketch only. It is for you to read. It is not sent to generation, and it will not overwrite your description.',
  autoPromptEmpty: 'After you change the sketch, a description written from the sketch appears here.',
  userPrompt: 'Description you can edit for generation',
  description: 'Your description',
  submit: 'Submit',
  generate: 'Generate',
  satisfied: 'Satisfied / Next',
  selfReportTitle: 'Before the next picture',
  selfAlignment: 'How well does the change you finally asked the AI to make match what you originally wanted to express?',
  selfAlignmentHint: '1 = not at all, 7 = completely. This is not a score for the generated image.',
  resultAlignment: 'How well does the current generated result match the picture you wanted to express?',
  resultAlignmentHint: '1 = not at all, 7 = completely.',
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
  exportBlocked: 'Validation failed; export is not complete',
  officialExport: 'Download all official tables',
  progressAria: 'Experiment progress',
  progressIntro: 'Intro',
  progressSurvey: 'Survey',
  progressDone: 'Done',
  progressNotStarted: 'Not started',
  apiMissing: 'Jimeng API is not configured on this deployment.',
  homeLead: 'A study of how people express intended changes to a generated image.',
  homeBody:
    'Each participant completes 7 pictures. Describe how you want to adjust the current image. Generated images are for comparison, not scoring.',
  apiChecking: 'Checking Jimeng API…',
  apiReady: 'Jimeng API connected',
  apiHint: 'Vercel Production must define JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY, then Redeploy.',
  participant: 'Participant',
  expert: 'Expert evaluation',
  coding: 'Researcher coding',
  exportPage: 'Export',
  language: 'Language',
  studyBrand: 'CHItest',
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
