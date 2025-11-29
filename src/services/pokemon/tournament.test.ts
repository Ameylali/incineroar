import { Pokemon, PokemonClient } from 'pokenode-ts';

import { pokedataSampleTournament } from '@/src/utils/test-utils';

import TournamentParserFactory from './tournament';

describe('TournamentParser', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PokedataTournamentParser', () => {
    beforeAll(() => {
      jest
        .spyOn(PokemonClient.prototype, 'getPokemonById')
        .mockReturnValue(Promise.resolve({ name: 'mocked name' } as Pokemon));
    });

    it('should parser data', async () => {
      const parser = TournamentParserFactory.getParser('pokedata');
      const result = await parser.parse(
        { name: 'test', season: 2025, format: 'reg h' },
        pokedataSampleTournament,
      );
      expect(result.teams).toHaveLength(3);
      result.teams.forEach((team) => {
        expect(team.data).not.toBeFalsy();
        expect(team.player).not.toBeFalsy();
      });
    });

    it('should ignore teams that failed to parse', async () => {
      const parser = TournamentParserFactory.getParser('pokedata');
      const data = [
        ...pokedataSampleTournament,
        {
          name: undefined,
          decklist: undefined,
        },
        {
          name: undefined,
          decklist: [{}],
        },
        {
          name: undefined,
          decklist: [
            {
              id: '1',
              badges: ['move1', 'move2', 'move3', 'move4'],
            },
          ],
        },
      ];
      const result = await parser.parse(
        { name: 'test', season: 2025, format: 'reg h' },
        data,
      );
      expect(result.teams).toHaveLength(4);
      result.teams.forEach((team) => {
        expect(team.data).not.toBeFalsy();
        expect(team.player).not.toBeFalsy();
      });
    });
  });
});
