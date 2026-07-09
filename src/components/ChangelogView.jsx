import { RELEASES } from '../data/releases.js'
import { APP_VERSION } from '../config.js'

/* 更新紀錄:面向使用者的版本說明(資料源 src/data/releases.js) */
export default function ChangelogView() {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">更新紀錄</h2>
        <span className="text-[13px] text-ink-soft">目前版本 v{APP_VERSION}</span>
      </div>
      <div className="mt-6 max-w-2xl space-y-8">
        {RELEASES.map(rel => (
          <section key={rel.v}>
            <div className="flex items-baseline gap-3 border-b border-ink pb-1">
              <span className="rounded-full bg-yolk-soft px-3 py-0.5 font-mono text-[13px] font-bold text-yolk">
                v{rel.v}
              </span>
              <span className="font-mono text-xs text-ink-soft">{rel.date}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {rel.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-relaxed">
                  <span className="text-yolk">›</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
