// MoniPool — Index: auth-aware redirect
import { Redirect } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Index() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)/onboarding" />;
}
