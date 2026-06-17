// Calculation constants - centralized for consistency
const CALCULATION_CONSTANTS = {
  // Activity multipliers
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra: 1.9,
  } as const,

  // Calorie safety caps
  MIN_CALORIES: 1200,
  MAX_CALORIES: 5000,

  // Protein per kg bounds
  MIN_PROTEIN_PER_KG: 1.2,
  MAX_PROTEIN_PER_KG: 2.4,

  // Macro calorie conversions
  PROTEIN_CALORIES_PER_GRAM: 4,
  CARB_CALORIES_PER_GRAM: 4,
  FAT_CALORIES_PER_GRAM: 9,
} as const;

export const calculationService = {
  /**
   * Calculate BMR using Mifflin-St Jeor Equation
   */
  calculateBMR(weight: number, height: number, age: number, gender: string): number {
    if (gender === 'M') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  },

  /**
   * Get activity multiplier
   */
  getActivityMultiplier(activityLevel: string): number {
    return (
      CALCULATION_CONSTANTS.ACTIVITY_MULTIPLIERS[
        activityLevel as keyof typeof CALCULATION_CONSTANTS.ACTIVITY_MULTIPLIERS
      ] ?? CALCULATION_CONSTANTS.ACTIVITY_MULTIPLIERS.sedentary
    );
  },

  /**
   * Get complete macro ratio based on goal and gender
   * Returns full P:C:F ratio (protein:carbs:fat)
   */
  getMacroRatio(goal: string, gender: string): { P: number; C: number; F: number } {
    const ratios: Record<string, { P: number; C: number; F: number }> = {
      maintain:
        gender === 'M'
          ? { P: 0.3, C: 0.45, F: 0.25 }
          : { P: 0.3, C: 0.4, F: 0.3 },
      gain:
        gender === 'M'
          ? { P: 0.32, C: 0.48, F: 0.2 }
          : { P: 0.32, C: 0.45, F: 0.23 },
      lose:
        gender === 'M'
          ? { P: 0.37, C: 0.4, F: 0.23 }
          : { P: 0.37, C: 0.35, F: 0.28 },
    };
    return ratios[goal] ?? ratios['maintain'];
  },

  /**
   * Get remaining macro ratio for carbs and fat after protein is calculated
   */
  getRemainingMacroRatio(goal: string, gender: string): { C: number; F: number } {
    const fullRatio = this.getMacroRatio(goal, gender);
    const remainingProtein = 1 - fullRatio.P;
    const carbRatio = fullRatio.C / remainingProtein;
    const fatRatio = fullRatio.F / remainingProtein;

    return {
      C: Number(carbRatio.toFixed(3)),
      F: Number(fatRatio.toFixed(3)),
    };
  },

  /**
   * Get adaptive protein target per kg body weight
   */
  getProteinPerKg(activityLevel: string, goal: string, gender: string): number {
    const baseProtein: Record<string, number> = {
      sedentary: 1.4,
      light: 1.6,
      moderate: 1.8,
      active: 2,
      extra: 2.2,
    };

    let multiplier = baseProtein[activityLevel] ?? 1.6;

    if (goal === 'gain' || goal === 'lose') {
      multiplier += 0.2;
    }

    if (gender === 'M') {
      multiplier += 0.1;
    }

    return Math.min(
      Math.max(multiplier, CALCULATION_CONSTANTS.MIN_PROTEIN_PER_KG),
      CALCULATION_CONSTANTS.MAX_PROTEIN_PER_KG
    );
  },

  /**
   * Get gender-specific calorie adjustment for goals
   */
  getCalorieAdjustment(goal: string, gender: string): number {
    const adjustments: Record<string, number> = {
      maintain: 0,
      gain: gender === 'M' ? 400 : 300,
      lose: gender === 'M' ? -400 : -300,
    };
    return adjustments[goal] ?? 0;
  },

  /**
   * Calculate daily targets based on profile, goal, and activity
   */
  calculateDailyTargets(
    weight: number,
    height: number,
    age: number,
    gender: string,
    goal: string,
    activityLevel: string
  ) {
    const BMR = this.calculateBMR(weight, height, age, gender);
    const multiplier = this.getActivityMultiplier(activityLevel);
    const TDEE = BMR * multiplier;

    const calorieAdjustment = this.getCalorieAdjustment(goal, gender);
    let targetCalories = TDEE + calorieAdjustment;

    // Apply safety caps
    targetCalories = Math.max(
      CALCULATION_CONSTANTS.MIN_CALORIES,
      Math.min(CALCULATION_CONSTANTS.MAX_CALORIES, targetCalories)
    );

    // Protein
    const proteinPerKg = this.getProteinPerKg(activityLevel, goal, gender);
    const protein = Math.round(weight * proteinPerKg);

    // Remaining calories for carbs/fat
    const proteinCalories = protein * CALCULATION_CONSTANTS.PROTEIN_CALORIES_PER_GRAM;
    const remainingCalories = Math.max(0, targetCalories - proteinCalories);

    // Split between carbs and fat
    const remainingRatio = this.getRemainingMacroRatio(goal, gender);
    const carbs = Math.round((remainingCalories * remainingRatio.C) / CALCULATION_CONSTANTS.CARB_CALORIES_PER_GRAM);
    const fat = Math.round((remainingCalories * remainingRatio.F) / CALCULATION_CONSTANTS.FAT_CALORIES_PER_GRAM);

    return {
      calories: Math.round(targetCalories),
      protein,
      carbs,
      fat,
    };
  },
};
