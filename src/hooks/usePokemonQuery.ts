import { useQuery } from '@tanstack/react-query';
import { PokemonClient } from 'pokenode-ts';

import { PokemonKeys } from '../constants/query-keys';

const getPokemon = async (name?: string) => {
  if (!name) {
    throw new Error('Can not fetch pokemon. Missing pokemon name');
  }
  const pokemonClient = new PokemonClient();
  const species = await pokemonClient.getPokemonSpeciesByName(name);
  return await pokemonClient.getPokemonById(species.id);
};

const usePokemonQuery = (name?: string) => {
  return useQuery({
    enabled: !!name,
    queryKey: PokemonKeys.pokemon(name),
    queryFn: () => getPokemon(name),
    staleTime: Infinity,
  });
};

export default usePokemonQuery;
