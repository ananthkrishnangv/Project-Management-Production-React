import config from '../config/index.js';
import prisma from '../config/database.js';
import { Currency } from '@prisma/client';

interface CurrencyRates {
    USD: number;
    INR: number;
}

// Default fallback rate
const DEFAULT_USD_TO_INR = 83.50;

export class CurrencyService {
    private cachedRates: CurrencyRates | null = null;
    private lastFetch: Date | null = null;
    private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

    async getExchangeRate(from: Currency = 'USD', to: Currency = 'INR'): Promise<number> {
        try {
            // Check cache
            const cached = await this.getCachedRate(from, to);
            if (cached) {
                return cached;
            }

            // Fetch from API
            const rates = await this.fetchRates();

            if (from === 'USD' && to === 'INR') {
                return rates.INR;
            } else if (from === 'INR' && to === 'USD') {
                return 1 / rates.INR;
            }

            return 1;
        } catch (error) {
            console.error('Failed to get exchange rate:', error);
            return DEFAULT_USD_TO_INR;
        }
    }

    private async fetchRates(): Promise<CurrencyRates> {
        try {
            if (!config.currencyApi.key || config.currencyApi.key === 'fca_live_YOUR_API_KEY_HERE') {
                console.log('No currency API key configured, using default rate');
                return { USD: 1, INR: DEFAULT_USD_TO_INR };
            }

            const response = await fetch(
                `${config.currencyApi.url}?apikey=${config.currencyApi.key}&base_currency=USD&currencies=INR`
            );

            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }

            const data = await response.json() as { data?: { INR?: number } };
            const inrRate = data.data?.INR || DEFAULT_USD_TO_INR;

            // Cache the rate
            await this.cacheRate('USD', 'INR', inrRate);

            return { USD: 1, INR: inrRate };
        } catch (error) {
            console.error('Currency API fetch failed:', error);
            // Return last known rate or default
            const lastRate = await this.getLastKnownRate();
            return { USD: 1, INR: lastRate };
        }
    }

    private async getCachedRate(from: Currency, to: Currency): Promise<number | null> {
        try {
            const cached = await prisma.currencyRate.findFirst({
                where: {
                    baseCurrency: from,
                    targetCurrency: to,
                    fetchedAt: {
                        gte: new Date(Date.now() - this.cacheDuration),
                    },
                },
                orderBy: { fetchedAt: 'desc' },
            });

            return cached?.rate || null;
        } catch {
            return null;
        }
    }

    private async cacheRate(from: Currency, to: Currency, rate: number): Promise<void> {
        try {
            await prisma.currencyRate.create({
                data: {
                    baseCurrency: from,
                    targetCurrency: to,
                    rate,
                },
            });
        } catch (error) {
            console.error('Failed to cache rate:', error);
        }
    }

    private async getLastKnownRate(): Promise<number> {
        try {
            const lastRate = await prisma.currencyRate.findFirst({
                where: {
                    baseCurrency: 'USD',
                    targetCurrency: 'INR',
                },
                orderBy: { fetchedAt: 'desc' },
            });
            return lastRate?.rate || DEFAULT_USD_TO_INR;
        } catch {
            return DEFAULT_USD_TO_INR;
        }
    }

    async convertToINR(amount: number, fromCurrency: Currency): Promise<{ amountINR: number; rate: number }> {
        if (fromCurrency === 'INR') {
            return { amountINR: amount, rate: 1 };
        }

        const rate = await this.getExchangeRate('USD', 'INR');
        return {
            amountINR: amount * rate,
            rate,
        };
    }

    async convertToUSD(amount: number, fromCurrency: Currency): Promise<{ amountUSD: number; rate: number }> {
        if (fromCurrency === 'USD') {
            return { amountUSD: amount, rate: 1 };
        }

        const rate = await this.getExchangeRate('INR', 'USD');
        return {
            amountUSD: amount * rate,
            rate,
        };
    }
}

export const currencyService = new CurrencyService();
