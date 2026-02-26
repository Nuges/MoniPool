// MoniPool — Bottom tab navigator
import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import Colors from '../../constants/Colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.tabBar,
                    borderTopColor: Colors.tabBarBorder,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                    paddingTop: 10,
                    elevation: 0,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIcon : undefined}>
                            <MaterialIcons
                                name={focused ? 'home' : 'home'}
                                size={24}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="pools"
                options={{
                    title: 'Pools',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIcon : undefined}>
                            <MaterialIcons
                                name={focused ? 'groups' : 'groups'}
                                size={24}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIcon : undefined}>
                            <MaterialIcons
                                name={focused ? 'chat' : 'chat-bubble-outline'}
                                size={24}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIcon : undefined}>
                            <MaterialIcons
                                name={focused ? 'account-balance-wallet' : 'account-balance-wallet'}
                                size={24}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIcon : undefined}>
                            <MaterialIcons
                                name={focused ? 'person' : 'person-outline'}
                                size={24}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIcon: {
        backgroundColor: `${Colors.primary}15`,
        borderRadius: 12,
        padding: 4,
    },
});
