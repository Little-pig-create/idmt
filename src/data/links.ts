/** 友情链接：院级门户常见的外部学术与资源入口 */
export type FriendLink = {
  label: string;
  href: string;
  /** 一句话说明，用于 title 提示 */
  desc: string;
};

export const friendLinks: FriendLink[] = [
  {
    label: '国家自然科学基金委员会',
    href: 'https://www.nsfc.gov.cn/',
    desc: '基础研究项目与资助政策',
  },
  {
    label: '全国哲学社会科学工作办公室',
    href: 'http://www.nopss.gov.cn/',
    desc: '社科基金与哲学社会科学规划',
  },
  {
    label: '国家哲学社会科学文献中心',
    href: 'https://www.ncpssd.cn/',
    desc: '中文人文社科文献开放获取',
  },
  {
    label: '中国知网',
    href: 'https://www.cnki.net/',
    desc: '中文期刊与学位论文数据库',
  },
  {
    label: '中国公共管理案例库',
    href: 'https://www.ncpssd.cn/',
    desc: '公共管理教学与研究案例',
  },
  {
    label: '数据要素研究联盟',
    href: '/research/data-economy',
    desc: '院内数据要素方向协作网络',
  },
];

/** 院级常用系统入口 */
export const systemLinks = [
  { label: '内容发布后台', href: '/admin' },
  { label: '全站搜索', href: '/search' },
  { label: '数据集与资源', href: '/datasets' },
];
