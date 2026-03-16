import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { ResetPasswordScreen } from '../reset-password';

const ResetPasswordTokenScreen: React.FC = () => {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  return <ResetPasswordScreen tokenOverride={token} />;
};

export default ResetPasswordTokenScreen;
