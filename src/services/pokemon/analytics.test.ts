import { PokemonSet } from '@/src/services/pokemon';
import { TournamentTeam } from '@/src/types/api';
import { createSampleTraining, sampleTeams } from '@/src/utils/test-utils';

import AnalyticsService, {
  CoreAnalysis,
  PokemonAnalysis,
  TrainingAnalyticsService,
  UsageAnalysis,
} from './analytics';
import TeamService from './team';

describe('Analytics', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UsageAnalysis', () => {
    const usage = new UsageAnalysis<string>();

    beforeAll(() => {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j <= i; j++) {
          usage.addUsage(`value_${i}`);
        }
      }
    });

    it('should track percentage of each value', () => {
      const result = usage.getAnalysisResult();
      result.forEach(({ value, percentage }) => {
        if (value === 'value_0') expect(percentage).toEqual(1 / 6);
        if (value === 'value_1') expect(percentage).toEqual(2 / 6);
        if (value === 'value_2') expect(percentage).toEqual(3 / 6);
      });
    });

    it('should return tracked values', () => {
      const values = usage.getValues();
      expect(values).toEqual(
        expect.arrayContaining(['value_0', 'value_1', 'value_2']),
      );
    });
  });

  describe('PokemonAnalysis', () => {
    const teamService = new TeamService();
    const pokemonSet = teamService.parseTeam(sampleTeams[1])[0];
    const pokemon = new PokemonAnalysis(pokemonSet.species as string);
    let totalUsageCount = 0;

    beforeAll(() => {
      const abilities = ['ability1', 'ability2', 'ability1'];
      const moves = [
        'move1',
        'move2',
        'move3',
        'move4',
        'move1',
        'move2',
        'move2',
      ];
      const evs = {
        atk: 300,
        def: 300,
        hp: 300,
        spa: 300,
        spd: 300,
        spe: 300,
      };
      pokemon.addUsage({ ...pokemonSet, evs });
      totalUsageCount++;
      for (const ability of abilities) {
        pokemon.addUsage({ ...pokemonSet, ability });
        totalUsageCount++;
      }
      for (const move of moves) {
        pokemon.addUsage({ ...pokemonSet, moves: [move] });
        totalUsageCount++;
      }
    });

    it('should track abilities usage', () => {
      const result = pokemon.getAnalysisResult();
      const ability1Result = result.abilities.find(
        ({ value }) => value === 'ability1',
      );
      expect(ability1Result).toMatchObject({
        value: 'ability1',
        percentage: 2 / totalUsageCount,
      });

      const ability2Result = result.abilities.find(
        ({ value }) => value === 'ability2',
      );
      expect(ability2Result).toMatchObject({
        value: 'ability2',
        percentage: 1 / totalUsageCount,
      });
    });

    it('should track moves usage', () => {
      const result = pokemon.getAnalysisResult();
      const move1Result = result.moves.find(({ value }) => value === 'move1');
      expect(move1Result).toMatchObject({
        value: 'move1',
        percentage: 2 / totalUsageCount,
      });

      const move2Result = result.moves.find(({ value }) => value === 'move2');
      expect(move2Result).toMatchObject({
        value: 'move2',
        percentage: 3 / totalUsageCount,
      });
    });

    it('should track evs usage', () => {
      const result = pokemon.getAnalysisResult();
      const hpUsage = result.evs.find(({ stat }) => stat === 'hp');
      expect(hpUsage).toMatchObject({
        stat: 'hp',
        average: (252 * (totalUsageCount - 1) + 300) / totalUsageCount,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        values: expect.arrayContaining([
          { value: 252, percentage: (totalUsageCount - 1) / totalUsageCount },
          { value: 300, percentage: 1 / totalUsageCount },
        ]),
      });
      const atkUsage = result.evs.find(({ stat }) => stat === 'atk');
      expect(atkUsage).toMatchObject({
        stat: 'atk',
        average: 300,
        values: [{ value: 300, percentage: 1 }],
      });
    });

    it('should track usage', () => {
      const result = pokemon.getAnalysisResult();
      expect(result.usage).toEqual(totalUsageCount);
    });
  });

  [2, 3, 4, 5, 6].forEach((size) => {
    describe(`CoreAnalysis-${size}`, () => {
      const teamService = new TeamService();
      const team1 = teamService.parseTeam(sampleTeams[0]).slice(0, size);
      const team2 = teamService.parseTeam(sampleTeams[1]).slice(0, size);
      const core = new CoreAnalysis(size);

      beforeAll(() => {
        core.addCoreUsage(team1 as PokemonSet[]);
        core.addCoreUsage(team1 as PokemonSet[]);
        core.addCoreUsage(team2 as PokemonSet[]);
      });

      it(`should track teams of size ${size}`, () => {
        const result = core.getAnalysisResult();
        expect(result).toHaveLength(2);
        const usages = result.map(({ usage }) => usage);
        expect(usages).toEqual(expect.arrayContaining([1, 2]));
        const cores = result.map(({ pokemon }) => pokemon);
        const core1 = team1.map(({ species }) => species);
        const core2 = team2.map(({ species }) => species);
        expect(cores).toEqual(
          expect.arrayContaining([
            expect.arrayContaining(core1),
            expect.arrayContaining(core2),
          ]),
        );
      });
    });
  });

  describe('AnalyticsService', () => {
    const teamService = new TeamService();
    const analytics = new AnalyticsService();
    const teams: TournamentTeam[] = sampleTeams.map((data, index) => ({
      player: `player${index + 1}`,
      team: teamService.parseTeam(data),
      data,
    }));

    it('should analyze tournament', async () => {
      const { cores, pokemon } = await analytics.getAnalytics(teams);
      expect(Object.keys(cores)).toEqual(
        expect.arrayContaining(['2', '3', '4', '5', '6']),
      );
      expect(pokemon).not.toHaveLength(0);
    });
  });

  describe('TrainingAnalyticsService', () => {
    const trainingAnalyticsService = new TrainingAnalyticsService();

    it('should analyze openings', () => {
      const training = createSampleTraining();
      const analytics = trainingAnalyticsService.getAnalytics(training);
      expect(analytics.matchups.openings).toHaveLength(2);

      // check usage counts
      const openingUsages = analytics.matchups.openings.map(
        ({ usageCount }) => usageCount,
      );
      expect(openingUsages).toEqual(expect.arrayContaining([2, 2]));

      // check pokemon in openings
      const openingPokemons = analytics.matchups.openings.map(
        ({ pokemon }) => pokemon,
      );
      expect(openingPokemons).toEqual(
        expect.arrayContaining([
          expect.arrayContaining(['Blastoise', 'Charizard']),
          expect.arrayContaining(['Dragonite', 'Charizard']),
        ]),
      );

      // check results
      const openingResults = analytics.matchups.openings.map(
        ({ results }) => results,
      );
      expect(openingResults).toEqual(
        expect.arrayContaining([
          [{ result: 'win', count: 2 }],
          [
            { result: 'loose', count: 1 },
            { result: 'unknown', count: 1 },
          ],
        ]),
      );

      // check parings
      const openingPairings = analytics.matchups.openings.map(
        ({ pairings }) => pairings,
      );
      expect(openingPairings).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Pikachu',
              ]) as string[],
              encounterCount: 2,
              results: [{ result: 'win', count: 2 }],
            },
          ]),
          expect.arrayContaining([
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Pikachu',
              ]) as string[],
              encounterCount: 1,
              results: [{ result: 'loose', count: 1 }],
            },
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Lapras',
              ]) as string[],
              encounterCount: 1,
              results: [{ result: 'unknown', count: 1 }],
            },
          ]),
        ]),
      );
    });

    it('should analyze matchups', () => {
      const training = createSampleTraining();
      const analytics = trainingAnalyticsService.getAnalytics(training);
      expect(analytics.matchups.all).toHaveLength(2);

      // check usage counts
      const openingUsages = analytics.matchups.all.map(
        ({ usageCount }) => usageCount,
      );
      expect(openingUsages).toEqual(expect.arrayContaining([2, 2]));

      // check pokemon in openings
      const openingPokemons = analytics.matchups.all.map(
        ({ pokemon }) => pokemon,
      );
      expect(openingPokemons).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'Blastoise',
            'Charizard',
            'Gengar',
            'Lapras',
          ]),
          expect.arrayContaining([
            'Dragonite',
            'Charizard',
            'Gengar',
            'Lapras',
          ]),
        ]),
      );

      // check results
      const openingResults = analytics.matchups.all.map(
        ({ results }) => results,
      );
      expect(openingResults).toEqual(
        expect.arrayContaining([
          [{ result: 'win', count: 2 }],
          [
            { result: 'loose', count: 1 },
            { result: 'unknown', count: 1 },
          ],
        ]),
      );

      // check parings
      const openingPairings = analytics.matchups.all.map(
        ({ pairings }) => pairings,
      );
      expect(openingPairings).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Pikachu',
                'Jolteon',
                'Gyarados',
              ]) as string[],
              encounterCount: 2,
              results: [{ result: 'win', count: 2 }],
            },
          ]),
          expect.arrayContaining([
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Pikachu',
                'Jolteon',
                'Gyarados',
              ]) as string[],
              encounterCount: 1,
              results: [{ result: 'loose', count: 1 }],
            },
            {
              pokemon: expect.arrayContaining([
                'Venusaur',
                'Lapras',
                'Jolteon',
                'Gyarados',
              ]) as string[],
              encounterCount: 1,
              results: [{ result: 'unknown', count: 1 }],
            },
          ]),
        ]),
      );
    });

    it('should analyze pokemon', () => {
      const training = createSampleTraining();
      const analytics = trainingAnalyticsService.getAnalytics(training);
      expect(analytics.pokemon).toHaveLength(5);

      const blastoiseAnalysis = analytics.pokemon.find(
        (p) => p.pokemon === 'Blastoise',
      );
      expect(blastoiseAnalysis).toBeDefined();
      // TODO: re-enable KO count check when KO tracking is implemented
      // expect(blastoiseAnalysis?.ko.count).toEqual(2);
      expect(blastoiseAnalysis?.performance.faint.count).toEqual(1);
      expect(blastoiseAnalysis?.usageCount).toEqual(2);
      expect(blastoiseAnalysis?.moves).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            move: 'Surf',
            averageUsage: 0.5,
            averageUsageByMatch: 1,
          }),
          expect.objectContaining({
            move: 'Ice Beam',
            averageUsage: 1,
            averageUsageByMatch: 2,
          }),
          expect.objectContaining({
            move: 'Icy Wind',
            averageUsage: 0.5,
            averageUsageByMatch: 1,
          }),
        ]),
      );
    });

    it('should analyze key actions', () => {
      const training = createSampleTraining();
      const { keyActions } = trainingAnalyticsService.getAnalytics(training);

      // check switch tracking
      expect(keyActions.switches).toHaveLength(3);
      expect(keyActions.switches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            turn: 1,
            count: 8,
          }),
          expect.objectContaining({
            turn: 2,
            count: 8,
          }),
          expect.objectContaining({
            turn: 3,
            count: 2,
          }),
        ]),
      );

      // check KO tracking
      // TODO: re-enable when KO tracking is implemented

      // check faint tracking
      expect(keyActions.faints).toHaveLength(1);
      expect(keyActions.faints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            turn: 6,
            count: 1,
          }),
        ]),
      );

      // check my pokemon key actions
      expect(keyActions.pokemonKeyActions.byMe).toHaveLength(2);
      expect(keyActions.pokemonKeyActions.byMe).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'speed control',
            pokemonUsage: expect.arrayContaining([
              expect.objectContaining({ pokemon: 'Dragonite', count: 1 }),
              expect.objectContaining({ pokemon: 'Blastoise', count: 1 }),
              expect.objectContaining({ pokemon: 'Gengar', count: 1 }),
            ]) as unknown[],
            actionUsage: expect.arrayContaining([
              expect.objectContaining({ action: 'Tailwind', count: 1 }),
              expect.objectContaining({ action: 'Icy Wind', count: 2 }),
            ]) as unknown[],
          }),
          expect.objectContaining({
            name: 'field control',
            pokemonUsage: expect.arrayContaining([
              expect.objectContaining({ pokemon: 'Gengar', count: 1 }),
            ]) as unknown[],
            actionUsage: expect.arrayContaining([
              expect.objectContaining({ action: 'Psychic Terrain', count: 1 }),
            ]) as unknown[],
          }),
        ]),
      );

      // check rival pokemon key actions
      expect(keyActions.pokemonKeyActions.byRival).toHaveLength(2);
      expect(keyActions.pokemonKeyActions.byRival).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'weather control',
            pokemonUsage: expect.arrayContaining([
              expect.objectContaining({ pokemon: 'Lapras', count: 1 }),
            ]) as unknown[],
            actionUsage: expect.arrayContaining([
              expect.objectContaining({ action: 'Rain', count: 1 }),
            ]) as unknown[],
          }),
          expect.objectContaining({
            name: 'tera',
            pokemonUsage: expect.arrayContaining([
              expect.objectContaining({ pokemon: 'Gyarados', count: 1 }),
            ]) as unknown[],
            actionUsage: expect.arrayContaining([
              expect.objectContaining({ action: 'ground', count: 1 }),
            ]) as unknown[],
          }),
        ]),
      );
    });
  });
});
