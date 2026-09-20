import { render, screen } from '@testing-library/react';

import HomePage from './page';

describe('HomePage', () => {
  it('renders the RapidLink placeholder', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Tshwane RapidLink' })).toBeInTheDocument();
    expect(screen.getByText('Frontend foundation is ready.')).toBeInTheDocument();
  });
});
