import AsyncStorage from '@react-native-async-storage/async-storage';

const GOAL_KEY = '@monthly_goal_bons';

export const DEFAULT_MONTHLY_GOAL = 1300;

export async function loadMonthlyGoal(): Promise<number> {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  if (!raw) return DEFAULT_MONTHLY_GOAL;
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? DEFAULT_MONTHLY_GOAL : n;
}

export async function saveMonthlyGoal(n: number): Promise<void> {
  await AsyncStorage.setItem(GOAL_KEY, String(n));
}

const PRIX_BON_KEY = '@prix_bon';
export const DEFAULT_PRIX_BON = 2.2;

export async function loadPrixBon(): Promise<number> {
  const raw = await AsyncStorage.getItem(PRIX_BON_KEY);
  if (!raw) return DEFAULT_PRIX_BON;
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) || n <= 0 ? DEFAULT_PRIX_BON : n;
}

export async function savePrixBon(n: number): Promise<void> {
  await AsyncStorage.setItem(PRIX_BON_KEY, String(n));
}
