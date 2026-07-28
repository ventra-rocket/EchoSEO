import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { getProjectCommandCenter } from "@/serverFunctions/command-center";
import {
  DataHealthCard,
  NextActionCard,
  PriorityQueue,
} from "./CommandCenterCards";
import { SignalCards } from "./CommandCenterSignalCards";

export function ProjectCommandCenterPage({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["project-command-center", projectId],
    queryFn: () => getProjectCommandCenter({ data: { projectId } }),
    staleTime: 0,
  });

  if (query.isLoading) return <CommandCenterLoadingState />;

  if (query.isError || !query.data) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="alert alert-error" role="alert">
            <span>We could not load this project overview.</span>
            <button className="btn btn-sm" onClick={() => void query.refetch()}>
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { data } = query;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8"
    >
      <div className="mx-auto max-w-7xl space-y-4" aria-busy={query.isFetching}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
              Project overview
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-base-content">
              {data.project.name}
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              {data.project.domain ?? "No domain configured yet"}
            </p>
          </div>
          <button
            className="btn btn-ghost min-h-11 sm:btn-sm"
            onClick={() => void query.refetch()}
            aria-label="Refresh project overview"
          >
            <RefreshCw
              className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </header>

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <NextActionCard projectId={projectId} actions={data.nextActions} />
          </div>
          <div className="xl:col-span-5">
            <DataHealthCard projectId={projectId} data={data} />
          </div>
        </div>

        <SignalCards projectId={projectId} data={data} />

        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PriorityQueue projectId={projectId} data={data} />
          </div>
          <section className="card border border-base-300 bg-base-100 shadow-sm xl:col-span-4">
            <div className="card-body gap-3">
              <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">
                Data source
              </p>
              <p className="text-sm text-base-content/75">
                EchoSEO only reports signals already connected to this project.
                No external data request is triggered from this page.
              </p>
              <p className="text-xs text-base-content/60">
                DataForSEO:{" "}
                {data.readiness.dataForSeoConfigured
                  ? "configured"
                  : "not configured"}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CommandCenterLoadingState() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="px-4 py-4 md:px-6 md:py-6"
      aria-busy="true"
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="skeleton h-16 w-64" />
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="skeleton h-64 xl:col-span-7" />
          <div className="skeleton h-64 xl:col-span-5" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-36" />
          ))}
        </div>
      </div>
    </main>
  );
}
