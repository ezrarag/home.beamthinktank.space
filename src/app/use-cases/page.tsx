import { UseCaseGallery } from "@/components/use-cases/UseCaseGallery";
import { getPublishedUseCases } from "@/lib/useCases";

export const revalidate = 300;

export default async function UseCasesPage() {
  const useCases = await getPublishedUseCases();

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:px-8">
        <header className="max-w-3xl">
          <p className="beam-eyebrow">BEAM Use Cases</p>
          <h1 className="beam-display mt-4 text-5xl text-[var(--beam-text-primary)] sm:text-6xl">
            Research and production pathways participants can join now.
          </h1>
          <p className="mt-5 text-base text-[var(--beam-text-secondary)] sm:text-lg">
            Each path shows the workflow from phone capture to cloud production, the tools already in use, the money
            model underneath it, and the first action that gets a new participant moving.
          </p>
        </header>

        <UseCaseGallery useCases={useCases} />
      </div>
    </main>
  );
}
