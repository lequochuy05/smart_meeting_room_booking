import { Redirect } from 'expo-router';

/** Opens on the Rooms tab once authenticated (guarded by RootLayout). */
export default function Index() {
  return <Redirect href="/(tabs)/rooms" />;
}
