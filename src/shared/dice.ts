export type DiceRollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRollOptions {
  mode?: DiceRollMode;
  rerollOnes?: boolean;
  random?: () => number;
}

export interface DiceDieResult {
  sides: number;
  kept: number;
  rolls: number[];
  rerolledOnes: number[];
}

export interface DiceTermResult {
  sign: 1 | -1;
  notation: string;
  total: number;
  dice?: DiceDieResult[];
  constant?: number;
}

export interface DiceRollResult {
  expression: string;
  normalized: string;
  total: number;
  terms: DiceTermResult[];
}

type ParsedTerm = { sign: 1 | -1; count?: number; sides?: number; constant?: number; notation: string };

export function rollDiceExpression(expression: string, options: DiceRollOptions = {}): DiceRollResult {
  const terms = parseDiceExpression(expression);
  const random = options.random || Math.random;
  const mode = options.mode || 'normal';
  const resultTerms = terms.map(term => {
    if (typeof term.constant === 'number') {
      return {
        sign: term.sign,
        notation: term.notation,
        constant: term.constant,
        total: term.sign * term.constant
      };
    }

    const dice = Array.from({ length: term.count || 1 }, () => rollOneDie(term.sides || 20, mode, Boolean(options.rerollOnes), random));
    const unsignedTotal = dice.reduce((sum, die) => sum + die.kept, 0);
    return {
      sign: term.sign,
      notation: term.notation,
      dice,
      total: term.sign * unsignedTotal
    };
  });

  return {
    expression,
    normalized: terms.map(term => `${term.sign < 0 ? '-' : '+'}${term.notation}`).join('').replace(/^\+/, ''),
    total: resultTerms.reduce((sum, term) => sum + term.total, 0),
    terms: resultTerms
  };
}

export function parseDiceExpression(expression: string): ParsedTerm[] {
  const source = expression.replace(/\s+/g, '').toLowerCase();
  if (!source) throw new Error('Enter a dice expression.');
  const parts = source.match(/[+-]?[^+-]+/g);
  if (!parts) throw new Error('Enter a dice expression.');

  return parts.map(part => {
    const sign: 1 | -1 = part.startsWith('-') ? -1 : 1;
    const body = part.replace(/^[+-]/, '');
    const dice = body.match(/^(\d*)d(\d+)$/);
    if (dice) {
      const count = dice[1] ? Number(dice[1]) : 1;
      const sides = Number(dice[2]);
      if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Dice count must be 1-100.');
      if (!Number.isInteger(sides) || sides < 2 || sides > 1000) throw new Error('Dice sides must be 2-1000.');
      return { sign, count, sides, notation: `${count}d${sides}` };
    }

    const constant = Number(body);
    if (Number.isInteger(constant)) return { sign, constant, notation: String(constant) };
    throw new Error(`Cannot parse "${part}".`);
  });
}

export function successChancePercent(dc: number, bonus: number) {
  if (!Number.isFinite(dc)) return null;
  let successes = 0;
  for (let roll = 1; roll <= 20; roll += 1) {
    if (roll === 1) continue;
    if (roll === 20 || roll + bonus >= dc) successes += 1;
  }
  return Math.round((successes / 20) * 100);
}

function rollOneDie(sides: number, mode: DiceRollMode, rerollOnes: boolean, random: () => number): DiceDieResult {
  const rolls = [rollNatural(sides, rerollOnes, random)];
  if (mode !== 'normal') rolls.push(rollNatural(sides, rerollOnes, random));
  const kept = mode === 'advantage' ? Math.max(...rolls.map(item => item.kept)) : mode === 'disadvantage' ? Math.min(...rolls.map(item => item.kept)) : rolls[0].kept;
  return {
    sides,
    kept,
    rolls: rolls.map(item => item.original),
    rerolledOnes: rolls.flatMap(item => item.rerolledOnes)
  };
}

function rollNatural(sides: number, rerollOnes: boolean, random: () => number) {
  const original = Math.floor(random() * sides) + 1;
  if (rerollOnes && original === 1) {
    const reroll = Math.floor(random() * sides) + 1;
    return { original, kept: reroll, rerolledOnes: [reroll] };
  }
  return { original, kept: original, rerolledOnes: [] };
}
