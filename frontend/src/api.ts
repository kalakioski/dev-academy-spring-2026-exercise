export type DailyStat = {
  date: string;
  total_consumption: number | null;
  total_production: number | null;
  avg_price: number | null;
  longest_negative_streak_hours: number | null;
};

export async function fetchDays() {
  const res = await fetch('http://localhost:3000/api/days');
  if (!res.ok) {
    throw new Error('Failed to fetch days');
  }
  return res.json();
}
