import crypto from 'crypto';
import fs from 'fs';

export const generateProjectCode = (
    category: string,
    verticalCode: string,
    sequenceNumber: number
): string => {
    const year = new Date().getFullYear();
    const seq = sequenceNumber.toString().padStart(3, '0');
    return `${category}-${year}-${verticalCode}-${seq}`;
};

export const calculateFileHash = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

export const formatCurrency = (amount: number, currency: 'INR' | 'USD'): string => {
    const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
};

export const parseDate = (dateString: string): Date => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateString}`);
    }
    return date;
};

export const getDaysDifference = (date1: Date, date2: Date): number => {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isOverdue = (endDate: Date): boolean => {
    return new Date() > endDate;
};

export const calculateProgress = (startDate: Date, endDate: Date): number => {
    const now = new Date();
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    if (elapsed <= 0) return 0;
    if (elapsed >= total) return 100;

    return Math.round((elapsed / total) * 100);
};

export const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const generateRandomPassword = (length: number = 12): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const paginate = <T>(
    items: T[],
    page: number = 1,
    limit: number = 10
): {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
} => {
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const data = items.slice(offset, offset + limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};
