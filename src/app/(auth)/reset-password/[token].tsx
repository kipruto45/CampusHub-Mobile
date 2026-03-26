import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { ResetPasswordScreen } from '../reset-password';

const ResetPasswordTokenScreen: React.FC = () => {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  return <ResetPasswordScreen tokenOverride={token} />;
};

export default ResetPasswordTokenScreen;
