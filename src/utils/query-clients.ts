import { QueryClient } from '@tanstack/react-query';
import { ItemClient, MoveClient, PokemonClient } from 'pokenode-ts';

export const queryClient = new QueryClient();

export const pokemonClient = new PokemonClient();

export const itemClient = new ItemClient();

export const moveClient = new MoveClient();
