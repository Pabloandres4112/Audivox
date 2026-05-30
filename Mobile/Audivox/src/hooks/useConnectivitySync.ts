import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../store/useAppStore';

export const useConnectivitySync = () => {
  const setConnected = useAppStore(s => s.setConnected);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnected(Boolean(state.isConnected));
    });

    NetInfo.fetch().then(state => {
      setConnected(Boolean(state.isConnected));
    });

    return unsubscribe;
  }, [setConnected]);
};
