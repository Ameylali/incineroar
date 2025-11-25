export const UserKeys = {
  me: () => ['me'] as const,
  team: (id: string) => ['team', id] as const,
};

export const PokemonKeys = {
  pokemon: (name?: string) => ['pokemon', name] as const,
  item: (item?: string) => ['item', item] as const,
};
