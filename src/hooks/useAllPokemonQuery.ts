import { useQuery } from '@tanstack/react-query';

import { PokemonKeys } from '../constants/query-keys';
import { pokemonClient } from '../utils/query-clients';

const getAllPokemon = async () => {
  const pokemon = await pokemonClient.listPokemons(0, 10000);
  return pokemon.results.map((p) => p.name);
};

const useAllPokemonQuery = () => {
  return useQuery({
    queryKey: PokemonKeys.allPokemon(),
    queryFn: getAllPokemon,
    staleTime: Infinity,
  });
};

export default useAllPokemonQuery;
