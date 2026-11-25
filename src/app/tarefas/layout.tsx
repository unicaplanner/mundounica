
export default function TarefasLayout({ children }: LayoutProps<"/tarefas">) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">Tarefas</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Tudo que tem pra fazer, aprovar ou conferir, de todos os módulos, num lugar só.
      </p>
      {children}
    </div>
  );
}
