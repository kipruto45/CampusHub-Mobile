import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { VerifyEmailScreen } from '../verify-email';

const VerifyEmailTokenScreen: React.FC = () => {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  return <VerifyEmailScreen tokenOverride={token} />;
};

export default VerifyEmailTokenScreen;
