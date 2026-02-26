import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import { FEATURE_FLAGS, isFeatureEnabled, setFeatureFlag } from '../app/config/featureFlags';
import { auditService } from '../app/services/AuditService';

/**
 * DevDebug Component
 * Visible ONLY in __DEV__ mode.
 * Shows active feature flags and recent audit logs.
 */
export default function DevDebug() {
    // Double check to ensure this never renders in production builds if tree-shaking fails
    if (!__DEV__) return null;

    const [visible, setVisible] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [, forceUpdate] = useState({}); // To trigger re-render on flag toggle

    const toggleFlag = (flag: keyof typeof FEATURE_FLAGS) => {
        const current = isFeatureEnabled(flag);
        setFeatureFlag(flag, !current);
        forceUpdate({}); // Force re-render to update UI
    };

    useEffect(() => {
        if (visible) {
            const interval = setInterval(async () => {
                setLogs((await auditService.getLogs()).slice(0, 5));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [visible]);

    if (!visible) {
        return (
            <TouchableOpacity
                style={styles.trigger}
                onPress={() => setVisible(true)}
                activeOpacity={0.8}
            >
                <Text style={styles.triggerText}>🔧 DEV</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dev Tools</Text>
                    <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Feature Flags (Tap to Toggle)</Text>
                        {Object.keys(FEATURE_FLAGS).map((key) => {
                            const flagKey = key as keyof typeof FEATURE_FLAGS;
                            const enabled = isFeatureEnabled(flagKey);

                            return (
                                <View key={key} style={styles.row}>
                                    <Text style={styles.label}>{key}</Text>
                                    <TouchableOpacity
                                        onPress={() => toggleFlag(flagKey)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.badge,
                                            { backgroundColor: enabled ? Colors.success : Colors.error }
                                        ]}>
                                            <Text style={styles.badgeText}>{enabled ? 'ON' : 'OFF'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Audit Logs</Text>
                        {logs.length === 0 ? (
                            <Text style={styles.emptyText}>No logs yet</Text>
                        ) : (
                            logs.map((log, i) => (
                                <View key={i} style={styles.logItem}>
                                    <Text style={styles.logAction}>{log.action}</Text>
                                    <Text style={styles.logMeta}>
                                        {log.timestamp.split('T')[1].split('.')[0]} | {log.userId}
                                    </Text>
                                    {log.details && (
                                        <Text style={styles.logDetails}>
                                            {JSON.stringify(log.details)}
                                        </Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    trigger: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 8,
        borderRadius: 8,
        zIndex: 9999,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    triggerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 9999,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 8,
    },
    closeText: {
        color: '#fff',
        fontSize: 18,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    label: {
        color: '#ccc',
        fontSize: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
    },
    logItem: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    logAction: {
        color: Colors.secondary,
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 2,
    },
    logMeta: {
        color: '#888',
        fontSize: 10,
        marginBottom: 2,
    },
    logDetails: {
        color: '#aaa',
        fontSize: 10,
        fontFamily: 'Courier',
    },
});
