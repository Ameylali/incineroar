import { BattleMetadata, ShowdownSimProtocolParser } from './battle';

const defaultLines = (lines: string[]) => {
  return [
    '|start',
    '|',
    '|player|p1|usernamePlayerA|169|1051',
    '|player|p2|usernamePlayerB|pokekid|1040',
    '|turn|1',
    ...lines,
    '|win|usernamePlayerA',
  ];
};

describe('BattleParser', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ShowdownSimProtocolParser', () => {
    const parser = new ShowdownSimProtocolParser();
    const metadata: BattleMetadata = {
      name: '',
      notes: '',
    };

    beforeAll(() => {});

    it('should resolve winner', () => {
      const linesWin = defaultLines([]);
      const battleA = parser.parse(metadata, linesWin);
      expect(battleA.result).toEqual('win');

      const linesLoose = [
        '|start',
        '|',
        '|player|p1|usernamePlayerA|169|1051',
        '|player|p2|usernamePlayerB|pokekid|1040',
        '|win|usernamePlayerB',
      ];
      const battleB = parser.parse(metadata, linesLoose);
      expect(battleB.result).toEqual('loose');
    });

    it('should resolve tie', () => {
      const lines = [
        '|start',
        '|',
        '|player|p1|usernamePlayerA|169|1051',
        '|player|p2|usernamePlayerB|pokekid|1040',
        '|tie',
      ];
      const battle = parser.parse(metadata, lines);
      expect(battle.result).toEqual('tie');
    });

    it('should log move with targets', () => {
      const lines = defaultLines(['|move|p2a: PokemonB|move A|p1a: PokemonA']);
      const battle = parser.parse(metadata, lines);
      const moveAction = battle.turns[0].actions[0];
      expect(moveAction.type).toEqual('move');
      expect(moveAction.player).toEqual('p2');
      expect(moveAction.name).toEqual('move A');
      expect(moveAction.user).toEqual('PokemonB');
      expect(moveAction.targets).toMatchObject(['p1:PokemonA']);
    });

    it('should inferr move target from damage command', () => {
      const lines = defaultLines([
        '|move|p1a: PokemonA|earthquake|',
        '|-damage|p2a: PokemonB|86\/249 ps',
      ]);
      const battle = parser.parse(metadata, lines);
      const moveAction = battle.turns[0].actions[0];
      expect(moveAction.type).toEqual('move');
      expect(moveAction.player).toEqual('p1');
      expect(moveAction.name).toEqual('earthquake');
      expect(moveAction.user).toEqual('PokemonA');
      expect(moveAction.targets).toMatchObject(['p2:PokemonB']);
    });

    it('should log pokemon detailschange', () => {
      const lines = defaultLines([
        '|detailschange|p1a: PokemonA|NewForme-PokemonA, L50, M, shiny',
        '|move|p1a: PokemonA|earthquake|',
      ]);
      const battle = parser.parse(metadata, lines);
      const megaevolutionAction = battle.turns[0].actions[0];
      expect(megaevolutionAction.type).toEqual('effect');
      expect(megaevolutionAction.player).toEqual('p1');
      expect(megaevolutionAction.name).toEqual('changed its forme to');
      expect(megaevolutionAction.user).toEqual('PokemonA');
      expect(megaevolutionAction.targets).toMatchObject(['NewForme-PokemonA']);
    });

    it('should log pokemon forme change from ability', () => {
      const lines = defaultLines([
        '|-formechange|p1a: Minior|Minior-Meteor||[from] ability: Shields Down',
      ]);
      const battle = parser.parse(metadata, lines);
      const abilityAction = battle.turns[0].actions[0];
      expect(abilityAction.type).toEqual('ability');
      expect(abilityAction.name).toEqual('Shields Down');
      expect(abilityAction.user).toEqual('p1:Minior');
      expect(abilityAction.targets).toMatchObject(['Minior-Meteor']);
    });

    it('should log fainted pokemon', () => {
      const lines = defaultLines(['|faint|p2a: Pikachu']);
      const battle = parser.parse(metadata, lines);
      const abilityAction = battle.turns[0].actions[0];
      expect(abilityAction.type).toEqual('effect');
      expect(abilityAction.name).toEqual('fainted');
      expect(abilityAction.user).toEqual('p2:Pikachu');
      expect(abilityAction.targets).toMatchObject([]);
    });

    it('should log inflicted status', () => {
      const lines = defaultLines(['|-status|p1a: Tauros|psn']);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('effect');
      expect(action.name).toEqual('psn affected');
      expect(action.user).toEqual('');
      expect(action.targets).toMatchObject(['p1:Tauros']);
    });

    it('should log inflicted status from ability', () => {
      const lines = defaultLines([
        '|-status|p1a: Tauros|burn|[from] ability: Flame body|[of] p2b: Volcarona',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('ability');
      expect(action.name).toEqual('Flame body caused burn affected');
      expect(action.user).toEqual('p2:Volcarona');
      expect(action.targets).toMatchObject(['p1:Tauros']);
    });

    it('should log boost change', () => {
      const lines = defaultLines([' |-boost|p1a: Quaquaval|spd|1']);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('effect');
      expect(action.name).toEqual('spd increased by 1');
      expect(action.user).toEqual('p1:Quaquaval');
      expect(action.targets).toMatchObject([]);
    });

    it('should log boost change from ability', () => {
      const lines = defaultLines([
        ' |-unboost|p1a: Quaquaval|atk|1|[from] ability: Intimidate|[of] p2b: Incineroar',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('ability');
      expect(action.name).toEqual('Intimidate caused atk decreased by 1 to');
      expect(action.user).toEqual('p2:Incineroar');
      expect(action.targets).toMatchObject(['p1:Quaquaval']);
    });

    it('should log weather change from ability', () => {
      const lines = defaultLines([
        '|-weather|RainDance|[from] ability: Drizzle|[of] p1a: Pelipper',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('ability');
      expect(action.name).toEqual('Drizzle set weather RainDance');
      expect(action.user).toEqual('p1:Pelipper');
      expect(action.targets).toMatchObject([]);
    });

    it('should log field change from ability', () => {
      const lines = defaultLines([
        '|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p2b: Rillaboom',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('ability');
      expect(action.name).toEqual(
        'Grassy Surge caused move: Grassy Terrain started',
      );
      expect(action.user).toEqual('p2:Rillaboom');
      expect(action.targets).toMatchObject([]);
    });

    it('should log critical move with user', () => {
      const lines = defaultLines([
        '|move|p2a: PokemonB|move A|p1a: PokemonA',
        '|-crit|p1a: PokemonA',
      ]);
      const battle = parser.parse(metadata, lines);
      const moveAction = battle.turns[0].actions[0];
      expect(moveAction.type).toEqual('move');
      expect(moveAction.player).toEqual('p2');
      expect(moveAction.name).toEqual('move A');
      expect(moveAction.user).toEqual('PokemonB');
      expect(moveAction.targets).toMatchObject(['p1:PokemonA']);

      const critAction = battle.turns[0].actions[1];
      expect(critAction.type).toEqual('effect');
      expect(critAction.name).toEqual('critical hit');
      expect(critAction.user).toEqual('PokemonB');
      expect(critAction.targets).toMatchObject(['p1:PokemonA']);
    });

    it('should log heal from item', () => {
      const lines = defaultLines([
        '|-heal|p1a: Muk|8\/100|[from] item: Leftovers',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('effect');
      expect(action.name).toEqual('item: Leftovers caused heal');
      expect(action.user).toEqual('');
      expect(action.targets).toMatchObject(['p1:Muk']);
    });

    it('should log heal from ability', () => {
      const lines = defaultLines([
        '|-heal|p1a: Muk|8\/100|[from] ability: Water absorb|[of] p1b: Vaporeon',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('ability');
      expect(action.name).toEqual('Water absorb caused heal');
      // NOTE: For some reason of parameter is being ignored
      expect(action.user).toEqual('');
      expect(action.targets).toMatchObject(['p1:Muk']);
    });

    it('should log teratype', () => {
      const lines = defaultLines(['|-terastallize|p1a: Dragonite|Steel|']);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('effect');
      expect(action.name).toEqual('terastallize to Steel');
      expect(action.user).toEqual('p1:Dragonite');
      expect(action.targets).toMatchObject([]);
    });

    it('should log pokemon switch', () => {
      const lines = defaultLines([
        '|switch|p1a: Ursaluna|Ursaluna-Bloodmoon, L50, M, 100\/100|',
        '|switch|p1a: Dragonite|Dragonite, L50, M, 100\/100|',
      ]);
      const battle = parser.parse(metadata, lines);
      const switchAction1 = battle.turns[0].actions[0];
      expect(switchAction1.player).toEqual('p1');
      expect(switchAction1.type).toEqual('switch');
      expect(switchAction1.name).toEqual('to');
      expect(switchAction1.user).toEqual('');
      expect(switchAction1.targets).toMatchObject(['Ursaluna-Bloodmoon']);

      const switchAction2 = battle.turns[0].actions[1];
      expect(switchAction2.player).toEqual('p1');
      expect(switchAction2.type).toEqual('switch');
      expect(switchAction2.name).toEqual('to');
      expect(switchAction2.user).toEqual('Ursaluna-Bloodmoon');
      expect(switchAction2.targets).toMatchObject(['Dragonite']);
    });

    it('should log ability change', () => {
      const lines = defaultLines([
        '|-ability|p1a: Primarina|Torrent|[from] ability: Neutralizing Gas',
      ]);
      const battle = parser.parse(metadata, lines);
      const action = battle.turns[0].actions[0];
      expect(action.type).toEqual('effect');
      expect(action.name).toEqual(
        'ability changed to Torrent due to Neutralizing Gas',
      );
      expect(action.user).toEqual('p1:Primarina');
      expect(action.targets).toMatchObject([]);
    });

    it('should log megaevolution from |-mega| command', () => {
      const lines = defaultLines([
        '|-mega|p1a: Lucario|Mega-Lucario, L50, M, shiny',
      ]);
      const battle = parser.parse(metadata, lines);
      const megaevolutionAction = battle.turns[0].actions[0];
      expect(megaevolutionAction.type).toEqual('effect');
      expect(megaevolutionAction.player).toEqual('p1');
      expect(megaevolutionAction.name).toEqual('megaevolved');
      expect(megaevolutionAction.user).toEqual('Lucario');
      expect(megaevolutionAction.targets).toMatchObject(['Mega-Lucario']);
    });

    it('should log primal', () => {
      const lines = defaultLines(['|-primal|p1a: Groundon']);
      const battle = parser.parse(metadata, lines);
      const megaevolutionAction = battle.turns[0].actions[0];
      expect(megaevolutionAction.type).toEqual('effect');
      expect(megaevolutionAction.name).toEqual('reverted to its primal forme');
      expect(megaevolutionAction.user).toEqual('p1:Groundon');
      expect(megaevolutionAction.targets).toMatchObject([]);
    });

    // TODO: Medium priority
    it.todo('should log heal cure team');
    it.todo('should log item');
    it.todo('should log enditem');

    // TODO: Low priority
    it.todo('should log z-move');
    it.todo('should log dynamax');
    it.todo('should log inverboost');
    it.todo('should log swapboost');
    it.todo('should log clearboost');
    it.todo('should log clearallboost');
    it.todo('should log clearpositiveboost');
    it.todo('should log clearnegativeboost');
    it.todo('should log copyboost');
    it.todo('should log swapsideconditions');
    it.todo('should log endability');
    it.todo('should log transform');
    it.todo('should log burst');
  });
});
