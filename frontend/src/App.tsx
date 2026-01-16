import { useEffect, useState } from 'react';
import { fetchDays, type DailyStat } from './api';
import './App.css';

function App() {
  const [data, setData] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDays()
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Electricity statistics</h1>

      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Total consumption</th>
            <th>Total production</th>
            <th>Avg price</th>
          </tr>
        </thead>
        <tbody>
          {data.map((day) => (
            <tr key={day.date}>
              <td>{day.date.substring(0, 10)}</td>
              <td>
                {day.total_consumption === null
                  ? 'N/A'
                  : Math.round(Number(day.total_consumption))}
              </td>
              <td>
                {day.total_production === null
                  ? 'N/A'
                  : Math.round(Number(day.total_production))}
              </td>
              <td>
                {day.avg_price === null
                  ? 'N/A'
                  : Number(day.avg_price).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
