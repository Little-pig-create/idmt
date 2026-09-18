import type { ReactElement } from 'react';
import SvgIcon from '@mui/material/SvgIcon';

/**
 * 后台使用的图标。
 *
 * 刻意不引入 @mui/icons-material：那是一个 2000+ 文件的重量级包，
 * 而后台只需要 5 个图标。这里用 MUI 的 SvgIcon 包裹内联路径，
 * 依然能继承 color / fontSize，行为与官方图标一致。
 */
function icon(paths: ReactElement) {
  return function Icon(props: { fontSize?: 'inherit' | 'small' | 'medium' | 'large' }) {
    return (
      <SvgIcon fontSize={props.fontSize ?? 'medium'} viewBox="0 0 24 24">
        {paths}
      </SvgIcon>
    );
  };
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const RefreshIcon = icon(
  <>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" {...stroke} />
    <path d="M21 3v5h-5" {...stroke} />
  </>
);

export const AddIcon = icon(
  <>
    <path d="M12 5v14" {...stroke} />
    <path d="M5 12h14" {...stroke} />
  </>
);

export const PublishIcon = icon(
  <>
    <path d="M22 2 11 13" {...stroke} />
    <path d="M22 2 15 22l-4-9-9-4Z" {...stroke} />
  </>
);

export const EditIcon = icon(
  <>
    <path d="M12 20h9" {...stroke} />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" {...stroke} />
  </>
);

export const DeleteIcon = icon(
  <>
    <path d="M3 6h18" {...stroke} />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" {...stroke} />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...stroke} />
  </>
);

/* ---- 以下为 Markdown 编辑器 / 图片选择器追加的图标，风格同上 ---- */

/** 二分，工具栏图标统一用稍粗的描边 */
const stroke2 = { ...stroke, strokeWidth: 2 };

export const H2Icon = icon(
  <>
    <path d="M4 5v14" {...stroke2} />
    <path d="M4 12h8" {...stroke2} />
    <path d="M12 5v14" {...stroke2} />
    <text x="14" y="20" fontSize="9" fontWeight="600">
      2
    </text>
  </>
);

export const H3Icon = icon(
  <>
    <path d="M4 5v14" {...stroke2} />
    <path d="M4 12h8" {...stroke2} />
    <path d="M12 5v14" {...stroke2} />
    <text x="14" y="20" fontSize="9" fontWeight="600">
      3
    </text>
  </>
);

export const BoldIcon = icon(
  <>
    <path d="M7 5h5.5a3.5 3.5 0 0 1 0 7H7z" {...stroke2} />
    <path d="M7 12h6.5a3.5 3.5 0 0 1 0 7H7z" {...stroke2} />
  </>
);

export const ItalicIcon = icon(
  <>
    <path d="M19 4h-7" {...stroke2} />
    <path d="M12 20H5" {...stroke2} />
    <path d="M15 4 9 20" {...stroke2} />
  </>
);

export const StrikeIcon = icon(
  <>
    <path d="M16 5H9.5a3.5 3.5 0 0 0-2.5 6" {...stroke2} />
    <path d="M14 12a4 4 0 0 1 0 7H6" {...stroke2} />
    <path d="M3 12h18" {...stroke2} />
  </>
);

export const BulletListIcon = icon(
  <>
    <path d="M9 6h11" {...stroke2} />
    <path d="M9 12h11" {...stroke2} />
    <path d="M9 18h11" {...stroke2} />
    <circle cx="4.5" cy="6" r="1.3" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1.3" fill="currentColor" />
  </>
);

export const OrderedListIcon = icon(
  <>
    <path d="M10 6h11" {...stroke2} />
    <path d="M10 12h11" {...stroke2} />
    <path d="M10 18h11" {...stroke2} />
    <text x="1.5" y="8.5" fontSize="8" fontWeight="600">
      1
    </text>
    <text x="1.5" y="14.5" fontSize="8" fontWeight="600">
      2
    </text>
    <text x="1.5" y="20.5" fontSize="8" fontWeight="600">
      3
    </text>
  </>
);

export const QuoteIcon = icon(
  <>
    <path d="M4 5v14" {...stroke2} />
    <path d="M10 8h10" {...stroke2} />
    <path d="M10 12h10" {...stroke2} />
    <path d="M10 16h7" {...stroke2} />
  </>
);

export const CodeIcon = icon(
  <>
    <path d="M8 6 3 12l5 6" {...stroke2} />
    <path d="M16 6l5 6-5 6" {...stroke2} />
  </>
);

export const RuleIcon = icon(
  <>
    <path d="M3 12h18" {...stroke2} strokeDasharray="4 3" />
  </>
);

export const LinkIcon = icon(
  <>
    <path d="M9.5 14.5 14.5 9.5" {...stroke2} />
    <path d="M12.5 6.5 14 5a4 4 0 0 1 5.5 5.5L18 12" {...stroke2} />
    <path d="M11.5 17.5 10 19a4 4 0 0 1-5.5-5.5L6 12" {...stroke2} />
  </>
);

export const ImageIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" {...stroke2} />
    <circle cx="8.5" cy="9.5" r="1.6" {...stroke2} />
    <path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17" {...stroke2} />
  </>
);

export const UploadIcon = icon(
  <>
    <path d="M12 16V4" {...stroke2} />
    <path d="M7 9l5-5 5 5" {...stroke2} />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" {...stroke2} />
  </>
);

export const CloseIcon = icon(
  <>
    <path d="M6 6l12 12" {...stroke2} />
    <path d="M18 6 6 18" {...stroke2} />
  </>
);

/** 前端粒度管理：滑杆面板，示意「逐项调节」 */
export const SlidersIcon = icon(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...stroke2} />
    <circle cx="15" cy="7" r="2.2" {...stroke2} />
    <circle cx="9" cy="17" r="2.2" {...stroke2} />
  </>
);

/** 权限受限：锁 */
export const LockIcon = icon(
  <>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5" {...stroke2} />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...stroke2} />
  </>
);
