import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Database
    databaseUrl: process.env.DATABASE_URL || '',

    // JWT
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },

    // SMTP
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'CSIR-SERC Portal <noreply@serc.res.in>',
    },

    // Currency API
    currencyApi: {
        key: process.env.CURRENCY_API_KEY || '',
        url: process.env.CURRENCY_API_URL || 'https://api.freecurrencyapi.com/v1/latest',
    },

    // File Upload
    upload: {
        dir: process.env.UPLOAD_DIR || './uploads',
        maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    },

    // 2FA
    twoFa: {
        issuer: process.env.TWO_FA_ISSUER || 'CSIR-SERC Portal',
    },

    // Paths
    paths: {
        uploads: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
    },
};

export default config;
