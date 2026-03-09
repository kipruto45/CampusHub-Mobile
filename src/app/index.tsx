// Root index - redirect to splash screen
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}
