import { useContext } from 'react';
import { AccountContext } from '../components/account-provider';

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

