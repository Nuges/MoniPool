import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Layout';
import Button from '../../components/Button';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfile() {
    const { firstName: authFirstName, lastName: authLastName, phone: authPhone, email: authEmail, avatarUri: authAvatar, updateProfile } = useAuth();

    const [firstName, setFirstName] = useState(authFirstName || '');
    const [lastName, setLastName] = useState(authLastName || '');
    const [phone] = useState(authPhone || '');
    const [email, setEmail] = useState(authEmail || '');
    const [avatar, setAvatar] = useState(authAvatar || null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setAvatar(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not access image library.');
        }
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Error', 'First and Last name are required.');
            return;
        }

        setLoading(true);
        try {
            await updateProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                avatarUri: avatar || undefined,
            });

            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>
                                    {firstName?.[0]}{lastName?.[0]}
                                </Text>
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                            <MaterialIcons name="camera-alt" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickImage}>
                        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="words"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="words"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: Colors.background, color: Colors.textMuted }]}
                        value={phone}
                        editable={false}
                    />
                    <Text style={styles.helperText}>Phone number cannot be changed.</Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: Colors.background, color: Colors.textMuted }]}
                        value={email}
                        editable={false}
                        placeholder="No email linked"
                        placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.helperText}>Email address cannot be changed currently.</Text>
                </View>

                <Button
                    title={loading ? 'Saving...' : 'Save Changes'}
                    onPress={handleSave}
                    disabled={loading}
                    style={{ marginTop: Spacing.xl }}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        padding: Spacing.lg,
    },
    // Avatar Styles
    avatarContainer: {
        alignItems: 'center',
        marginBottom: Spacing['2xl'],
    },
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: Spacing.md,
        position: 'relative',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarInitials: {
        fontSize: 36,
        color: Colors.primary,
        fontWeight: '700',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    changePhotoText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Form Styles
    inputGroup: {
        marginBottom: Spacing.lg,
        gap: 8,
    },
    label: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    helperText: {
        color: Colors.textMuted,
        fontSize: 12,
        marginLeft: 4,
    },
});
