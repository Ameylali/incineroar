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

interface ActionWithContext extends Action {
  flags?: {
    isMissingTargets?: boolean;
  };
}

export type BattleMetadata = Omit<CreateBattleData, 'turns' | 'result'>;
export type ParserType = 'showdown-sim-protocol';

export interface BattleParser<T> {
  parserType: ParserType;
  parse(battle: BattleMetadata, rawData: T): CreateBattleData;
}

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

export class ShowdownSimProtocolParser implements BattleParser<string[]> {
  parserType = 'showdown-sim-protocol' as const;

  protected commandHandlers: Record<string, CommandHandler> = {
    turn: (lineData, ctx) => {
      const { args } = this.parseLineData<'|turn|'>(lineData);
      const [_, rawTurnIndex] = args;
      const turnIndex = Number(rawTurnIndex);
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
          name: move ?? 'unknown',
          user: pokemon ?? 'unknown',
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
            name: `${fromName ?? 'unknown'} inflicted damage to`,
            user: ofPokemon ?? '',
            targets: [taggedPokemon ?? 'unknown'],
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
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type,
          name: name ?? 'changed its forme to',
          targets: [species ?? 'unknown'],
          user: taggedPokemon ?? 'unknown',
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
          name: `cant not ${move} due to ${reason.name}`,
          targets: [],
          user: taggedPokemon ?? 'unknown',
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
          name: 'fainted',
          targets: [],
          user: taggedPokemon ?? 'unknown',
        },
        ctx,
      );
    },
    '-fail': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-fail|'>(lineData);
      const [_, rawPokemon, action] = args;
      const { pokemon: target } = this.parsePokemon(rawPokemon, ctx);
      const { user = 'unknown' } = ctx.currActions.at(-1) ?? {};
      this.pushAction(
        {
          type: 'effect',
          name: `failed to ${action} against`,
          targets: [target ?? 'unknown'],
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
          name: `${blockerEffect.name} blocked ${blockedEffect} from`,
          targets: attacker ? [attacker] : [],
          user: taggedPokemon ?? 'unknown',
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
      let move = 'unknown';
      if (lastAction && lastAction.type === 'move') {
        move = lastAction.name;
      }
      this.pushAction(
        {
          type: 'effect',
          name: `missed ${move} against`,
          targets: target ? [target] : [],
          user: taggedPokemon ?? 'unknown',
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
            ? `${fromName} inflicted ${status}`
            : `${status} affected`,
          targets: [taggedPokemon ?? 'unknown'],
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
            ? `${fromName} cured ${status}`
            : `recovered from ${status}`,
          targets: fromName ? [taggedPokemon ?? 'unknown'] : [],
          user: fromName ? (user ?? '') : (taggedPokemon ?? 'unknown'),
        },
        ctx,
      );
    },
    '-boost': (lineData, ctx) =>
      this.boostChange('|-boost|', 'increased by', lineData, ctx),
    '-unboost': (lineData, ctx) =>
      this.boostChange('|-unboost|', 'decreased by', lineData, ctx),
    '-setboost': (lineData, ctx) =>
      this.boostChange('|-setboost|', 'changed to', lineData, ctx),
    '-weather': (lineData, ctx) => {
      const { args, kwArgs } = this.parseLineData<'|-weather|'>(lineData);
      const [_, weather] = args;
      if (kwArgs.upkeep) return;
      if (weather === 'none') {
        this.pushAction(
          {
            type: 'effect',
            name: 'weather ended',
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
          name: (fromName ? `${fromName} set ` : '') + `weather ${weather}`,
          user: user ?? '',
          targets: [],
        },
        ctx,
      );
    },
    '-fieldstart': (lineData, ctx) =>
      this.field('|-fieldstart|', 'started', lineData, ctx),
    '-fieldend': (lineData, ctx) =>
      this.field('|-fieldend|', 'ended', lineData, ctx),
    '-sidestart': (lineData, ctx) =>
      this.side('|-sidestart|', 'started', lineData, ctx),
    '-sideend': (lineData, ctx) =>
      this.side('|-sideend|', 'ended', lineData, ctx),
    '-start': (lineData, ctx) =>
      this.volatileEffect('|-start|', 'started', lineData, ctx),
    '-end': (lineData, ctx) =>
      this.volatileEffect('|-end|', 'ended', lineData, ctx),
    '-crit': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-crit|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      const lastMove = this.findLastMoveAction(ctx);
      this.pushAction(
        {
          type: 'effect',
          name: 'critical hit',
          targets: [taggedPokemon ?? 'unknown'],
          user: lastMove?.user ?? 'unknown',
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
            name: `ability changed to ${ability.name} due to ${from?.name ?? 'unknown'}`,
            targets: [],
            user: taggedPokemon ?? 'unknown',
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
          user: taggedPokemon ?? 'unknown',
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
          name: 'used Z move',
          targets: [],
          user: taggedPokemon ?? 'unknown',
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
          name: `activated ${effect.name}`,
          targets: [],
          user: taggedPokemon ?? 'unknown',
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
          name: `hit ${num} times`,
          targets: [],
          user: taggedPokemon ?? 'unknown',
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
          name: (fromName ? `${fromName} caused ` : '') + 'heal',
          targets: fromName ? [taggedPokemon ?? 'unknown'] : [],
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
          name: `terastallize to ${teraType}`,
          targets: [],
          user: taggedPokemon ?? 'unknown',
        },
        ctx,
      );
    },
    '-mega': (lineData, ctx) =>
      this.registerFormeChange('|-mega|', 'megaevolved', lineData, ctx, {
        shouldIncludePlayer: true,
      }),
    '-primal': (lineData, ctx) => {
      const { args } = this.parseLineData<'|-primal|'>(lineData);
      const [_, rawPokemon] = args;
      const { taggedPokemon } = this.parsePokemon(rawPokemon, ctx);
      this.pushAction(
        {
          type: 'effect',
          name: `reverted to its primal forme`,
          targets: [],
          user: taggedPokemon ?? 'unknown',
        },
        ctx,
      );
    },
  };

  parse(metadata: BattleMetadata, data: string[]) {
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
          (options.shouldIncludePlayer ? pokemon : taggedPokemon) ?? 'unknown',
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
        targets: fromName ? [taggedPokemon ?? 'unknown'] : [],
        user: fromName ? (ofPokemon ?? '') : (taggedPokemon ?? 'unknown'),
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
        targets: [taggedPokemon ?? 'unknown'],
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
        targets: [pokemon ?? 'unknown'],
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
