import nodemailer, { Transporter } from 'nodemailer';
import config from '../config/index.js';
import prisma from '../config/database.js';
import { NotificationType } from '@prisma/client';

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

interface NotificationData {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    sendEmail?: boolean;
}

class NotificationService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: false,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: config.smtp.from,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    async createNotification(data: NotificationData): Promise<void> {
        try {
            // Create in-app notification
            const notification = await prisma.notification.create({
                data: {
                    userId: data.userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    link: data.link,
                },
            });

            // Send email if requested
            if (data.sendEmail) {
                const user = await prisma.user.findUnique({
                    where: { id: data.userId },
                    select: { email: true, firstName: true },
                });

                if (user) {
                    await this.sendEmail({
                        to: user.email,
                        subject: data.title,
                        html: this.generateEmailTemplate(data.title, data.message, user.firstName, data.link),
                    });

                    // Mark email as sent
                    await prisma.notification.update({
                        where: { id: notification.id },
                        data: { emailSent: true },
                    });
                }
            }
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }

    async sendDeadlineAlert(
        userId: string,
        projectTitle: string,
        milestone: string,
        dueDate: Date,
        daysRemaining: number
    ): Promise<void> {
        const title = daysRemaining <= 0
            ? `⚠️ Overdue: ${milestone}`
            : `🔔 Deadline Alert: ${daysRemaining} days remaining`;

        await this.createNotification({
            userId,
            type: 'DEADLINE_ALERT',
            title,
            message: `Project "${projectTitle}" - Milestone "${milestone}" is ${daysRemaining <= 0 ? 'overdue' : `due on ${dueDate.toLocaleDateString()}`
                }`,
            link: `/projects`,
            sendEmail: true,
        });
    }

    async sendBudgetWarning(
        userId: string,
        projectTitle: string,
        utilizationPercent: number
    ): Promise<void> {
        await this.createNotification({
            userId,
            type: 'BUDGET_WARNING',
            title: `💰 Budget Alert: ${utilizationPercent}% utilized`,
            message: `Project "${projectTitle}" has utilized ${utilizationPercent}% of its allocated budget.`,
            link: `/finance`,
            sendEmail: utilizationPercent >= 90,
        });
    }

    async sendMoUExpiryAlert(
        userId: string,
        mouTitle: string,
        partnerName: string,
        expiryDate: Date,
        daysRemaining: number
    ): Promise<void> {
        await this.createNotification({
            userId,
            type: 'MOU_EXPIRY',
            title: `📄 MoU Expiring: ${daysRemaining} days`,
            message: `MoU "${mouTitle}" with ${partnerName} expires on ${expiryDate.toLocaleDateString()}`,
            link: `/documents`,
            sendEmail: true,
        });
    }

    async sendRCMeetingNotification(
        userId: string,
        meetingTitle: string,
        meetingDate: Date
    ): Promise<void> {
        await this.createNotification({
            userId,
            type: 'RC_MEETING',
            title: `📅 RC Meeting Scheduled`,
            message: `"${meetingTitle}" is scheduled for ${meetingDate.toLocaleDateString()}`,
            link: `/rc-meetings`,
            sendEmail: true,
        });
    }

    async sendWeeklyDigest(userId: string, digest: {
        pendingMilestones: number;
        budgetUtilization: number;
        upcomingMeetings: number;
    }): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true },
        });

        if (!user) return;

        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0078d4 0%, #004578 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📊 Weekly Project Digest</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #333;">Hello ${user.firstName},</h2>
          <p>Here's your weekly summary from CSIR-SERC Portal:</p>
          
          <div style="display: flex; gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 20px; border-radius: 10px; flex: 1; text-align: center;">
              <h3 style="color: #0078d4; margin: 0; font-size: 2em;">${digest.pendingMilestones}</h3>
              <p style="margin: 5px 0; color: #666;">Pending Milestones</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; flex: 1; text-align: center;">
              <h3 style="color: #107c10; margin: 0; font-size: 2em;">${digest.budgetUtilization}%</h3>
              <p style="margin: 5px 0; color: #666;">Budget Utilized</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 10px; flex: 1; text-align: center;">
              <h3 style="color: #d83b01; margin: 0; font-size: 2em;">${digest.upcomingMeetings}</h3>
              <p style="margin: 5px 0; color: #666;">Upcoming Meetings</p>
            </div>
          </div>
          
          <a href="${config.frontendUrl}/dashboard" style="display: inline-block; background: #0078d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
            View Dashboard →
          </a>
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">CSIR-SERC Project Management Portal</p>
          <p style="margin: 5px 0; color: #999;">© ${new Date().getFullYear()} Council of Scientific and Industrial Research</p>
        </div>
      </div>
    `;

        await this.sendEmail({
            to: user.email,
            subject: `📊 CSIR-SERC Weekly Digest - ${new Date().toLocaleDateString()}`,
            html,
        });
    }

    private generateEmailTemplate(title: string, message: string, userName: string, link?: string): string {
        return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0078d4 0%, #004578 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">${title}</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #333;">Hello ${userName},</h2>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          ${link ? `
            <a href="${config.frontendUrl}${link}" style="display: inline-block; background: #0078d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
              View Details →
            </a>
          ` : ''}
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">CSIR-SERC Project Management Portal</p>
        </div>
      </div>
    `;
    }

    async getUnreadCount(userId: string): Promise<number> {
        return prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        await prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: { isRead: true },
        });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await prisma.notification.updateMany({
            where: { userId },
            data: { isRead: true },
        });
    }
}

export const notificationService = new NotificationService();
