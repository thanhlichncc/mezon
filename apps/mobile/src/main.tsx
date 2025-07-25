import { registerGlobals } from '@livekit/react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './app/navigation';
import CustomIncomingCall from './app/screens/customIncomingCall';
import { isNotificationProcessed } from './app/utils/notificationCache';
import { createLocalNotification, setupIncomingCall } from './app/utils/pushNotificationHelpers';
const messaging = getMessaging(getApp());

const isValidString = (value: unknown): value is string => {
	return typeof value === 'string' && value.trim().length > 0;
};

registerGlobals();
enableScreens(true);

setBackgroundMessageHandler(messaging, async (remoteMessage) => {
	try {
		const offer = remoteMessage?.data?.offer;

		// Safe handling of offer data (calls are always processed)
		if (offer && isValidString(offer)) {
			await setupIncomingCall(offer);
			return;
		}

		// Safe handling of notification data
		if (!remoteMessage?.notification && remoteMessage?.data) {
			const { title, body } = remoteMessage.data;

			if (isValidString(title) && isValidString(body)) {
				// Check if this notification was already processed
				const isProcessed = await isNotificationProcessed(title, body);

				if (!isProcessed) {
					// Only create notification if not a duplicate
					await createLocalNotification(title, body, remoteMessage.data);
				}
				// If isProcessed is true, skip creating the notification (it's a duplicate)
			}
		}
	} catch (error) {
		console.error('Error handling background message:', error);
	}
});

AppRegistry.registerComponent('ComingCallApp', () => CustomIncomingCall);
AppRegistry.registerComponent('Mobile', () => App);
