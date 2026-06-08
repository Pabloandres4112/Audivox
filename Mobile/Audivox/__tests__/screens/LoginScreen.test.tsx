import React from 'react';
import renderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { LoginScreen } from '../../src/screens/LoginScreen';

const mockLogin = jest.fn();

jest.mock('../../src/store/useAppStore', () => ({
  useAppStore: (selector: (state: { login: typeof mockLogin }) => unknown) =>
    selector({ login: mockLogin }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('blocks invalid email addresses', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    const inputs = tree!.root.findAllByType(TextInput);
    const button = tree!.root.findByProps({ testID: 'login-continue-button' });

    renderer.act(() => {
      inputs[0].props.onChangeText('Pablo');
      inputs[1].props.onChangeText('bad-email');
    });
    renderer.act(() => {
      button.props.onPress();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in with sanitized values', () => {
    let tree: renderer.ReactTestRenderer;
    renderer.act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    const inputs = tree!.root.findAllByType(TextInput);
    const button = tree!.root.findByProps({ testID: 'login-continue-button' });

    renderer.act(() => {
      inputs[0].props.onChangeText(' Pablo ');
      inputs[1].props.onChangeText(' USER@example.com ');
    });
    renderer.act(() => {
      button.props.onPress();
    });

    expect(mockLogin).toHaveBeenCalledWith({
      name: 'Pablo',
      email: 'user@example.com',
      isGuest: false,
    });
  });
});
