import { sumAnalysis, type AnalyzedItem } from '../foodAnalysis';

function item(partial: Partial<AnalyzedItem>): AnalyzedItem {
  return {
    name_ar: '', name_en: '', grams: 100,
    calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, ...partial,
  };
}

describe('sumAnalysis', () => {
  it('يجمع كل عناصر الوجبة', () => {
    const total = sumAnalysis([
      item({ calories: 300, protein_g: 25, carbs_g: 10, fat_g: 18 }),
      item({ calories: 150, protein_g: 5, carbs_g: 30, fat_g: 2 }),
    ]);
    expect(total).toEqual({ calories: 450, protein_g: 30, carbs_g: 40, fat_g: 20 });
  });

  it('يعيد أصفارًا لوجبة بلا عناصر بدل NaN', () => {
    expect(sumAnalysis([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});
