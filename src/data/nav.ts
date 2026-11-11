export interface NavItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  children?: { label: string; href: string; description?: string }[];
}

export const nav: NavItem[] = [
  {
    id: 'research',
    label: '研究方向',
    href: '/research',
    description: '九大方向，覆盖从算力底座到产业场景',
    children: [
      { label: '智能算力与数字基础设施', href: '/research/intelligent-computing' },
      { label: '人工智能与无人系统', href: '/research/ai-autonomous-systems' },
      { label: '智能机器人与具身智能', href: '/research/robotics-embodied' },
      { label: '智慧物联网与智能空间', href: '/research/iot-smart-space' },
      { label: '数据智能与大模型', href: '/research/data-intelligence' },
      { label: '先进制造与增材技术', href: '/research/advanced-manufacturing' },
      { label: '新能源与碳中和', href: '/research/new-energy-carbon' },
      { label: '低空经济与无人系统', href: '/research/low-altitude-economy' },
      { label: '智慧医疗与健康科技', href: '/research/smart-healthcare' },
    ],
  },
  {
    id: 'products',
    label: '产品与方案',
    href: '/products',
    description: '可交付的整机、平台与产线',
    children: [
      { label: '智算集群与液冷', href: '/products/ai-cluster' },
      { label: '智能网联教学套件', href: '/products/intelligent-networking-kit' },
      { label: '线控底盘与移动平台', href: '/products/drive-by-wire-chassis' },
      { label: '移动作业机器人', href: '/products/mobile-robot' },
      { label: '精密金属增材系统', href: '/products/metal-am' },
      { label: '固态储氢与氢电联动', href: '/products/solid-state-hydrogen' },
    ],
  },
  { id: 'labs', label: '技术平台', href: '/labs', description: '十大专业实验室与分中心' },
  { id: 'about', label: '关于我们', href: '/about', description: '定位、治理架构与发展目标' },
  {
    id: 'news',
    label: '新闻与活动',
    href: '/news',
    description: '研究进展、合作与学术活动',
    children: [
      { label: '新闻动态', href: '/news' },
      { label: '学术活动', href: '/events' },
      { label: '通知公告', href: '/notices' },
    ],
  },
];
