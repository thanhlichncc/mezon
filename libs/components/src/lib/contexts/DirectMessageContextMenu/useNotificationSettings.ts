import { SetMuteNotificationPayload, SetNotificationPayload, notificationSettingActions, useAppDispatch } from '@mezon/store';
import { format } from 'date-fns';
import { ChannelType } from 'mezon-js';
import { useCallback, useEffect, useState } from 'react';

interface UseNotificationSettingsParams {
	channelId?: string;
	notificationSettings?: any;
	getChannelId?: string;
}

export function useNotificationSettings({ channelId, notificationSettings, getChannelId }: UseNotificationSettingsParams) {
	const dispatch = useAppDispatch();
	const [mutedUntilText, setMutedUntilText] = useState<string>('');
	const [nameChildren, setNameChildren] = useState<string>('');

	const muteOrUnMuteChannel = useCallback(
		(channelId: string, active: number) => {
			if (!channelId) return;

			const body = {
				channel_id: channelId,
				notification_type: 0,
				clan_id: '',
				active: active,
				is_current_channel: true
			};
			dispatch(notificationSettingActions.setMuteNotificationSetting(body));
		},
		[dispatch]
	);

	const handleScheduleMute = useCallback(
		(channelId: string, channelType: number, duration: number) => {
			if (!channelId) return;

			if (duration !== Infinity) {
				const now = new Date();
				const unmuteTime = new Date(now.getTime() + duration);
				const unmuteTimeISO = unmuteTime.toISOString();

				const body: SetNotificationPayload = {
					channel_id: channelId,
					notification_type: 0,
					clan_id: '',
					time_mute: unmuteTimeISO,
					is_current_channel: true,
					is_direct: channelType === ChannelType.CHANNEL_TYPE_DM || channelType === ChannelType.CHANNEL_TYPE_GROUP
				};
				dispatch(notificationSettingActions.setNotificationSetting(body));
			} else {
				const body: SetMuteNotificationPayload = {
					channel_id: channelId,
					notification_type: 0,
					clan_id: '',
					active: 0,
					is_current_channel: true
				};
				dispatch(notificationSettingActions.setMuteNotificationSetting(body));
			}
		},
		[dispatch]
	);

	const getNotificationSetting = useCallback(
		async (channelId?: string) => {
			if (channelId) {
				await dispatch(
					notificationSettingActions.getNotificationSetting({
						channelId: channelId
					})
				);
			}
		},
		[dispatch]
	);

	useEffect(() => {
		if (notificationSettings?.active === 1 || notificationSettings?.id === '0') {
			setNameChildren(`Mute`);
			setMutedUntilText('');
		} else {
			setNameChildren(`UnMute`);

			if (notificationSettings?.time_mute) {
				const timeMute = new Date(notificationSettings.time_mute);
				const currentTime = new Date();
				if (timeMute > currentTime) {
					const timeDifference = timeMute.getTime() - currentTime.getTime();
					const formattedDate = format(timeMute, 'dd/MM, HH:mm');
					setMutedUntilText(`Muted until ${formattedDate}`);

					setTimeout(() => {
						const channelId = getChannelId;
						if (channelId) {
							const body = {
								channel_id: channelId,
								notification_type: notificationSettings?.notification_setting_type || 0,
								clan_id: '',
								active: 1,
								is_current_channel: true
							};
							dispatch(notificationSettingActions.setMuteNotificationSetting(body));
						}
					}, timeDifference);
				}
			}
		}
	}, [notificationSettings, dispatch, getChannelId]);

	return {
		mutedUntilText,
		nameChildren,
		muteOrUnMuteChannel,
		handleScheduleMute,
		getNotificationSetting
	};
}
