import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DayRow = {
  date: string;
  totalConsumption: number | null;
  totalProduction: number | null;
  avgPrice: number | null;
  longestNegativeStreakHours: number | null;
};

type BackendDailyStatsRow = {
  date: string;
  total_consumption: number | null;
  total_production: number | null;
  avg_price: number | null;
  longest_negative_streak_hours: number | null;
};

type BackendApiResponse = {
  data: BackendDailyStatsRow[];
  total: number;
};

type SortColumn =
  | 'date'
  | 'totalConsumption'
  | 'totalProduction'
  | 'avgPrice'
  | 'longestNegativeStreakHours';

const SORT_COLUMN_MAP: Record<SortColumn, string> = {
  date: 'date',
  totalConsumption: 'total_consumption',
  totalProduction: 'total_production',
  avgPrice: 'avg_price',
  longestNegativeStreakHours: 'longest_negative_streak_hours',
};

export default function DailyListPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<DayRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [search, setSearch] = useState('');
  const [minAvgPrice, setMinAvgPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  function SortHeader({
    column,
    label,
  }: {
    column: SortColumn;
    label: string;
  }) {
    const active = sortBy === column;
    return (
      <th onClick={() => toggleSort(column)} style={{ cursor: 'pointer' }}>
        {label} {active ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
      </th>
    );
  }

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        params.set('sort', SORT_COLUMN_MAP[sortBy]);
        params.set('order', sortOrder);
        if (search) params.set('dateFrom', search);
        if (minAvgPrice) params.set('minPrice', minAvgPrice);

        const res = await fetch(`/api/days?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = (await res.json()) as BackendApiResponse;

        const mappedData = json.data.map((row) => ({
          date: row.date,
          totalConsumption: row.total_consumption
            ? Number(row.total_consumption)
            : null,
          totalProduction: row.total_production
            ? Number(row.total_production)
            : null,
          avgPrice: row.avg_price ? Number(row.avg_price) : null,
          longestNegativeStreakHours: row.longest_negative_streak_hours
            ? Number(row.longest_negative_streak_hours)
            : null,
        }));

        setData(mappedData);
        setTotal(json.total);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Failed to fetch data:', err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, sortBy, sortOrder, search, minAvgPrice]);

  function toggleSort(column: SortColumn) {
    setPage(1);
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Daily electricity statistics</h1>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <input
          placeholder="Search date (YYYY-MM-DD)"
          type="date"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />

        <input
          placeholder="Min avg price"
          value={minAvgPrice}
          onChange={(e) => {
            setPage(1);
            setMinAvgPrice(e.target.value);
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: 4,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border={1} cellPadding={8} cellSpacing={0}>
          <thead>
            <tr>
              <SortHeader column="date" label="Date" />
              <SortHeader column="totalConsumption" label="Consumption" />
              <SortHeader column="totalProduction" label="Production" />
              <SortHeader column="avgPrice" label="Avg price" />
              <SortHeader
                column="longestNegativeStreakHours"
                label="Longest negative streak (h)"
              />
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.date}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/day/${row.date}`)}
              >
                <td>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                <td>
                  {row.totalConsumption !== null
                    ? row.totalConsumption.toFixed(2)
                    : 'N/A'}
                </td>
                <td>
                  {row.totalProduction !== null
                    ? row.totalProduction.toFixed(2)
                    : 'N/A'}
                </td>
                <td>
                  {row.avgPrice !== null ? row.avgPrice.toFixed(2) : 'N/A'}
                </td>
                <td>{row.longestNegativeStreakHours ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div style={{ marginTop: 16 }}>
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>

        <span style={{ margin: '0 12px' }}>Page {page}</span>

        <button
          disabled={page * pageSize >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
