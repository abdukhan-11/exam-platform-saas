import { PrismaClient, UserRole, NotificationChannel, EventType } from '@prisma/client';

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  webhookNotifications: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  smsFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  pushFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  eventTypes: {
    [key in EventType]: {
      email: boolean;
      sms: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
  optOutTypes: EventType[];
  collegeId: string;
}

export type DefaultPreferences = {
  [key in UserRole]: Partial<NotificationPreferences>;
}

export class NotificationPreferencesService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get default notification preferences for a user role
   */
  getDefaultPreferences(userRole: UserRole): Partial<NotificationPreferences> {
    const defaults: DefaultPreferences = {
      SUPER_ADMIN: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
        webhookNotifications: true,
        emailFrequency: 'immediate',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
        eventTypes: {
          EXAM: { email: true, sms: false, push: true, inApp: true },
          ASSIGNMENT: { email: true, sms: false, push: true, inApp: true },
          ANNOUNCEMENT: { email: true, sms: false, push: true, inApp: true },
          OTHER: { email: true, sms: false, push: true, inApp: true },
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        optOutTypes: [],
      },
      COLLEGE_ADMIN: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
        webhookNotifications: false,
        emailFrequency: 'immediate',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
        eventTypes: {
          EXAM: { email: true, sms: false, push: true, inApp: true },
          ASSIGNMENT: { email: true, sms: false, push: true, inApp: true },
          ANNOUNCEMENT: { email: true, sms: false, push: true, inApp: true },
          OTHER: { email: true, sms: false, push: true, inApp: true },
        },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        optOutTypes: [],
      },
      TEACHER: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
        webhookNotifications: false,
        emailFrequency: 'immediate',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
        eventTypes: {
          EXAM: { email: true, sms: false, push: true, inApp: true },
          ASSIGNMENT: { email: true, sms: false, push: true, inApp: true },
          ANNOUNCEMENT: { email: true, sms: false, push: true, inApp: true },
          OTHER: { email: false, sms: false, push: false, inApp: true },
        },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        optOutTypes: [],
      },
      STUDENT: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
        webhookNotifications: false,
        emailFrequency: 'immediate',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
        eventTypes: {
          EXAM: { email: true, sms: false, push: true, inApp: true },
          ASSIGNMENT: { email: true, sms: false, push: true, inApp: true },
          ANNOUNCEMENT: { email: true, sms: false, push: true, inApp: true },
          OTHER: { email: false, sms: false, push: false, inApp: true },
        },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        optOutTypes: [],
      },
    };

    return defaults[userRole] || defaults.STUDENT;
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const subscriptions = await this.prisma.eventSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length === 0) {
        return null;
      }

      // Get user info for collegeId
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { collegeId: true },
      });

      // Aggregate preferences from all subscriptions
      const emailNotifications = subscriptions.some(sub => sub.notificationChannel === 'EMAIL' && sub.isActive);
      const smsNotifications = subscriptions.some(sub => sub.notificationChannel === 'SMS' && sub.isActive);
      const pushNotifications = subscriptions.some(sub => sub.notificationChannel === 'PUSH' && sub.isActive);
      const inAppNotifications = subscriptions.some(sub => sub.notificationChannel === 'IN_APP' && sub.isActive);
      const webhookNotifications = subscriptions.some(sub => sub.notificationChannel === 'WEBHOOK' && sub.isActive);

      // Build event types preferences
      const eventTypes = {
        EXAM: { email: false, sms: false, push: false, inApp: false },
        ASSIGNMENT: { email: false, sms: false, push: false, inApp: false },
        ANNOUNCEMENT: { email: false, sms: false, push: false, inApp: false },
        OTHER: { email: false, sms: false, push: false, inApp: false },
      };

      // Populate event types based on active subscriptions
      subscriptions.forEach(sub => {
        if (sub.isActive) {
          const channel = sub.notificationChannel.toLowerCase();
          if (channel === 'email') eventTypes[sub.eventType].email = true;
          if (channel === 'sms') eventTypes[sub.eventType].sms = true;
          if (channel === 'push') eventTypes[sub.eventType].push = true;
          if (channel === 'in_app') eventTypes[sub.eventType].inApp = true;
        }
      });

      // Get optOutTypes from first subscription (assuming they're consistent)
      const optOutTypes = subscriptions[0]?.optOutTypes || [];

      return {
        userId,
        emailNotifications,
        smsNotifications,
        pushNotifications,
        inAppNotifications,
        webhookNotifications,
        emailFrequency: 'immediate', // Default
        smsFrequency: 'never', // Default
        pushFrequency: 'immediate', // Default
        eventTypes,
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        optOutTypes,
        collegeId: user?.collegeId || '',
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Get user's role and college
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, collegeId: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Merge with defaults
      const defaultPrefs = this.getDefaultPreferences(user.role);
      const mergedPreferences = {
        ...defaultPrefs,
        ...preferences,
        userId,
        collegeId: user.collegeId || '',
      };

      // Get all event types and notification channels
      const eventTypes: EventType[] = ['EXAM', 'ASSIGNMENT', 'ANNOUNCEMENT', 'OTHER'];
      const channels: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'];

      // Create or update subscriptions for each event type and channel combination
      const subscriptionPromises = eventTypes.flatMap(eventType =>
        channels.map(async (channel) => {
          const isEnabled = this.isChannelEnabledForEventType(mergedPreferences, eventType, channel);
          
          return this.prisma.eventSubscription.upsert({
            where: {
              userId_eventType_notificationChannel_collegeId: {
                userId,
                eventType,
                notificationChannel: channel,
                collegeId: user.collegeId || '',
              },
            },
            update: {
              isActive: isEnabled,
              optOutTypes: mergedPreferences.optOutTypes || [],
              preferences: mergedPreferences as any,
            },
            create: {
              userId,
              eventType,
              notificationChannel: channel,
              collegeId: user.collegeId || '',
              isActive: isEnabled,
              optOutTypes: mergedPreferences.optOutTypes || [],
              preferences: mergedPreferences as any,
            },
          });
        })
      );

      await Promise.all(subscriptionPromises);

      return mergedPreferences as NotificationPreferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Check if user should receive notification for specific event type and channel
   */
  async shouldSendNotification(
    userId: string,
    eventType: EventType,
    channel: NotificationChannel
  ): Promise<boolean> {
    try {
      // Get user's collegeId for the query
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { collegeId: true },
      });

      if (!user) {
        return false; // User not found
      }

      // Check specific subscription for this event type and channel
      const subscription = await this.prisma.eventSubscription.findUnique({
        where: {
          userId_eventType_notificationChannel_collegeId: {
            userId,
            eventType,
            notificationChannel: channel,
            collegeId: user.collegeId || '',
          },
        },
      });

      // If no subscription exists, default to true (send notification)
      if (!subscription) {
        return true;
      }

      // Check if subscription is active and not opted out
      return subscription.isActive && !subscription.optOutTypes.includes(eventType);
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  isWithinQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const timezone = preferences.quietHours.timezone;
    
    // Convert to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentTime = userTime.toTimeString().slice(0, 5); // HH:MM format
    
    const startTime = preferences.quietHours.startTime;
    const endTime = preferences.quietHours.endTime;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Check if a channel is enabled for a specific event type
   */
  private isChannelEnabledForEventType(
    preferences: Partial<NotificationPreferences>,
    eventType: EventType,
    channel: NotificationChannel
  ): boolean {
    // Check if user has opted out of this event type
    if (preferences.optOutTypes?.includes(eventType)) {
      return false;
    }

    // Check if channel is enabled globally and for this event type
    switch (channel) {
      case 'EMAIL':
        return !!(preferences.emailNotifications && preferences.eventTypes?.[eventType]?.email);
      case 'SMS':
        return !!(preferences.smsNotifications && preferences.eventTypes?.[eventType]?.sms);
      case 'PUSH':
        return !!(preferences.pushNotifications && preferences.eventTypes?.[eventType]?.push);
      case 'IN_APP':
        return !!(preferences.inAppNotifications && preferences.eventTypes?.[eventType]?.inApp);
      case 'WEBHOOK':
        return !!preferences.webhookNotifications;
      default:
        return false;
    }
  }

  /**
   * Bulk update preferences for multiple users
   */
  async bulkUpdatePreferences(
    updates: Array<{ userId: string; preferences: Partial<NotificationPreferences> }>
  ): Promise<void> {
    try {
      await Promise.all(
        updates.map(({ userId, preferences }) =>
          this.updateUserPreferences(userId, preferences)
        )
      );
    } catch (error) {
      console.error('Error in bulk update preferences:', error);
      throw new Error('Failed to update preferences for some users');
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<NotificationPreferences> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, collegeId: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const defaultPreferences = this.getDefaultPreferences(user.role);
      return this.updateUserPreferences(userId, defaultPreferences);
    } catch (error) {
      console.error('Error resetting preferences to defaults:', error);
      throw new Error('Failed to reset preferences to defaults');
    }
  }
}
