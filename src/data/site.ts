export const site = {
  name: '数字管理研究院',
  nameEn: 'Institute for Digital Management',
  shortName: 'DMI',
  tagline: '研究数字技术如何重塑管理',
  description:
    '数字管理研究院聚焦数字治理与公共管理、数据要素与数字经济、智能决策与优化、数字政府与公共服务四个方向，开展面向真实治理场景的实证与建模研究。',
  url: 'https://dmi.example.edu.cn',
  address: '示例市示例区学院路 1 号 数字管理研究院',
  postcode: '100000',
  phone: '+86 010-0000-0000',
  email: 'office@dmi.example.edu.cn',
  filing: '示例备 00000000 号',
  founded: '2019',
};

export const researchAreas = [
  '数字治理与公共管理',
  '数据要素与数字经济',
  '智能决策与优化',
  '数字政府与公共服务',
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
