import {
  AbilityName,
  Args,
  BattleArgName,
  EffectName,
  KWArgs,
  MoveName,
  PokemonIdent,
  PositionLetter,
  Protocol,
} from '@pkmn/protocol';

import { Action, Battle, CreateBattleData, Turn } from '@/src/types/api';
import { BattleDataSource } from '@/src/types/form';

interface ActionWithContext extends Action {
  flags?: {
    isMissingTargets?: boolean;
  };
}

export type BattleMetadata = Omit<CreateBattleData, 'turns' | 'result'>;
export type ParserType = BattleDataSource;

export interface BattleParser<T> {
  parserType: ParserType;
  parse(battle: BattleMetadata, rawData: T): CreateBattleData;
}

export const ActionKeyWords = {
  DAMAGE: 'damage',
  FORME: 'forme',
  CANT: 'cant',
  FAINTED: 'fainted',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  MISSED: 'missed',
  AFFECTED: 'affected',
  CURED: 'cured',
  BOOST_INCREASED: 'increased',
  BOOST_DECREASED: 'decreased',
  BOOST_CHANGED: 'changed',
  WEATHER: 'weather',
  STARTED: 'started',
  ENDED: 'ended',
  CRIT: 'critical',
  Z_MOVE: 'Z move',
  HIT: 'hit',
  TERA: 'terastallize',
  MEGA: 'megaevolved',
  PRIMAL: 'primal',
  ABILITY_CHANGED: 'ability changed',
  HEAL: 'heal',
  ACTIVATED: 'activated',
  UNKNOWN: 'unknown',
};

type Side = Exclude<Action['player'], undefined>;

interface SSPPContext {
  currTurnIndex: number;
  turns: Turn[];
  currActions: ActionWithContext[];
  usernameToPlayerMap: { [key: string]: Side | undefined };
  result?: Battle['result'];
  nicknameToPokemonMap: {
    [position in Side]: { [nickname: string]: string | undefined };
  };
  pokemonInPositionMap: {
    [position in Side]: { [position in PositionLetter]?: string };
  };
}

type CommandHandler = (
  lineData: (string | undefined)[],
  ctx: SSPPContext,
) => void;

interface FromData {
  from?: {
    type?: string;
    name?: string;
    raw?: string;
    fromName?: string;
  };
  inferredActionType: Action['type'];
}

type FromArg = AbilityName | MoveName | EffectName;

