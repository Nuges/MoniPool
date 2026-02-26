// ============================================================
// Module Declarations — Missing Type Packages
// Only declares modules that genuinely lack @types/* packages.
// DO NOT use `any` to silence real type errors.
// ============================================================

declare module 'expo-linear-gradient' {
    import { ComponentType, ReactNode } from 'react';
    import { StyleProp, ViewStyle } from 'react-native';

    export interface LinearGradientProps {
        colors: readonly string[];
        start?: { x: number; y: number };
        end?: { x: number; y: number };
        locations?: number[];
        children?: ReactNode;
        style?: StyleProp<ViewStyle>;
        [key: string]: unknown;
    }

    export const LinearGradient: ComponentType<LinearGradientProps>;
}

declare module 'react-native-safe-area-context' {
    import { ComponentType, ReactNode } from 'react';
    import { StyleProp, ViewStyle } from 'react-native';

    export interface SafeAreaViewProps {
        children?: ReactNode;
        style?: StyleProp<ViewStyle>;
        edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
        [key: string]: unknown;
    }

    export interface EdgeInsets {
        top: number;
        right: number;
        bottom: number;
        left: number;
    }

    export const SafeAreaView: ComponentType<SafeAreaViewProps>;
    export const SafeAreaProvider: ComponentType<{ children?: ReactNode }>;
    export function useSafeAreaInsets(): EdgeInsets;
}
