import { Routes, Route } from 'react-router-dom';
import DailyListPage from './pages/DailyListPage';
import SingleDayPage from './pages/SingleDayPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DailyListPage />} />
      <Route path="/days/:date" element={<SingleDayPage />} />
    </Routes>
  );
}

export default App;
