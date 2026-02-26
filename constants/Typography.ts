// MoniPool Design System — Typography
import { Platform } from 'react-native';

const fontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const Typography = {
    // Font families
    fontFamily,

    // Font sizes
    sizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        '2xl': 22,
        '3xl': 28,
        '4xl': 34,
        '5xl': 42,
    },

    // Font weights
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
    },

    // Line heights
    lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },

    // Letter spacing
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
        wider: 1,
    },
};

// Pre-built text styles
export const TextStyles = {
    hero: {
        fontSize: Typography.sizes['5xl'],
        fontWeight: Typography.weights.extrabold,
        letterSpacing: Typography.letterSpacing.tight,
    },
    h1: {
        fontSize: Typography.sizes['4xl'],
        fontWeight: Typography.weights.bold,
        letterSpacing: Typography.letterSpacing.tight,
    },
    h2: {
        fontSize: Typography.sizes['3xl'],
        fontWeight: Typography.weights.bold,
    },
    h3: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.semibold,
    },
    h4: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.semibold,
    },
    body: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.regular,
        lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    },
    bodySmall: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.regular,
        lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    },
    caption: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.regular,
    },
    label: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
        letterSpacing: Typography.letterSpacing.wide,
        textTransform: 'uppercase' as const,
    },
    amount: {
        fontSize: Typography.sizes['4xl'],
        fontWeight: Typography.weights.extrabold,
        letterSpacing: Typography.letterSpacing.tight,
    },
    amountSmall: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
    },
};

export default Typography;