export class ShowdownSimProtocolParser
  implements BattleParser<string[] | string>
{
  parserType = 'showdown-sim-protocol' as const;

  protected commandHandlers: Record<string, CommandHandler> = {
    turn: (lineData, ctx) => {
      const { args } = this.parseLineData<'|turn|'>(lineData);
      const [_, rawTurnIndex] = args;
      const turnIndex = Number(rawTurnIndex) - 1;
      if (turnIndex > 1) {
        this.pushTurn(ctx);
      }
      ctx.currTurnIndex = turnIndex;
    },
    win: (lineData, ctx) => {
      const { args } = this.parseLineData<'|win|'>(lineData);
      const [_, winner] = args;
      if (!winner) {
        throw new CommandHandlerError('Winner is undefined', lineData, ctx);
      }
      const winnerPlayer = ctx.usernameToPlayerMap[winner];
      if (winnerPlayer === 'p1') {
        ctx.result = 'win';
      } else if (winnerPlayer === 'p2') {
        ctx.result = 'loose';
      }
      this.pushTurn(ctx);
    },
    player: (lineData, ctx) => {
      const { args } = this.parseLineData<'|player|'>(lineData);
      const [_, player, username] = args;
      if (!username) {
        throw new CommandHandlerError('Username is undefined', lineData, ctx);
      }
      ctx.usernameToPlayerMap[username] = player as 'p1' | 'p2';
    },
    tie: (_lineData, ctx) => {
      ctx.result = 'tie';
    },
    move: (lineData, ctx) => {
      const { args } = this.parseLineData<'|move|'>(lineData);
      const [_, rawPokemon, move, rawTarget] = args;
      const { player, pokemon } = this.parsePokemon(rawPokemon, ctx);
      let target: string | undefined = undefined;
      if (rawTarget && rawTarget !== 'null') {
        const { taggedPokemon: parsedTarget } = this.parsePokemon(
          rawTarget,
          ctx,
        );
        target = parsedTarget;
      }
      this.pushAction(
        {
          player,
          type: 'move',
          name: move ?? ActionKeyWords.UNKNOWN,
          user: pokemon ?? ActionKeyWords.UNKNOWN,
          targets: target ? [target] : [],
          flags: {
            isMissingTargets: !target,
          },
        },
        ctx,
      );
    },
    '-damage': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-damage|'>(lineData);
      const [_, rawPokemon, _rawHp] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      if (kwArgs.from && kwArgs.of) {
        const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
        const { taggedPokemon: ofPokemon } = this.parsePokemon(kwArgs.of, ctx);
        const fromName = from?.fromName;
        this.pushAction(
          {
            type,
            name: `${fromName ?? ActionKeyWords.UNKNOWN} inflicted ${ActionKeyWords.DAMAGE} to`,
            user: ofPokemon ?? '',
            targets: [taggedPokemon ?? ActionKeyWords.UNKNOWN],
          },
          ctx,
        );
      } else {
        const lastMoveAction = this.findLastMoveAction(ctx);
        if (
          lastMoveAction &&
          lastMoveAction.flags?.isMissingTargets &&
          taggedPokemon
        ) {
          lastMoveAction.targets.push(taggedPokemon);
        }
      }
    },
    switch: (lineData, ctx) => {
      this.registerPokemon('|switch|', lineData, ctx);
      this.pokemonSwitch('|switch|', lineData, ctx);
    },
    drag: (lineData, ctx) => {
      this.registerPokemon('|drag|', lineData, ctx);
      this.pokemonSwitch('|drag|', lineData, ctx);
    },
    detailschange: (lineData, ctx) =>
      this.registerFormeChange(
        '|detailschange|',
        'changed its forme to',
        lineData,
        ctx,
        {
          shouldIncludePlayer: true,
        },
      ),
    '-formechange': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-formechange|'>(lineData);
      const [_, rawPokemon, species] = args;
      const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
      const name = from?.fromName;
      const { pokemon, player } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          player,
          type,
          name: name ?? `changed its ${ActionKeyWords.FORME} to`,
          targets: [species ?? ActionKeyWords.UNKNOWN],
          user: pokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
      this.registerPokemon('|-formechange|', lineData, ctx);
    },
    replace: (lineData, ctx) =>
      this.registerFormeChange('|replace|', 'illusion ended', lineData, ctx),
    cant: (lineData, ctx) => {
      const { args } = this.parseLineData<'|cant|'>(lineData);
      const [_, rawPokemon, rawReason, move] = args;
      const reason = Protocol.parseEffect(rawReason);
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: reason.type === 'ability' ? 'ability' : 'effect',
          name: `${ActionKeyWords.CANT} not ${move} due to ${reason.name}`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    faint: (lineData, ctx) => {
      const { args } = this.parseLineData<'|faint|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: ActionKeyWords.FAINTED,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-fail': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-fail|'>(lineData);
      const [_, rawPokemon, action] = args;
      const { taggedPokemon: target } = this.parsePokemon(rawPokemon, ctx);
      const { user = ActionKeyWords.UNKNOWN } = ctx.currActions.at(-1) ?? {};
      this.pushAction(
        {
          type: 'effect',
          name: `${ActionKeyWords.FAILED} to ${action} against`,
          targets: [target ?? ActionKeyWords.UNKNOWN],
          user,
        },
        ctx,
      );
    },
    '-block': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-block|'>(lineData);
      const [_, rawTarget, rawBlockerEffect, blockedEffect, rawAttacker] = args;
      const blockerEffect = Protocol.parseEffect(rawBlockerEffect);
      const { taggedPokemon: attacker } = this.parsePokemon(rawAttacker, ctx);
      const { taggedPokemon } = this.parsePokemon(kwArgs.of ?? rawTarget, ctx);
      this.pushAction(
        {
          type: blockerEffect.type === 'ability' ? 'ability' : 'effect',
          name: `${blockerEffect.name} ${ActionKeyWords.BLOCKED} ${blockedEffect} from`,
          targets: attacker ? [attacker] : [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-miss': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-miss|'>(lineData);
      const [_, rawPokemon, rawTarget] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const { taggedPokemon: target } = this.parsePokemon(rawTarget, ctx);
      const lastAction = ctx.currActions.at(-1);
      let move = ActionKeyWords.UNKNOWN;
      if (lastAction && lastAction.type === 'move') {
        move = lastAction.name;
      }
      this.pushAction(
        {
          type: 'effect',
          name: `${ActionKeyWords.MISSED} ${move} against`,
          targets: target ? [target] : [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-status': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-status|'>(lineData);
      const [_, rawPokemon, status] = args;
      const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
      const fromName = from?.fromName;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const { taggedPokemon: user } = this.parsePokemon(kwArgs.of, ctx);
      this.pushAction(
        {
          type,
          name: fromName
            ? `${fromName} caused ${status} ${ActionKeyWords.AFFECTED}`
            : `${status} ${ActionKeyWords.AFFECTED}`,
          targets: [taggedPokemon ?? ActionKeyWords.UNKNOWN],
          user: user ?? '',
        },
        ctx,
      );
    },
    '-curestatus': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-curestatus|'>(lineData);
      const [_, rawPokemon, status] = args;
      const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
      const fromName = from?.fromName;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const { taggedPokemon: user } = this.parsePokemon(kwArgs.of, ctx);
      this.pushAction(
        {
          type,
          name: fromName
            ? `${fromName} ${ActionKeyWords.CURED} ${status}`
            : `${ActionKeyWords.CURED} from ${status}`,
          targets: fromName ? [taggedPokemon ?? ActionKeyWords.UNKNOWN] : [],
          user: fromName
            ? (user ?? '')
            : (taggedPokemon ?? ActionKeyWords.UNKNOWN),
        },
        ctx,
      );
    },
    '-boost': (lineData, ctx) =>
      this.boostChange(
        '|-boost|',
        `${ActionKeyWords.BOOST_INCREASED} by`,
        lineData,
        ctx,
      ),
    '-unboost': (lineData, ctx) =>
      this.boostChange(
        '|-unboost|',
        `${ActionKeyWords.BOOST_DECREASED} by`,
        lineData,
        ctx,
      ),
    '-setboost': (lineData, ctx) =>
      this.boostChange(
        '|-setboost|',
        `${ActionKeyWords.BOOST_CHANGED} to`,
        lineData,
        ctx,
      ),
    '-weather': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-weather|'>(lineData);
      const [_, weather] = args;
      if (kwArgs.upkeep) return;
      if (weather === 'none') {
        this.pushAction(
          {
            type: 'effect',
            name: `${ActionKeyWords.WEATHER} ${ActionKeyWords.ENDED}`,
            user: '',
            targets: [],
          },
          ctx,
        );
        return;
      }
      const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
      const { taggedPokemon: user } = this.parsePokemon(kwArgs.of, ctx);
      const fromName = from?.fromName;
      this.pushAction(
        {
          type,
          name:
            (fromName ? `${fromName} set ` : '') +
            `${ActionKeyWords.WEATHER} ${weather}`,
          user: user ?? '',
          targets: [],
        },
        ctx,
      );
    },
    '-fieldstart': (lineData, ctx) =>
      this.field('|-fieldstart|', ActionKeyWords.STARTED, lineData, ctx),
    '-fieldend': (lineData, ctx) =>
      this.field('|-fieldend|', ActionKeyWords.ENDED, lineData, ctx),
    '-sidestart': (lineData, ctx) =>
      this.side('|-sidestart|', ActionKeyWords.STARTED, lineData, ctx),
    '-sideend': (lineData, ctx) =>
      this.side('|-sideend|', ActionKeyWords.ENDED, lineData, ctx),
    '-start': (lineData, ctx) =>
      this.volatileEffect('|-start|', ActionKeyWords.STARTED, lineData, ctx),
    '-end': (lineData, ctx) =>
      this.volatileEffect('|-end|', ActionKeyWords.ENDED, lineData, ctx),
    '-crit': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-crit|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const lastMove = this.findLastMoveAction(ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `${ActionKeyWords.CRIT} hit`,
          targets: [taggedPokemon ?? ActionKeyWords.UNKNOWN],
          user: lastMove?.user ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-ability': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-ability|'>(lineData);
      const [_, rawPokemon, rawAbility] = args;
      const ability = Protocol.parseEffect(rawAbility);
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);

      if (kwArgs.from) {
        const { from } = this.parseFrom(kwArgs.from);
        this.pushAction(
          {
            type: 'effect',
            name: `${ActionKeyWords.ABILITY_CHANGED} to ${ability.name} due to ${from?.name ?? ActionKeyWords.UNKNOWN}`,
            targets: [],
            user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
          },
          ctx,
        );
        return;
      }

      this.pushAction(
        {
          type: 'ability',
          name: ability.name,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-zpower': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-zpower|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `used ${ActionKeyWords.Z_MOVE}`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-activate': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-activate|'>(lineData);
      const [_, rawPokemon, rawEffect] = args;
      const effect = Protocol.parseEffect(rawEffect);
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: effect.type === 'ability' ? 'ability' : 'effect',
          name: `${ActionKeyWords.ACTIVATED} ${effect.name}`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-hitcount': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-hitcount|'>(lineData);
      const [_, rawPokemon, num] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `${ActionKeyWords.HIT} ${num} times`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-heal': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-heal|'>(lineData);
      const [_, rawPokemon] = args;
      const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
      const fromName = from?.fromName;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const { taggedPokemon: ofPokemon } = this.parsePokemon(kwArgs.of, ctx);
      this.pushAction(
        {
          type,
          name: (fromName ? `${fromName} caused ` : '') + ActionKeyWords.HEAL,
          targets: fromName ? [taggedPokemon ?? ActionKeyWords.UNKNOWN] : [],
          user: ofPokemon ?? '',
        },
        ctx,
      );
    },
    '-terastallize': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-terastallize|'>(lineData);
      const [_, rawPokemon, teraType] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `${ActionKeyWords.TERA} to ${teraType}`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
    '-mega': (lineData, ctx) =>
      this.registerFormeChange('|-mega|', ActionKeyWords.MEGA, lineData, ctx, {
        shouldIncludePlayer: true,
      }),
    '-primal': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-primal|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `reverted to its ${ActionKeyWords.PRIMAL} forme`,
          targets: [],
          user: taggedPokemon ?? ActionKeyWords.UNKNOWN,
        },
        ctx,
      );
    },
  };

  parse(metadata: BattleMetadata, rawData: string[] | string) {
    const data = typeof rawData === 'string' ? rawData.split('\r\n') : rawData;
    const { turns, result } = this.parseTurns(data);
    const battle: CreateBattleData = {
      ...metadata,
      turns,
      result,
    };
    return battle;
  }

  protected parseTurns(data: string[]) {
    const ctx: SSPPContext = {
      currTurnIndex: 0,
      turns: [],
      currActions: [],
      usernameToPlayerMap: {},
      nicknameToPokemonMap: {
        p1: {},
        p2: {},
        p3: {},
        p4: {},
      },
      pokemonInPositionMap: {
        p1: {},
        p2: {},
        p3: {},
        p4: {},
      },
    };
    for (const line of data) {
      const [_, ...lineData] = line.split('|');
      const command = lineData[0];
      try {
        if (command in this.commandHandlers) {
          this.commandHandlers[command](lineData, ctx);
        }
      } catch (error) {
        console.warn('Failed to parse line', error);
      }
    }
    if (ctx.currActions.length) {
      console.warn('Some actions were not assigned');
    }
    return { turns: ctx.turns, result: ctx.result };
  }

  protected parseLineData<command extends BattleArgName>(
    lineData: (string | undefined)[],
  ) {
    const { args, kwArgs } = Protocol.parseBattleLine(
      ['', ...lineData].join('|'),
    ) as {
      args: Args[command];
      kwArgs: KWArgs[command];
    };
    return { args, kwArgs };
  }

  protected pushTurn(ctx: SSPPContext) {
    ctx.turns.push({
      index: ctx.currTurnIndex,
      actions: ctx.currActions,
    });
    ctx.currActions = [];
  }

  protected pushAction(
    action: Omit<ActionWithContext, 'index'>,
    ctx: SSPPContext,
  ) {
    const index = ctx.currActions.length;
    ctx.currActions.push({
      index,
      ...action,
    });
  }

  protected findLastMoveAction(ctx: SSPPContext) {
    for (let index = 0; index < ctx.currActions.length; index++) {
      if (ctx.currActions.at(-(index + 1))?.type === 'move') {
        return ctx.currActions.at(-(index + 1));
      }
    }
    return undefined;
  }

  protected parsePokemon(
    rawPokemon: PokemonIdent | '' | undefined,
    ctx: SSPPContext,
  ) {
    if (!rawPokemon) {
      return {
        player: undefined,
        pokemon: undefined,
        taggedPokemon: undefined,
        position: undefined,
      };
    }
    const {
      player,
      name: nameOrNickname,
      position,
    } = Protocol.parsePokemonIdent(rawPokemon);
    const pokemon =
      ctx.nicknameToPokemonMap[player][nameOrNickname] ?? nameOrNickname;
    return { player, pokemon, taggedPokemon: `${player}:${pokemon}`, position };
  }

  protected parseFrom(from: FromArg | undefined) {
    const result: FromData = {
      inferredActionType: 'effect',
      from: undefined,
    };
    if (from) {
      const { type, name } = Protocol.parseEffect(from);
      result.from = {
        type,
        name,
        raw: from,
      };
      result.inferredActionType = this.getTypeFrom(result);
      result.from.fromName =
        result.inferredActionType === 'ability'
          ? result.from.name
          : result.from.raw;
    }
    return result;
  }

  protected registerPokemon<
    command extends
      | '|switch|'
      | '|drag|'
      | '|-formechange|'
      | '|detailschange|'
      | '|replace|'
      | '|-mega|',
  >(_command: command, lineData: (string | undefined)[], ctx: SSPPContext) {
    const { args } = this.parseLineData<command>(lineData);
    const [_, rawPokemon, detailsOrSpecies] = args;
    if (!rawPokemon || !detailsOrSpecies) {
      throw new CommandHandlerError(
        'pokemon or details is undefined',
        lineData,
        ctx,
      );
    }
    const { player, pokemon: nameOrNickname } = this.parsePokemon(
      rawPokemon,
      ctx,
    );
    let species = undefined;
    if (detailsOrSpecies.__brand === 'SpeciesName') {
      species = detailsOrSpecies;
    } else {
      const { speciesForme } = Protocol.parseDetails(
        nameOrNickname ?? '',
        rawPokemon,
        detailsOrSpecies,
      );
      species = speciesForme;
    }
    if (player && nameOrNickname) {
      ctx.nicknameToPokemonMap[player][nameOrNickname] =
        species ?? nameOrNickname;
    } else {
      console.warn('Failed to register pokemon', lineData);
    }
  }

  protected registerFormeChange<
    command extends '|detailschange|' | '|replace|' | '|-mega|',
  >(
    _command: command,
    reason: string,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
    options: { shouldIncludePlayer?: boolean } = {},
  ) {
    const { args } = this.parseLineData<command>(lineData);
    const [_, rawPokemon, detailsOrSpecies] = args;
    if (!rawPokemon) {
      throw new CommandHandlerError('pokemon is undefined', lineData, ctx);
    }
    const { player, taggedPokemon, pokemon } = this.parsePokemon(
      rawPokemon,
      ctx,
    );
    let species = undefined;
    if (detailsOrSpecies.__brand === 'SpeciesName') {
      species = detailsOrSpecies;
    } else {
      const { speciesForme } = Protocol.parseDetails(
        pokemon ?? '',
        rawPokemon,
        detailsOrSpecies,
      );
      species = speciesForme;
    }
    this.pushAction(
      {
        player: options.shouldIncludePlayer ? player : undefined,
        type: 'effect',
        name: reason,
        targets: [species],
        user:
          (options.shouldIncludePlayer ? pokemon : taggedPokemon) ??
          ActionKeyWords.UNKNOWN,
      },
      ctx,
    );
    this.registerPokemon<command>(_command, lineData, ctx);
  }

  protected boostChange<
    command extends '|-boost|' | '|-unboost|' | '|-setboost|',
  >(
    _command: command,
    label: string,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
  ) {
    const { args, kwArgs } = this.parseLineData<command>(lineData);
    const [_, rawPokemon, stat, amount] = args;
    const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
    const fromName = from?.fromName;
    const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
    const { taggedPokemon: ofPokemon } = this.parsePokemon(kwArgs.of, ctx);
    this.pushAction(
      {
        type,
        name: fromName
          ? `${fromName} caused ${stat} ${label} ${amount} to`
          : `${stat} ${label} ${amount}`,
        targets: fromName ? [taggedPokemon ?? ActionKeyWords.UNKNOWN] : [],
        user: fromName
          ? (ofPokemon ?? '')
          : (taggedPokemon ?? ActionKeyWords.UNKNOWN),
      },
      ctx,
    );
  }

  protected volatileEffect<command extends '|-start|' | '|-end|'>(
    _command: command,
    label: string,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
  ) {
    const { args, kwArgs } = this.parseLineData<command>(lineData);
    const [_, rawPokemon, rawEffect] = args;
    const { from, inferredActionType } = this.parseFrom(kwArgs.from);
    const fromName = from?.fromName;
    const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
    const { taggedPokemon: ofPokemon } = this.parsePokemon(kwArgs.of, ctx);
    const effect = Protocol.parseEffect(rawEffect);
    this.pushAction(
      {
        type: effect.type === 'ability' ? 'ability' : inferredActionType,
        name:
          (fromName ? `${fromName} caused ` : '') +
          `${effect.name} ${label} on`,
        targets: [taggedPokemon ?? ActionKeyWords.UNKNOWN],
        user: ofPokemon ?? '',
      },
      ctx,
    );
  }

  protected field<command extends '|-fieldstart|' | '|-fieldend|'>(
    _command: command,
    label: string,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
  ) {
    const { args, kwArgs } = this.parseLineData<command>(lineData);
    const [_, condition] = args;
    const { from, inferredActionType: type } = this.parseFrom(kwArgs.from);
    const fromName = from?.fromName;
    const { taggedPokemon: ofPokemon } = this.parsePokemon(kwArgs.of, ctx);
    this.pushAction(
      {
        type,
        name: (fromName ? `${fromName} caused ` : '') + `${condition} ${label}`,
        user: ofPokemon ?? '',
        targets: [],
      },
      ctx,
    );
  }

  protected side<command extends '|-sidestart|' | '|-sideend|'>(
    _command: command,
    label: string,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
  ) {
    const { args } = this.parseLineData<command>(lineData);
    const [_, side, condition] = args;
    this.pushAction(
      {
        type: 'effect',
        name: `${condition} ${label} for ${side}`,
        user: '',
        targets: [],
      },
      ctx,
    );
  }

  protected getTypeFrom(data: FromData): Action['type'] {
    return data.from?.type === 'ability' ? 'ability' : 'effect';
  }

  protected pokemonSwitch<command extends '|switch|' | '|drag|'>(
    _command: command,
    lineData: (string | undefined)[],
    ctx: SSPPContext,
  ) {
    const { args } = this.parseLineData<command>(lineData);
    const [_, rawPokemon] = args;
    const { pokemon, player, position } = this.parsePokemon(rawPokemon, ctx);
    let prevPokemon: string | undefined = undefined;
    if (player && position) {
      prevPokemon = ctx.pokemonInPositionMap[player][position];
    }
    this.pushAction(
      {
        player,
        type: 'switch',
        name: 'to',
        user: prevPokemon ?? '',
        targets: [pokemon ?? ActionKeyWords.UNKNOWN],
      },
      ctx,
    );
    if (player && position) {
      ctx.pokemonInPositionMap[player][position] = pokemon;
    }
  }
}

export class CommandHandlerError extends Error {
  lineData?: (string | undefined)[];
  ctx?: SSPPContext;

  constructor(
    message: string,
    lineData?: (string | undefined)[],
    ctx?: SSPPContext,
  ) {
    super(message);
    this.lineData = lineData;
    this.ctx = ctx;
  }
}

export default class BattleParserFactory {
  static parsers: Record<ParserType, BattleParser<string[] | string>> = {
    'showdown-sim-protocol': new ShowdownSimProtocolParser(),
  };

  static getParser(parserType: ParserType) {
    return BattleParserFactory.parsers[parserType];
  }
}
