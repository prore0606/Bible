type Props = { no: string; title: string; path: string };

// T1 단계의 빈 화면. 화면별 구현이 들어가면 각 page.tsx에서 교체한다.
export default function Placeholder({ no, title, path }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-1 px-4 pb-20 text-center">
      <span className="text-xs font-extrabold text-grape">{no}</span>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="text-sm text-gray">{path}</p>
    </main>
  );
}
