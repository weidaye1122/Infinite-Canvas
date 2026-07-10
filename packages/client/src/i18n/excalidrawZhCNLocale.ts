// Excalidraw 0.18.0's bundled zh-CN locale is missing several newer named exports.
// We wrap the original module so runtime lookups like `search.title` resolve to Chinese.
// @ts-expect-error Vite resolves the query marker; TypeScript does not know this module id.
import * as base from '../../node_modules/@excalidraw/excalidraw/dist/prod/locales/zh-CN-LNUGB5OW.js?excalidraw-original-locale';

type LocaleBranch = Record<string, any>;

const labels = {
  ...((base.labels ?? {}) as LocaleBranch),
  changeStroke: '更改描边颜色',
  changeBackground: '更改背景颜色',
  arrowhead_crowfoot_many: '乌鸦脚（多）',
  arrowhead_crowfoot_one: '乌鸦脚（单）',
  arrowhead_crowfoot_one_or_many: '乌鸦脚（单或多）',
  more_options: '更多选项',
  arrowtypes: '箭头类型',
  arrowtype_sharp: '尖角箭头',
  arrowtype_round: '曲线箭头',
  arrowtype_elbowed: '折线箭头',
  clearCanvas: '清空画布',
  toggleGrid: '切换网格',
  loadScene: '从文件加载画布',
  showFonts: '显示字体选择器',
  theme: '主题',
  followUs: '关注我们',
  discordChat: 'Discord 聊天',
  zoomToFitViewport: '缩放以适应视口',
  zoomToFitSelection: '缩放到选中内容',
  zoomToFit: '缩放以适应全部元素',
  installPWA: '在本地安装 Excalidraw（PWA）',
  autoResize: '启用文本自动调整大小',
  imageCropping: '图片裁剪',
  unCroppedDimension: '未裁剪尺寸',
  copyElementLink: '复制对象链接',
  linkToElement: '链接到对象',
  wrapSelectionInFrame: '将选区包裹进画框',
  prompt: '提示词',
  link: {
    ...((((base.labels ?? {}) as LocaleBranch).link ?? {}) as LocaleBranch),
    hint: '在此输入或粘贴链接',
    goToElement: '前往目标对象',
  },
  lineEditor: {
    ...((((base.labels ?? {}) as LocaleBranch).lineEditor ?? {}) as LocaleBranch),
    editArrow: '编辑箭头',
  },
} as const;

const elementLink = {
  title: '链接到对象',
  desc: '点击画布上的形状或粘贴链接。',
  notFound: '在画布上未找到已链接对象。',
} as const;

const search = {
  title: '在画布上查找',
  noMatch: '未找到匹配项...',
  singleResult: '个结果',
  multipleResults: '个结果',
  placeholder: '在画布上查找...',
} as const;

const buttons = {
  ...((base.buttons ?? {}) as LocaleBranch),
  copyLink: '复制链接',
  systemMode: '跟随系统',
} as const;

const errors = {
  ...((base.errors ?? {}) as LocaleBranch),
  saveLibraryError:
    '无法将素材库保存到存储中。请将素材库另存为本地文件，以免丢失更改。',
} as const;

const element = {
  selection: '选择',
  image: '图像',
  rectangle: '矩形',
  diamond: '菱形',
  ellipse: '椭圆',
  arrow: '箭头',
  line: '线条',
  freedraw: '自由绘制',
  text: '文本',
  group: '分组',
  frame: '画框',
  magicframe: '线框图转代码',
  embeddable: '网页嵌入',
  iframe: 'IFrame',
} as const;

const hints = {
  ...((base.hints ?? {}) as LocaleBranch),
  dismissSearch: '按 Escape 关闭搜索',
  arrowTool: '点击创建多段点，拖动创建单段线。再次按 {{arrowShortcut}} 可切换箭头类型。',
  createFlowchart: '按住 CtrlOrCmd 并按方向键可创建流程图',
  enterCropEditor: '双击图片或按 Enter 以裁剪图片',
  leaveCropEditor: '点击图片外部，或按 Enter / Escape 完成裁剪',
} as const;

const shareDialog = {
  or: '或',
} as const;

const helpDialog = {
  ...((base.helpDialog ?? {}) as LocaleBranch),
  createFlowchart: '从普通元素创建流程图',
  navigateFlowchart: '导航流程图',
  cropStart: '裁剪图片',
  cropFinish: '完成图片裁剪',
} as const;

const stats = {
  ...((base.stats ?? {}) as LocaleBranch),
  shapes: '形状',
  fullTitle: '画布与形状属性',
  generalStats: '画布',
  elementProperties: '形状属性',
} as const;

const toast = {
  ...((base.toast ?? {}) as LocaleBranch),
  copyToClipboardAsSvg: '已将 {{exportSelection}} 作为 SVG 复制到剪贴板\n({{exportColorScheme}})',
  elementLinkCopied: '链接已复制到剪贴板',
} as const;

const quickSearch = {
  placeholder: '快速搜索',
} as const;

const fontList = {
  badge: {
    old: '旧',
  },
  sceneFonts: '当前场景中的字体',
  availableFonts: '可用字体',
  empty: '未找到字体',
} as const;

const userList = {
  empty: '未找到用户',
  hint: {
    text: '点击用户以跟随',
    followStatus: '你当前正在跟随该用户',
    inCall: '用户正在语音通话中',
    micMuted: '用户的麦克风已静音',
    isSpeaking: '用户正在发言',
  },
} as const;

const commandPalette = {
  title: '命令面板',
  shortcuts: {
    select: '选择',
    confirm: '确认',
    close: '关闭',
  },
  recents: '最近使用',
  search: {
    placeholder: '搜索菜单、命令，发现隐藏功能',
    noMatch: '未找到匹配命令...',
  },
  itemNotAvailable: '命令不可用...',
  shortcutHint: '命令面板请按 {{shortcut}}',
} as const;

const defaultLocale = {
  ...((base.default ?? {}) as LocaleBranch),
  labels,
  elementLink,
  search,
  buttons,
  errors,
  element,
  hints,
  shareDialog,
  helpDialog,
  stats,
  toast,
  quickSearch,
  fontList,
  userList,
  commandPalette,
} as const;

// @ts-expect-error Vite resolves the query marker; TypeScript does not know this module id.
export * from '../../node_modules/@excalidraw/excalidraw/dist/prod/locales/zh-CN-LNUGB5OW.js?excalidraw-original-locale';
export {
  buttons,
  commandPalette,
  element,
  elementLink,
  errors,
  fontList,
  helpDialog,
  hints,
  labels,
  quickSearch,
  search,
  shareDialog,
  stats,
  toast,
  userList,
};
export default defaultLocale;
