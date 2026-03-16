const cache = new Map<string, Promise<unknown>>();

function importDynamic(moduleName: string): Promise<unknown> {
  const dynamicImporter = Function("m", "return import(m)") as (m: string) => Promise<unknown>;
  return dynamicImporter(moduleName);
}

export async function loadOptionalModule<T = unknown>(moduleName: string): Promise<T | null> {
  if (!cache.has(moduleName)) {
    cache.set(
      moduleName,
      importDynamic(moduleName).catch(() => null)
    );
  }

  const loaded = await cache.get(moduleName);
  return (loaded ?? null) as T | null;
}
