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

  it('evaluates multiplied parenthesized dice expressions as repeated sub-rolls with individual sub-totals', () => {
    const parsed = parseDiceExpression('5*(1d20+2*5)');
    expect(parsed).toEqual([
      {
        sign: 1,
        repeatCount: 5,
        innerNotation: '1d20+10',
        notation: '5*(1d20+10)',
        innerTerms: [
          { sign: 1, count: 1, sides: 20, notation: '1d20' },
          { sign: 1, constant: 10, notation: '10' }
        ]
      }
    ]);

    const fiveRoll = rollDiceExpression('5*(1d20+2*5)', {
      random: sequence([0.4, 0.45, 0.5, 0.55, 0.8]) // rolls 9, 10, 11, 12, 17
    });

    expect(fiveRoll.normalized).toBe('5*(1d20+10)');
    expect(fiveRoll.terms).toHaveLength(1);
    expect(fiveRoll.terms[0].iterations?.map(iter => iter.total)).toEqual([19, 20, 21, 22, 27]);
    expect(fiveRoll.total).toBe(109);

    const threeRoll = rollDiceExpression('3*(1d20+2*3)', {
      mode: 'advantage',
      rerollOnes: true,
      random: sequence([
        0, 0.4, 0.7, // die 1: rolls 1 (rerolled to 9) and 15 -> keeps 15 (+6 = 21)
        0.5, 0.2,    // die 2: rolls 11 and 5 -> keeps 11 (+6 = 17)
        0.9, 0.1     // die 3: rolls 19 and 3 -> keeps 19 (+6 = 25)
      ])
    });

    expect(threeRoll.normalized).toBe('3*(1d20+6)');
    expect(threeRoll.terms[0].iterations?.map(iter => iter.total)).toEqual([21, 17, 25]);
    expect(threeRoll.terms[0].dice?.map(die => die.kept)).toEqual([15, 11, 19]);
    expect(threeRoll.terms[0].dice?.[0].rerolledOnes).toEqual([9]);
    expect(threeRoll.total).toBe(21 + 17 + 25);
  });

  it('supports nested parentheses, subtraction, and right-side multiplication', () => {
    const result = rollDiceExpression('(2d4 + 1) * 2 - (1d6 - 3)', {
      random: sequence([0.25, 0.5, 0.75, 0.9, 0.5])
    });

    expect(result.normalized).toBe('2*(2d4+1)-1d6+3');
    expect(result.terms[0].iterations?.map(iter => iter.total)).toEqual([2 + 3 + 1, 4 + 4 + 1]);
    expect(result.terms[1].dice?.map(die => die.kept)).toEqual([4]);
    expect(result.total).toBe(6 + 9 - 4 + 3);
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
