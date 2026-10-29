import { describe, expect, it } from 'vitest';
import { parseDiceExpression, rollDiceExpression, successChancePercent } from '../../src/shared/dice';

function sequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('dice roller', () => {
  it('rolls mixed dice expressions and constants', () => {
    const result = rollDiceExpression('2d6 + 3', { random: sequence([0, 0.5]) });

    expect(result.normalized).toBe('2d6+3');
    expect(result.total).toBe(8);
    expect(result.terms[0].dice?.map(die => die.kept)).toEqual([1, 4]);
  });

  it('supports parentheses and multiplication like 3*(1d20+2*3)', () => {
    const parsed = parseDiceExpression('3*(1d20+2*3)');
    expect(parsed).toEqual([
      { sign: 1, count: 3, sides: 20, notation: '3d20' },
      { sign: 1, constant: 18, notation: '18' }
    ]);

    const result = rollDiceExpression('3*(1d20+2*3)', {
      mode: 'advantage',
      rerollOnes: true,
      random: sequence([
        0, 0.4, 0.7, // die 1: rolls 1 (rerolled to 9) and 15 -> keeps 15
        0.5, 0.2,    // die 2: rolls 11 and 5 -> keeps 11
        0.9, 0.1     // die 3: rolls 19 and 3 -> keeps 19
      ])
    });

    expect(result.normalized).toBe('3d20+18');
    expect(result.terms[0].dice).toHaveLength(3);
    expect(result.terms[0].dice?.map(die => die.kept)).toEqual([15, 11, 19]);
    expect(result.terms[0].dice?.[0].rerolledOnes).toEqual([9]);
    expect(result.total).toBe(15 + 11 + 19 + 18);
  });

  it('supports nested parentheses, subtraction, and right-side multiplication', () => {
    const result = rollDiceExpression('(2d4 + 1) * 2 - (1d6 - 3)', {
      random: sequence([0.25, 0.5, 0.75, 0.9, 0.5])
    });

    expect(result.normalized).toBe('4d4+2-1d6+3');
    expect(result.terms[0].dice?.map(die => die.kept)).toEqual([2, 3, 4, 4]);
    expect(result.terms[2].dice?.map(die => die.kept)).toEqual([4]);
    expect(result.total).toBe((2 + 3 + 4 + 4) + 2 - 4 + 3);
  });

  it('supports advantage, disadvantage and one-time reroll of 1s', () => {
    const advantage = rollDiceExpression('1d20', { mode: 'advantage', random: sequence([0.1, 0.9]) });
    const disadvantage = rollDiceExpression('1d20', { mode: 'disadvantage', random: sequence([0.1, 0.9]) });
    const reroll = rollDiceExpression('1d6', { rerollOnes: true, random: sequence([0, 0.5]) });

    expect(advantage.total).toBe(19);
    expect(advantage.terms[0].dice?.[0].rolls).toEqual([3, 19]);
    expect(disadvantage.total).toBe(3);
    expect(reroll.total).toBe(4);
    expect(reroll.terms[0].dice?.[0].rerolledOnes).toEqual([4]);
  });

  it('calculates DC success chance with natural 1 fail and natural 20 success', () => {
    expect(successChancePercent(15, 8)).toBe(70);
    expect(successChancePercent(30, 0)).toBe(5);
    expect(successChancePercent(1, 20)).toBe(95);
  });
});
