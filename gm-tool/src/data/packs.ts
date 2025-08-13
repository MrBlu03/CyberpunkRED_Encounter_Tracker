export type PackEntry = { file: string } & Record<string, unknown>

export async function loadPack(category: 'core' | 'black-chrome' | 'dlc' | 'internal' | 'other') {
  const res = await fetch(`/data/${category}.json`)
  if (!res.ok) throw new Error(`Failed to load ${category} data`)
  const data = (await res.json()) as PackEntry[]
  return data
}
