import { useParams } from 'react-router-dom';

export default function SingleDayPage() {
  const { date } = useParams();

  return (
    <div style={{ padding: 24 }}>
      <h1>Day: {date}</h1>
      <p>TODO: Implement single day view</p>
    </div>
  );
}
