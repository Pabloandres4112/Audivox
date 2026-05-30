import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: 'RootNavigator',
}));
jest.mock('../src/hooks/usePlaybackTick', () => ({
  usePlaybackTick: jest.fn(),
}));

describe('App', () => {
  it('renders app shell', () => {
    renderer.act(() => {
      renderer.create(<App />);
    });
  });
});
