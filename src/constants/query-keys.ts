export const UserKeys = {
  me: () => ['me'] as const,
  team: (id: string) => ['team', id] as const,
};

export const PokemonKeys = {
  pokemon: (name?: string) => ['pokemon', name] as const,
  item: (item?: string) => ['item', item] as const,
  allPokemon: () => ['all-pokemon'] as const,
  allMoves: () => ['all-moves'] as const,
  allItems: () => ['all-items'] as const,
  allAbilities: () => ['all-abilities'] as const,
};

export const MetagameKeys = {
  tournaments: () => ['tournaments'] as const,
  tournament: (id: string) => ['tournament', id] as const,
};

export const TrainingKeys = {
  trainings: () => ['trainings'] as const,
  training: (id: string) => ['training', id] as const,
  battle: (trainingId: string, battleId: string) =>
    ['training', trainingId, 'battle', battleId] as const,
  trainingAnalysis: (trainingId: string) =>
    ['training', trainingId, 'analysis'] as const,
};
