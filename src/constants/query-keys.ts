export const UserKeys = {
  me: () => ['me'] as const,
  team: (id: string) => ['team', id] as const,
};

export const PokemonKeys = {
  pokemon: (name?: string) => ['pokemon', name] as const,
  item: (item?: string) => ['item', item] as const,
};

export const MetagameKeys = {
  tournaments: () => ['tournaments'] as const,
  tournament: (id: string) => ['tournament', id] as const,
};

export const TrainingKeys = {
  trainings: () => ['trainings'] as const,
  training: (id: string) => ['training', id] as const,
};
