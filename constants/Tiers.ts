import { Tier } from '../app/models/schema';

export interface TierConfig {
    id: Tier;
    label: string;
    amount: number;
    weeklyContribution: number;
    isOpenByDefault: boolean;
    requiredTierId?: Tier; // Prerequisite tier to unlock this one
    description?: string;
}

export const TIERS: TierConfig[] = [
    {
        id: '50k',
        label: 'Trust Builder',
        amount: 50000,
        weeklyContribution: 2500,
        isOpenByDefault: true,
        description: 'First-time users, trust onboarding'
    },
    {
        id: '100k',
        label: 'Entry Mainstream',
        amount: 100000,
        weeklyContribution: 5000,
        isOpenByDefault: true,
        description: 'Early regular savers'
    },
    {
        id: '300k',
        label: 'Core Mass Market',
        amount: 300000,
        weeklyContribution: 15000,
        isOpenByDefault: true,
        description: 'Majority user base'
    },
    {
        id: '500k',
        label: 'Upper Middle',
        amount: 500000,
        weeklyContribution: 25000,
        isOpenByDefault: false,
        requiredTierId: '300k',
        description: 'Advanced savers'
    },
    {
        id: '1m',
        label: 'Premium',
        amount: 1000000,
        weeklyContribution: 50000,
        isOpenByDefault: false,
        requiredTierId: '500k',
        description: 'High earners'
    },
    {
        id: '2m',
        label: 'Elite',
        amount: 2000000,
        weeklyContribution: 100000,
        isOpenByDefault: false,
        requiredTierId: '1m',
        description: 'Top-tier users'
    }
];

export const getTierConfig = (tierId: Tier): TierConfig | undefined => {
    return TIERS.find(t => t.id === tierId);
};
