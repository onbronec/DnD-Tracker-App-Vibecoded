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

export type ParsedTerm = { sign: 1 | -1; count?: number; sides?: number; constant?: number; notation: string };

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

type Token =
  | { type: 'number'; value: number }
  | { type: 'dice'; count: number; sides: number }
  | { type: 'plus' }
  | { type: 'minus' }
  | { type: 'mul' }
  | { type: 'lparen' }
  | { type: 'rparen' };

export function parseDiceExpression(expression: string): ParsedTerm[] {
  const source = expression.replace(/\s+/g, '').replace(/[×⋅]/g, '*').replace(/[−–—]/g, '-').toLowerCase();
  if (!source) throw new Error('Enter a dice expression.');

  const tokens = tokenizeDiceExpression(source);
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseExpr(): ParsedTerm[] {
    let left = parseMul();
    while (peek()?.type === 'plus' || peek()?.type === 'minus') {
      const op = consume();
      const right = parseMul();
      if (op.type === 'minus') {
        left = [...left, ...negateTerms(right)];
      } else {
        left = [...left, ...right];
      }
    }
    return left;
  }

  function parseMul(): ParsedTerm[] {
    let left = parseUnary();
    while (peek()?.type === 'mul') {
      consume();
      const right = parseUnary();
      left = multiplyTerms(left, right);
    }
    return left;
  }

  function parseUnary(): ParsedTerm[] {
    const next = peek();
    if (next?.type === 'plus') {
      consume();
      return parseUnary();
    }
    if (next?.type === 'minus') {
      consume();
      return negateTerms(parseUnary());
    }
    return parsePrimary();
  }

  function parsePrimary(): ParsedTerm[] {
    const token = peek();
    if (!token) throw new Error('Unexpected end of expression.');
    if (token.type === 'lparen') {
      consume();
      if (peek()?.type === 'rparen') throw new Error('Empty parentheses are not allowed.');
      const inner = parseExpr();
      if (peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis.');
      consume();
      return inner;
    }
    if (token.type === 'dice') {
      consume();
      validateDiceLimits(token.count, token.sides);
      return [{ sign: 1, count: token.count, sides: token.sides, notation: `${token.count}d${token.sides}` }];
    }
    if (token.type === 'number') {
      consume();
      return [{ sign: 1, constant: token.value, notation: String(token.value) }];
    }
    throw new Error(`Unexpected token in "${expression}".`);
  }

  const result = parseExpr();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token in "${expression}".`);
  }
  if (result.length === 0) {
    throw new Error('Enter a dice expression.');
  }
  return result;
}

function tokenizeDiceExpression(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const ch = source[index];
    if (ch === '+') {
      tokens.push({ type: 'plus' });
      index += 1;
      continue;
    }
    if (ch === '-') {
      tokens.push({ type: 'minus' });
      index += 1;
      continue;
    }
    if (ch === '*') {
      tokens.push({ type: 'mul' });
      index += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      index += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      index += 1;
      continue;
    }

    const remaining = source.slice(index);
    const diceMatch = remaining.match(/^(\d*)d(\d+)/);
    if (diceMatch) {
      const count = diceMatch[1] ? Number(diceMatch[1]) : 1;
      const sides = Number(diceMatch[2]);
      tokens.push({ type: 'dice', count, sides });
      index += diceMatch[0].length;
      continue;
    }

    const numMatch = remaining.match(/^\d+/);
    if (numMatch) {
      tokens.push({ type: 'number', value: Number(numMatch[0]) });
      index += numMatch[0].length;
      continue;
    }

    throw new Error(`Cannot parse "${remaining}".`);
  }

  return tokens;
}

function validateDiceLimits(count: number, sides: number) {
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Dice count must be 1-100.');
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) throw new Error('Dice sides must be 2-1000.');
}

function negateTerms(terms: ParsedTerm[]): ParsedTerm[] {
  return terms.map(term => ({
    ...term,
    sign: (term.sign * -1) as 1 | -1
  }));
}

function isPureConstant(terms: ParsedTerm[]): boolean {
  return terms.every(term => typeof term.constant === 'number' && !term.sides);
}

function evaluateConstantSum(terms: ParsedTerm[]): number {
  return terms.reduce((sum, term) => sum + term.sign * (term.constant || 0), 0);
}

function multiplyTerms(left: ParsedTerm[], right: ParsedTerm[]): ParsedTerm[] {
  const leftIsConst = isPureConstant(left);
  const rightIsConst = isPureConstant(right);

  if (!leftIsConst && !rightIsConst) {
    throw new Error('Cannot multiply two dice expressions together.');
  }

  if (leftIsConst && rightIsConst && left.length === 1 && right.length === 1) {
    const val = evaluateConstantSum(left) * evaluateConstantSum(right);
    const sign: 1 | -1 = val < 0 ? -1 : 1;
    const abs = Math.abs(val);
    return [{ sign, constant: abs, notation: String(abs) }];
  }

  const scalar = leftIsConst ? evaluateConstantSum(left) : evaluateConstantSum(right);
  const target = leftIsConst ? right : left;

  if (!Number.isInteger(scalar)) {
    throw new Error('Multiplier must be an integer.');
  }
  if (scalar === 0) {
    return [{ sign: 1, constant: 0, notation: '0' }];
  }

  const scalarSign: 1 | -1 = scalar < 0 ? -1 : 1;
  const absScalar = Math.abs(scalar);

  return target.map(term => {
    const nextSign = (term.sign * scalarSign) as 1 | -1;
    if (typeof term.constant === 'number') {
      const nextConst = term.constant * absScalar;
      return {
        sign: nextSign,
        constant: nextConst,
        notation: String(nextConst)
      };
    }
    const nextCount = (term.count || 1) * absScalar;
    validateDiceLimits(nextCount, term.sides || 20);
    return {
      sign: nextSign,
      count: nextCount,
      sides: term.sides,
      notation: `${nextCount}d${term.sides}`
    };
  });
}

export function successChancePercent(dc: number, bonus: number, mode: DiceRollMode = 'normal') {
  if (!Number.isFinite(dc)) return null;
  let successes = 0;
  const total = mode === 'normal' ? 20 : 400;
  for (let first = 1; first <= 20; first += 1) {
    for (let second = 1; second <= (mode === 'normal' ? 1 : 20); second += 1) {
      const roll = mode === 'advantage' ? Math.max(first, second) : mode === 'disadvantage' ? Math.min(first, second) : first;
      if (roll === 1) continue;
      if (roll === 20 || roll + bonus >= dc) successes += 1;
    }
  }
  return Math.round((successes / total) * 100);
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
