import { useState } from 'react';
import { Button } from '@/components/ui/button';

const TOPICS = ['产业合作', '产品咨询', '招聘与人才', '媒体采访', '其他'];

export default function ContactForm({ email }: { email: string }) {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [message, setMessage] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${topic}] 来自官网的联系：${name || '未署名'}`);
    const body = encodeURIComponent(
      `姓名：${name}\n单位：${org}\n事由：${topic}\n\n${message}\n\n（本邮件由官网联系表单生成）`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const field = 'mt-1.5 w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-brand focus:bg-surface';

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label htmlFor="contact-name" className="block text-[12.5px] font-medium text-ink-secondary">
          姓名
          <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required className={field} placeholder="怎么称呼您" />
        </label>
        <label htmlFor="contact-org" className="block text-[12.5px] font-medium text-ink-secondary">
          单位 / 学校
          <input id="contact-org" value={org} onChange={(e) => setOrg(e.target.value)} className={field} placeholder="选填" />
        </label>
      </div>

      <div>
        <p className="text-[12.5px] font-medium text-ink-secondary">事由</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={`h-8 rounded-full border px-3 text-[12px] transition-colors ${
                topic === t ? 'border-transparent bg-ink text-white' : 'border-line text-ink-secondary hover:border-line-strong'
              }`}
              aria-pressed={topic === t}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label htmlFor="contact-message" className="block text-[12.5px] font-medium text-ink-secondary">
        具体需求
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className={field}
          placeholder="简要描述背景、目标与时间要求"
        />
      </label>

      <Button type="submit" className="h-11 w-full rounded-lg bg-ink text-[13.5px] text-white hover:bg-brand">
        生成邮件
      </Button>
      <p className="text-[11px] leading-relaxed text-ink-tertiary">
        本站为静态站点，不收集表单数据；点击后调用您的邮件客户端。
      </p>
    </form>
  );
}
