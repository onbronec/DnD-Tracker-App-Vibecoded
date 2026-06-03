import { describe, expect, it } from 'vitest';
import { rollDiceExpression, successChancePercent } from '../../src/shared/dice';

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
