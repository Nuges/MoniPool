// MoniPool — Onboarding screen with carousel
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Image,
    Animated,
    TouchableOpacity,
    Dimensions,
    FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        icon: 'handshake' as const,
        title: 'Wealth Built\nTogether',
        subtitle: 'Join private, KYC-verified savings pools. Build wealth with people you can actually count on.',
        gradient: [Colors.primary, '#1A3A6C'] as const,
    },
    {
        id: '2',
        icon: 'verified-user' as const,
        title: 'Trust is\nYour Currency',
        subtitle: 'Your reputation pays off. Build your trust score to unlock higher tiers, bigger pools, and lower fees.',
        gradient: [Colors.secondary, '#2D7A1E'] as const,
    },
    {
        id: '3',
        icon: 'lock' as const,
        title: 'Automated.\nSecure. Yours.',
        subtitle: 'Set contributions on autopilot. Enjoy guaranteed payouts protected by bank-level security.',
        gradient: ['#6C5CE7', '#3B2D8E'] as const,
    },
];

export default function Onboarding() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            router.push('/(auth)/login');
        }
    };

    const renderSlide = ({ item }: { item: typeof slides[0] }) => (
        <View style={styles.slide}>
            <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
            >
                <MaterialIcons name={item.icon} size={56} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Logo */}
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Slide counter */}
            <Text style={styles.counter}>{currentIndex + 1}/{slides.length}</Text>

            {/* Carousel */}
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                style={styles.carousel}
            />

            {/* Dots */}
            <View style={styles.dots}>
                {slides.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i === currentIndex ? styles.dotActive : styles.dotInactive,
                        ]}
                    />
                ))}
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
                <Button
                    title={currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
                    onPress={handleNext}
                    variant={currentIndex === slides.length - 1 ? 'secondary' : 'primary'}
                    size="lg"
                />

                {currentIndex === slides.length - 1 && (
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/admin-login')}
                        style={{ marginTop: Spacing.sm, padding: Spacing.sm, alignItems: 'center' }}
                    >
                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Admin Login</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    logoContainer: {
        alignItems: 'center',
        paddingTop: Spacing['2xl'],
    },
    logo: {
        width: 140,
        height: 50,
    },
    counter: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: Spacing.lg,
    },
    carousel: {
        flex: 1,
    },
    slide: {
        width,
        paddingHorizontal: Spacing['3xl'],
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing['3xl'],
    },
    icon: {
        fontSize: 56,
    },
    title: {
        color: Colors.text,
        fontSize: 34,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 42,
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.lg,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 24,
    },
    dotInactive: {
        backgroundColor: Colors.cardBorder,
    },
    buttonContainer: {
        paddingHorizontal: Spacing['2xl'],
        paddingBottom: Spacing['3xl'],
        gap: Spacing.md,
    },
});
