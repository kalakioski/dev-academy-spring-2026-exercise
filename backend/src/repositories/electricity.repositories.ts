// backend/src/repositories/electricity.repositories.ts
import { pool } from '../db.js';

interface GetDailyStatsOptions {
  page?: number;
  pageSize?: number;
  sort?: 'date' | 'total_consumption' | 'total_production' | 'avg_price';
  order?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Fetch aggregated daily electricity statistics with filtering and pagination.
 * @param options Query options for filtering, sorting, and pagination
 * @returns Array of daily statistics or null on error
 */
export async function getDailyStats(options: GetDailyStatsOptions = {}) {
  try {
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

    // Validate order parameter to prevent SQL injection
    const validOrder = order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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
      havingConditions.push(`AVG(e."hourlyprice") >= $${values.length + 1}`);
      values.push(minPrice);
    }
    if (maxPrice !== undefined) {
      havingConditions.push(`AVG(e."hourlyprice") <= $${values.length + 1}`);
      values.push(maxPrice);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join(' AND ')}`
        : '';

    const SORT_MAP: Record<string, string> = {
      date: 'date',
      total_consumption: 'total_consumption',
      total_production: 'total_production',
      avg_price: 'avg_price',
      longest_negative_streak_hours: 'longest_negative_streak_hours',
    };

    const sortKey = sort ?? 'date';
    const sortField = SORT_MAP[sortKey] ?? SORT_MAP.date;

    // Calculate offset
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);

    const query = `
      WITH negative_streaks AS (
        SELECT
          date,
          SUM(
            CASE
              WHEN hourlyprice IS NULL THEN 1
              WHEN hourlyprice >= 0 THEN 1
              ELSE 0
            END
          )
              OVER (PARTITION BY date ORDER BY starttime NULLS LAST) AS grp,
          hourlyprice
        FROM electricitydata
      ),
      streak_lengths AS (
        SELECT
          date,
          grp,
          COUNT(*) AS length
        FROM negative_streaks
        WHERE hourlyprice < 0
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
          e.date::date AS date,
          SUM(e."consumptionamount") AS total_consumption,
          SUM(e."productionamount") AS total_production,
          AVG(e."hourlyprice") AS avg_price,
          m.longest_negative_streak_hours
        FROM "electricitydata" e
        LEFT JOIN max_streak m ON e.date = m.date
        ${whereClause}
        GROUP BY e.date::date, m.longest_negative_streak_hours
        ${havingClause}
      )
      SELECT * FROM daily_stats
      ORDER BY ${sortField} ${validOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length};
    `;

    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    throw error;
  }
}

/**
 * Fetch statistics for a single day.
 * @param date Date string to query (YYYY-MM-DD format)
 * @returns Daily statistics object or null if date not found
 */
export async function getSingleDayStats(date: string) {
  try {
    // Combine all queries into one for efficiency
    const query = `
      SELECT
        TO_CHAR($1::date, 'YYYY-MM-DD') AS date,
        SUM("consumptionamount") as total_consumption,
        SUM("productionamount") as total_production,
        AVG("hourlyprice") as avg_price,
        (ARRAY_AGG("starttime" ORDER BY ("consumptionamount" - "productionamount") DESC))[1] as max_consumption_hour,
        (ARRAY_AGG("starttime" ORDER BY "hourlyprice" ASC))[1] as cheapest_hour
      FROM "electricitydata"
      WHERE date >= $1::date
        AND date < ($1::date + INTERVAL '1 day')
      GROUP BY date
    `;

    const result = await pool.query(query, [date]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      date: row.date,
      totalConsumption: row.total_consumption ?? 0,
      totalProduction: row.total_production ?? 0,
      avgPrice: row.avg_price ?? 0,
      maxConsumptionHour: row.max_consumption_hour || null,
      cheapestHour: row.cheapest_hour || null,
    };
  } catch (error) {
    console.error('Error fetching single day stats:', error);
    throw error;
  }
}
