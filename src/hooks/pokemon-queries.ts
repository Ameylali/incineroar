import { useQuery } from '@tanstack/react-query';

import { PokemonKeys } from '../constants/query-keys';
import { itemClient, moveClient, pokemonClient } from '../utils/query-clients';

const getAllPokemon = async () => {
  const pokemon = await pokemonClient.listPokemons(0, 10000);
  return pokemon.results.map((p) => p.name);
};

const getAllMoves = async () => {
  const moves = await moveClient.listMoves(0, 10000);
  return moves.results.map((m) => m.name);
};

const getAllItems = async () => {
  const items = await itemClient.listItems(0, 10000);
  return items.results.map((i) => i.name);
};

const getAllAbilities = async () => {
  const abilities = await pokemonClient.listAbilities(0, 10000);
  return abilities.results.map((a) => a.name);
};

export const useAllAbilitiesQuery = () => {
  return useQuery({
    queryKey: PokemonKeys.allAbilities(),
    queryFn: getAllAbilities,
    staleTime: Infinity,
  });
};

export const useAllItemsQuery = () => {
  return useQuery({
    queryKey: PokemonKeys.allItems(),
    queryFn: getAllItems,
    staleTime: Infinity,
  });
};

export const useAllMovesQuery = () => {
  return useQuery({
    queryKey: PokemonKeys.allMoves(),
    queryFn: getAllMoves,
    staleTime: Infinity,
  });
};

export const useAllPokemonQuery = () => {
  return useQuery({
    queryKey: PokemonKeys.allPokemon(),
    queryFn: getAllPokemon,
    staleTime: Infinity,
  });
};
