import type { Encounter, EncounterDifficultySettings, MonsterDatabaseEntry } from './types';

export function calculateEncounterMath(encounter: Encounter, database: MonsterDatabaseEntry[], settings?: Partial<EncounterDifficultySettings>) {
  const actual = (encounter.monsters || []).reduce((sum, entry) => {
    const monster = database.find(item => item.id === entry.monsterId);
    if (!monster) return sum;
    const quantity = entry.quantity || 1;
    return {
      totalHp: sum.totalHp + Number(monster.hp || monster.maxHp || 0) * quantity,
      totalDpr: sum.totalDpr + Number(monster.dpr || 0) * quantity,
      points: sum.points + Number(monster.encounterPoints || 0.1) * quantity
    };
  }, { totalHp: 0, totalDpr: 0, points: 0 });

  const hpPerPoint = settings?.hpPerPoint || 150;
  const dprPerPointMin = settings?.dprPerPointMin || 80;
  const dprPerPointMax = settings?.dprPerPointMax || 100;

  return {
    ...actual,
    pointHp: actual.points * hpPerPoint,
    pointDprMin: actual.points * dprPerPointMin,
    pointDprMax: actual.points * dprPerPointMax
  };
}
