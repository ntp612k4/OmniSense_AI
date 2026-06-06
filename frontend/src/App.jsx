import { DashboardLayout } from './components/DashboardLayout.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

export function App() {
  return (
    <ThemeProvider>
      <DashboardLayout />
    </ThemeProvider>
  );
}
