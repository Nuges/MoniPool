import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function AuthIndex() {
    const { isRegistered } = useAuth();
    if (isRegistered) {
        return <Redirect href="/(auth)/pin" />;
    }
    return <Redirect href="/(auth)/login" />;
}
