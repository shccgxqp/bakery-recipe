/* 冷啟動(無快取)資料還在讀取時的骨架屏,形狀對齊真實側欄+主畫面版面,
   資料回來後不跳動;有快取時不會用到這個(App.jsx 先顯示快取,背景刷新)。 */
function Bar({ className }) {
  return <div className={'skel rounded-md ' + className} />
}

export default function Skeleton() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[272px_minmax(0,1fr)]" aria-hidden="true" aria-busy="true">
      <aside className="border-r border-line bg-paper-deep px-4.5 pb-3.5 pt-5.5">
        <Bar className="h-6 w-28" />
        <Bar className="mt-2 h-3 w-36" />
        <Bar className="mt-6 h-8 w-full" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => <Bar key={i} className="h-9 w-full" />)}
        </div>
      </aside>
      <main className="px-4 pb-20 pt-5 md:px-9 md:pt-7">
        <Bar className="h-8 w-56" />
        <div className="mt-4.5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Bar key={i} className="h-16 rounded-none" />)}
        </div>
        <div className="mt-8 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => <Bar key={i} className="h-6 w-full" />)}
        </div>
      </main>
    </div>
  )
}
