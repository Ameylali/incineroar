import { QueryClient } from '@tanstack/react-query';
import { ItemClient, PokemonClient } from 'pokenode-ts';

export const queryClient = new QueryClient();

export const pokemonClient = new PokemonClient();

export const itemClient = new ItemClient();
