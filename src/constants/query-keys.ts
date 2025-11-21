export const UserKeys = {
  me: () => ['user/me'] as const,
};

export const PokemonKeys = {
  pokemon: (name?: string) => ['pokemon', name] as const,
};
