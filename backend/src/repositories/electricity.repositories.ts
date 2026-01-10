// backend/src/repositories/electricity.repositories.ts
import { pool } from '../db.js';

interface GetDailyStatsOptions {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function getDailyStats(options: GetDailyStatsOptions = {}) {
  const {
    page = 1,
    pageSize = 20,
    sort = 'date',
    order = 'asc',
    dateFrom,
    dateTo,
    minPrice,
    maxPrice,
  } = options;

  // Build WHERE and HAVING clauses for filtering
  const whereConditions: string[] = [];
  const havingConditions: string[] = [];
  const values: any[] = [];

  if (dateFrom) {
    whereConditions.push(`e.date >= $${values.length + 1}`);
    values.push(dateFrom);
  }
  if (dateTo) {
    whereConditions.push(`e.date <= $${values.length + 1}`);
    values.push(dateTo);
  }
  if (minPrice !== undefined) {
    havingConditions.push(`AVG(e.hourlyPrice) >= $${values.length + 1}`);
    values.push(minPrice);
  }
  if (maxPrice !== undefined) {
    havingConditions.push(`AVG(e.hourlyPrice) <= $${values.length + 1}`);
    values.push(maxPrice);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const havingClause =
    havingConditions.length > 0
      ? `HAVING ${havingConditions.join(' AND ')}`
      : '';

  // Map sort field to output column names
  const sortField =
    sort === 'date'
      ? 'date'
      : sort === 'total_consumption'
      ? 'total_consumption'
      : sort === 'total_production'
      ? 'total_production'
      : sort === 'avg_price'
      ? 'avg_price'
      : 'date';

  // Calculate offset
  const offset = (page - 1) * pageSize;

  const query = `
    WITH negative_streaks AS (
      SELECT
        date,
        SUM(CASE WHEN hourlyPrice >= 0 THEN 1 ELSE 0 END)
            OVER (PARTITION BY date ORDER BY starttime) AS grp,
        hourlyPrice
      FROM Electricitydata
    ),
    streak_lengths AS (
      SELECT
        date,
        grp,
        COUNT(*) AS length
      FROM negative_streaks
      WHERE hourlyPrice < 0
      GROUP BY date, grp
    ),
    max_streak AS (
      SELECT
        date,
        COALESCE(MAX(length), 0) AS longest_negative_streak_hours
      FROM streak_lengths
      GROUP BY date
    ),
    daily_stats AS (
      SELECT
        e.date,
        SUM(e.consumptionAmount) AS total_consumption,
        SUM(e.productionAmount) AS total_production,
        AVG(e.hourlyPrice) AS avg_price,
        m.longest_negative_streak_hours
      FROM Electricitydata e
      LEFT JOIN max_streak m ON e.date = m.date
      ${whereClause}
      GROUP BY e.date, m.longest_negative_streak_hours
      ${havingClause}
    )
    SELECT * FROM daily_stats
    ORDER BY ${sortField} ${order.toUpperCase()}
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(pageSize, offset);

  const result = await pool.query(query, values);
  return result.rows;
}
