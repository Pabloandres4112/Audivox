import React from 'react';
import renderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: 'RootNavigator',
}));

describe('App', () => {
  it('renders app shell', () => {
    renderer.create(<App />);
  });
});
