import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { PokemonClient } from 'pokenode-ts';

import { PokemonKeys } from '../constants/query-keys';

const pokemonClient = new PokemonClient();

const tryGetPokemonSpeciesByName = async (name: string) => {
  try {
    return await pokemonClient.getPokemonSpeciesByName(name);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

const tryGetPokemonByName = async (name: string) => {
  try {
    return await pokemonClient.getPokemonByName(name);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

const getPokemon = async (rawName?: string) => {
  if (!rawName) {
    throw new Error('Can not fetch pokemon. Missing pokemon name');
  }
  const name = rawName?.toLowerCase().replaceAll(' ', '-');
  const species = await tryGetPokemonSpeciesByName(name);
  if (species) {
    return await pokemonClient.getPokemonById(species.id);
  }
  const pokemon = await tryGetPokemonByName(name);
  if (!pokemon) {
    throw new Error(`Pokemon with name ${name} not found`);
  }
  return await pokemonClient.getPokemonById(pokemon.id);
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
