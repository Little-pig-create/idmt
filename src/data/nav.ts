export type NavItem = {
  label: string;
  href: string;
  desc?: string;
};

export type NavEntry = {
  label: string;
  href: string;
  /** 有 children 时渲染 Mega Menu */
  children?: NavItem[];
  /** Mega Menu 的分组标题（可选） */
  groups?: { title: string; items: NavItem[] }[];
};

export const nav: NavEntry[] = [
  {
    label: '机构',
    href: '/about',
    groups: [
      {
        title: '研究院概况',
        items: [
          { label: '研究院简介', href: '/about', desc: '定位、使命与研究布局' },
          { label: '组织架构', href: '/about#structure', desc: '学术委员会与研究中心' },
          { label: '发展历程', href: '/about#history', desc: '自 2019 年以来的关键节点' },
        ],
      },
    ],
  },
  {
    label: '研究',
    href: '/research',
    groups: [
      {
        title: '研究方向',
        items: [
          { label: '数字治理与公共管理', href: '/research/digital-governance', desc: '制度适配与基层治理' },
          { label: '数据要素与数字经济', href: '/research/data-economy', desc: '产权界定与流通机制' },
          { label: '智能决策与优化', href: '/research/intelligent-decision', desc: '鲁棒优化与可解释性' },
          { label: '数字政府与公共服务', href: '/research/digital-government', desc: '流程再造与服务设计' },
        ],
      },
      {
        title: '研究力量',
        items: [
          { label: '研究团队', href: '/people', desc: '研究人员与在读学生' },
          { label: '科研项目', href: '/projects', desc: '在研与结项课题' },
        ],
      },
    ],
  },
  {
    label: '成果与动态',
    href: '/publications',
    groups: [
      {
        title: '学术成果',
        items: [
          { label: '全部成果', href: '/publications', desc: '期刊、会议、著作与报告' },
          { label: '数据集与资源', href: '/datasets', desc: '开放数据与工具' },
        ],
      },
      {
        title: '动态',
        items: [
          { label: '新闻动态', href: '/news', desc: '研究院最新进展' },
          { label: '通知公告', href: '/notices', desc: '招生、会议与科研事务' },
          { label: '学术活动', href: '/events', desc: '讲座、研讨会与工作坊' },
        ],
      },
    ],
  },
  // 专题保持为纯链接：条目由 topics 集合驱动，写死 slug 会让「新增专题」必须改代码。
  // 全部专题在 /topics 索引页列出，新增 MDX 即自动出现。
  {
    label: '专题',
    href: '/topics',
  },
  {
    label: '加入我们',
    href: '/join',
  },
];
