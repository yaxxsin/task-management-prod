# Notification System

## Overview
The notification system provides real-time alerts for task due dates and other important events in your AR Generator application.

## Features

### 1. **Due Date Notifications**
- **Overdue Alerts**: Get notified when tasks pass their due date
- **Due Soon Alerts**: Receive advance warnings before tasks are due
- **Configurable Threshold**: Set how many days in advance you want to be notified (1-7 days)

### 2. **Notification Center**
- Bell icon in the header shows unread notification count
- Click to view all notifications in a dropdown
- Mark individual notifications as read
- Mark all notifications as read at once
- Clear individual or all notifications
- Click on task notifications to open task details

### 3. **Browser Notifications**
- Optional desktop notifications
- Requires browser permission
- Works even when the app is in the background

### 4. **Notification Settings**
Access notification settings via:
1. Click your profile in the header
2. Select "Settings"
3. Navigate to "Notifications" tab

Available settings:
- **Enable/Disable Notifications**: Master toggle for all notifications
- **Overdue Notifications**: Toggle for overdue task alerts
- **Due Soon Notifications**: Toggle for upcoming task alerts
- **Due Soon Threshold**: Configure how many days before due date to notify
- **Task Assignment Notifications**: Get notified when assigned to tasks
- **Browser Notifications**: Enable desktop notifications
- **Sound**: Play sound when notifications arrive (coming soon)

## How It Works

### Automatic Checking
- The system checks for due dates when the app loads
- Checks run every 5 minutes automatically
- Notifications are created for:
  - Tasks that are overdue (past due date)
  - Tasks due within your configured threshold

### Notification Types
- 🔔 **Due Soon**: Task is approaching its due date
- ⚠️ **Overdue**: Task has passed its due date
- 👤 **Task Assigned**: You've been assigned to a task
- ✅ **Task Completed**: A task has been completed
- 💬 **Comment Added**: New comment on a task

## Usage Tips

1. **Enable Browser Notifications**: For the best experience, enable browser notifications to get alerts even when the app isn't focused

2. **Adjust Threshold**: If you're getting too many "due soon" notifications, increase the threshold days. If you want more advance notice, decrease it.

3. **Clear Old Notifications**: Regularly clear read notifications to keep your notification center clean

4. **Click to View**: Click on any task notification to jump directly to that task's details

## Technical Details

### Components
- `NotificationCenter.tsx`: Main notification UI component
- `NotificationCenter.css`: Styling for the notification center

### Store Actions
- `addNotification()`: Add a new notification
- `markNotificationAsRead()`: Mark single notification as read
- `markAllNotificationsAsRead()`: Mark all as read
- `clearNotification()`: Remove a notification
- `clearAllNotifications()`: Clear all notifications
- `updateNotificationSettings()`: Update notification preferences
- `checkDueDates()`: Check tasks and create notifications

### Data Structure
```typescript
interface Notification {
  id: string;
  type: 'due_soon' | 'overdue' | 'task_assigned' | 'task_completed' | 'comment_added';
  title: string;
  message: string;
  taskId?: string;
  taskName?: string;
  isRead: boolean;
  createdAt: string;
  dueDate?: string;
}

interface NotificationSettings {
  enabled: boolean;
  dueSoonDays: number;
  browserNotifications: boolean;
  soundEnabled: boolean;
  notifyOnOverdue: boolean;
  notifyOnDueSoon: boolean;
  notifyOnAssignment: boolean;
}
```

## Future Enhancements
- Sound notifications
- Email notifications
- Slack/Teams integration
- Custom notification rules
- Snooze functionality
- Notification history
