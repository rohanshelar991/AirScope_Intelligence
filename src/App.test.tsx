import { render, screen } from '@testing-library/react';
import App from './App';

test('renders dashboard title', async () => {
  render(<App />);
  const heading = await screen.findByText(/Global Air Quality & Weather Intelligence System/i);
  expect(heading).toBeInTheDocument();
});
