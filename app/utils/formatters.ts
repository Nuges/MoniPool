import { Transaction } from '../models/schema';

export const formatCurrency = (amount: number): string => {
    const abs = Math.abs(amount);
    if (abs >= 1000000) {
        return `₦${(abs / 1000000).toFixed(1)}M`;
    }
    return `₦${abs.toLocaleString()}`;
};

export const formatCurrencyFull = (amount: number): string => {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}₦${Math.abs(amount).toLocaleString()}`;
};

export const getTrustColor = (level: 'verified' | 'growing' | 'high_risk'): string => {
    switch (level) {
        case 'verified': return '#60BA46';
        case 'growing': return '#F59E0B';
        case 'high_risk': return '#EF4444';
    }
};

export const getTrustLabel = (level: 'verified' | 'growing' | 'high_risk'): string => {
    switch (level) {
        case 'verified': return '🟢 Verified Saver';
        case 'growing': return '🟡 Growing Saver';
        case 'high_risk': return '🔴 High Risk';
    }
};

export const getCycleLabel = (cycle: 'daily' | 'weekly' | 'monthly'): string => {
    switch (cycle) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'monthly': return 'Monthly';
        default: return cycle;
    }
};

export const getTransactionIcon = (type: Transaction['type']): string => {
    switch (type) {
        case 'contribution': return 'arrow-upward';
        case 'payout': return 'arrow-downward';
        case 'fund': return 'credit-card';
        case 'withdrawal': return 'account-balance';
        case 'penalty': return 'warning';
        case 'fee': return 'receipt';
        default: return 'payments';
    }
};
