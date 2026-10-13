export const site = {
  name: '数字管理技术研究院',
  nameEn: 'Institute of Digital Management Technology',
  shortName: 'IDMT',
  tagline: '完成从基础研究到产业化的最后一公里',
  description:
    '浙江树人学院数字管理技术研究院（IDMT）聚焦人工智能与无人系统、数字新基建与智慧城市、云计算与数据智能、高端制造与工业数字化四个专业领域，开展面向未来产业的关键核心技术研究与成果转化。',
  url: 'https://little-pig-create.github.io/idmt',
  address: '浙江树人学院 杭州拱宸桥校区 / 绍兴杨汛桥校区',
  /**
   * 邮编、电话、邮箱与备案号必须由院方给出后再填。留空时页面不渲染该行，
   * 而不是显示一个编造的号码：假电话比空电话更糟，它会真的接到找上门的人。
   */
  postcode: '',
  phone: '',
  email: '',
  filing: '',
};

export const researchAreas = [
  '人工智能与无人系统',
  '数字新基建与智慧城市',
  '云计算与数据智能',
  '高端制造与工业数字化',
];

export const publicationTypeLabels: Record<string, string> = {
  journal: '期刊论文',
  conference: '会议论文',
  book: '著作',
  patent: '专利',
  report: '研究报告',
};

export const eventTypeLabels: Record<string, string> = {
  seminar: '研讨会',
  conference: '学术会议',
  lecture: '学术讲座',
  workshop: '工作坊',
};

export const roleLabels: Record<string, string> = {
  director: '院长',
  'exec-director': '执行院长',
  'vice-director': '副院长',
  professor: '教授',
  associate: '副教授',
  assistant: '助理教授',
  postdoc: '博士后',
  phd: '博士研究生',
};

/**
 * 研究方向状态标签。此前在 `research/index.astro` 与 `research/[slug].astro`
 * 各写了一份完全相同的字面量 —— 同一件事两种写法是漂移隐患，收敛到这里。
 */
export const researchStatusLabels: Record<string, string> = {
  active: '活跃',
  ongoing: '进行中',
  planned: '规划中',
};

export const projectStatusLabels: Record<string, string> = {
  ongoing: '在研',
  completed: '已结项',
};

/**
 * 页面级眉标签（`PageHero.eyebrow`）的取值来源。
 *
 * 学术站点的眉标签统一表示**内容类型**：读者一眼就知道自己在看什么类型的学术产出。
 * 此前同一个视觉位置承载了 6 种语义（标签、资助方、英文名、编号、页面名），
 * 同类内容在不同页面读起来像不同的东西。
 */
export const sectionEyebrow: Record<string, string> = {
  publications: '学术成果',
  news: '新闻动态',
  notices: '通知公告',
  events: '学术活动',
  projects: '科研项目',
  people: '研究团队',
  research: '研究方向',
  topics: '专题',
  datasets: '数据集与资源',
};
