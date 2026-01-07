import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

import config from './config/index.js';
import prisma from './config/database.js';
import routes from './routes/index.js';

const app = express();
const httpServer = createServer(app);

// Trust proxy for production (behind nginx)
if (config.nodeEnv === 'production' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// Socket.IO for real-time updates
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
    },
});

// Ensure upload directory exists
if (!fs.existsSync(config.paths.uploads)) {
    fs.mkdirSync(config.paths.uploads, { recursive: true });
}

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable for development
}));

// CORS - Allow multiple origins for production
const allowedOrigins = [
    config.frontendUrl,
    'https://pms.serc.res.in',
    'http://pms.serc.res.in',
    'https://10.10.200.36',
    'http://10.10.200.36',
    'http://localhost:5173',
    'http://localhost:3000',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.log('CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Static files (uploads)
app.use('/uploads', express.static(config.paths.uploads));

// API routes
app.use('/api', routes);

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe:project', (projectId: string) => {
        socket.join(`project:${projectId}`);
    });

    socket.on('subscribe:dashboard', (userId: string) => {
        socket.join(`dashboard:${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Export io for use in other modules
export { io };

// Broadcast functions
export const broadcastProjectUpdate = (projectId: string, data: any) => {
    io.to(`project:${projectId}`).emit('project:updated', data);
};

export const broadcastDashboardUpdate = (userId: string, data: any) => {
    io.to(`dashboard:${userId}`).emit('dashboard:updated', data);
};

export const broadcastNotification = (userId: string, notification: any) => {
    io.to(`dashboard:${userId}`).emit('notification', notification);
};

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    console.error(err.stack);

    res.status(500).json({
        error: 'Internal server error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
    });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');

    await prisma.$disconnect();

    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        httpServer.listen(config.port, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏛️  CSIR-SERC Project Management Portal                  ║
║                                                            ║
║   Server running at: http://localhost:${config.port}               ║
║   Environment: ${config.nodeEnv.padEnd(12)}                        ║
║   API Base: http://localhost:${config.port}/api                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
