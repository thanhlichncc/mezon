import { CallSignalingData } from '@mezon/components';
import { useChatSending, useSeenMessagePool } from '@mezon/core';
import { ActionEmitEvent, IOption } from '@mezon/mobile-components';
import { size } from '@mezon/mobile-ui';
import {
	directActions,
	directMetaActions,
	getStore,
	groupCallActions,
	messagesActions,
	selectAllAccount,
	selectDmGroupCurrent,
	selectLastMessageByChannelId,
	selectLastSeenMessageStateByChannelId,
	selectMemberClanByUserId2,
	useAppDispatch,
	useAppSelector
} from '@mezon/store-mobile';
import { IMessageTypeCallLog, TypeMessage, WEBRTC_SIGNALING_TYPES, createImgproxyUrl, sleep } from '@mezon/utils';
import { useNavigation } from '@react-navigation/native';
import { ChannelStreamMode, ChannelType } from 'mezon-js';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { DeviceEventEmitter, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import MezonIconCDN from '../../../componentUI/MezonIconCDN';
import { useSendSignaling } from '../../../components/CallingGroupModal';
import ImageNative from '../../../components/ImageNative';
import { UserStatus } from '../../../components/UserStatus';
import { IconCDN } from '../../../constants/icon_cdn';
import useTabletLandscape from '../../../hooks/useTabletLandscape';
import { APP_SCREEN } from '../../../navigation/ScreenTypes';
import { getUserStatusByMetadata } from '../../../utils/helpers';
import { ConfirmBuzzMessageModal } from '../../home/homedrawer/components/ConfirmBuzzMessage';
import { OptionChannelHeader } from '../../home/homedrawer/components/HeaderOptions';
import HeaderTooltip from '../../home/homedrawer/components/HeaderTooltip';

interface HeaderProps {
	from?: string;
	styles: any;
	themeValue: any;
	directMessageId: string;
}
export const ChannelSeen = memo(({ channelId, streamMode }: { channelId: string; streamMode: number }) => {
	const dispatch = useAppDispatch();
	const lastMessage = useAppSelector((state) => selectLastMessageByChannelId(state, channelId));
	const lastMessageState = useSelector((state) => selectLastSeenMessageStateByChannelId(state, channelId as string));
	const { markAsReadSeen } = useSeenMessagePool();
	const isMounted = useRef(false);

	const markMessageAsRead = useCallback(() => {
		if (!lastMessage) return;
		if (!lastMessageState) {
			markAsReadSeen(lastMessage, streamMode, 0);
			return;
		}
		if (
			lastMessage?.create_time_seconds &&
			lastMessageState?.timestamp_seconds &&
			lastMessage?.create_time_seconds >= lastMessageState?.timestamp_seconds
		) {
			markAsReadSeen(lastMessage, streamMode, 0);
		}
	}, [lastMessage?.id, lastMessageState, markAsReadSeen, streamMode]);

	const updateChannelSeenState = useCallback(
		(channelId: string) => {
			dispatch(directActions.setActiveDirect({ directId: channelId }));
		},
		[dispatch]
	);

	useEffect(() => {
		if (lastMessage) {
			dispatch(directMetaActions.updateLastSeenTime(lastMessage));
			markMessageAsRead();
		}
	}, [lastMessage?.id, markMessageAsRead, dispatch, channelId]);

	useEffect(() => {
		if (isMounted.current || !lastMessage) return;
		isMounted.current = true;
		updateChannelSeenState(channelId);
	}, [channelId, lastMessage?.id, updateChannelSeenState]);

	return null;
});

const HeaderDirectMessage: React.FC<HeaderProps> = ({ from, styles, themeValue, directMessageId }) => {
	const currentDmGroup = useSelector(selectDmGroupCurrent(directMessageId ?? ''));
	const navigation = useNavigation<any>();
	const isTabletLandscape = useTabletLandscape();
	const user = useSelector((state) => selectMemberClanByUserId2(state, currentDmGroup?.user_id?.[0]));
	const status = getUserStatusByMetadata(user?.user?.metadata);
	const dispatch = useAppDispatch();
	const { sendSignalingToParticipants } = useSendSignaling();

	const mode = currentDmGroup?.type === ChannelType.CHANNEL_TYPE_DM ? ChannelStreamMode.STREAM_MODE_DM : ChannelStreamMode.STREAM_MODE_GROUP;
	const { sendMessage } = useChatSending({ mode, channelOrDirect: currentDmGroup });
	const isTypeDMGroup = useMemo(() => {
		return Number(currentDmGroup?.type) === ChannelType.CHANNEL_TYPE_GROUP;
	}, [currentDmGroup?.type]);

	const dmLabel = useMemo(() => {
		return (currentDmGroup?.channel_label ||
			(typeof currentDmGroup?.usernames === 'string' ? currentDmGroup?.usernames : currentDmGroup?.usernames?.[0] || '')) as string;
	}, [currentDmGroup?.channel_label, currentDmGroup?.usernames]);

	const dmAvatar = useMemo(() => {
		return currentDmGroup?.channel_avatar?.[0];
	}, [currentDmGroup?.channel_avatar?.[0]]);

	const streamMode = useMemo(() => {
		return currentDmGroup?.type === ChannelType.CHANNEL_TYPE_DM ? ChannelStreamMode.STREAM_MODE_DM : ChannelStreamMode.STREAM_MODE_GROUP;
	}, [currentDmGroup?.type]);

	const navigateToThreadDetail = useCallback(() => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_PANEL_KEYBOARD_BOTTOM_SHEET, {
			isShow: false
		});
		navigation.navigate(APP_SCREEN.MENU_THREAD.STACK, { screen: APP_SCREEN.MENU_THREAD.BOTTOM_SHEET, params: { directMessage: currentDmGroup } });
	}, [currentDmGroup, navigation]);

	const handleBack = useCallback(() => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_PANEL_KEYBOARD_BOTTOM_SHEET, {
			isShow: false
		});
		if (APP_SCREEN.MESSAGES.NEW_GROUP === from) {
			navigation.navigate(APP_SCREEN.MESSAGES.HOME);
			return;
		}
		navigation.goBack();
	}, [from, navigation]);

	const goToCall = () => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_PANEL_KEYBOARD_BOTTOM_SHEET, {
			isShow: false
		});
		if (isTypeDMGroup) {
			const data = {
				channelId: currentDmGroup.channel_id || '',
				roomName: currentDmGroup?.meeting_code,
				clanId: '',
				isGroupCall: true,
				participantsCount: currentDmGroup?.user_id?.length || 0
			};
			DeviceEventEmitter.emit(ActionEmitEvent.ON_OPEN_MEZON_MEET, data);
			const store = getStore();
			const state = store.getState();
			const userProfile = selectAllAccount(state);
			dispatch(
				groupCallActions.showPreCallInterface({
					groupId: currentDmGroup?.channel_id,
					isVideo: false
				})
			);
			const callOfferAction = {
				is_video: false,
				group_id: currentDmGroup?.channel_id,
				group_name: currentDmGroup?.channel_label,
				group_avatar: currentDmGroup?.channel_avatar?.[0],
				caller_id: userProfile?.user?.id,
				caller_name: userProfile?.user?.display_name || userProfile?.user?.username || '',
				caller_avatar: userProfile?.user?.avatar_url,
				meeting_code: currentDmGroup?.meeting_code,
				clan_id: '',
				timestamp: Date.now(),
				participants: currentDmGroup?.user_id || []
			};
			sendSignalingToParticipants(
				currentDmGroup?.user_id || [],
				WEBRTC_SIGNALING_TYPES.GROUP_CALL_OFFER,
				callOfferAction as CallSignalingData,
				currentDmGroup?.channel_id || '',
				userProfile?.user?.id || ''
			);
			dispatch(
				messagesActions.sendMessage({
					channelId: currentDmGroup?.channel_id,
					clanId: '',
					mode: ChannelStreamMode.STREAM_MODE_GROUP,
					isPublic: true,
					content: {
						t: `Started voice call`,
						callLog: {
							isVideo: false,
							callLogType: IMessageTypeCallLog.STARTCALL,
							showCallBack: false
						}
					},
					anonymous: false,
					senderId: userProfile?.user?.id || '',
					avatar: userProfile?.user?.avatar_url || '',
					isMobile: true,
					username: currentDmGroup?.channel_label || ''
				})
			);
			return;
		}
		navigation.navigate(APP_SCREEN.MENU_CHANNEL.STACK, {
			screen: APP_SCREEN.MENU_CHANNEL.CALL_DIRECT,
			params: {
				receiverId: currentDmGroup?.user_id?.[0],
				receiverAvatar: dmAvatar,
				directMessageId
			}
		});
	};

	const headerOptions: IOption[] = [
		{
			title: 'buzz',
			content: 'Buzz',
			value: OptionChannelHeader.Buzz,
			icon: <MezonIconCDN icon={IconCDN.buzz} color={themeValue.textStrong} height={size.s_18} width={size.s_18} />
		}
	];

	const onPressOption = (option: IOption) => {
		if (option?.value === OptionChannelHeader.Buzz) {
			handleActionBuzzMessage();
		}
	};

	const handleActionBuzzMessage = async () => {
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_BOTTOM_SHEET, { isDismiss: true });
		await sleep(500);
		const data = {
			children: <ConfirmBuzzMessageModal onSubmit={handleBuzzMessage} />
		};
		DeviceEventEmitter.emit(ActionEmitEvent.ON_TRIGGER_MODAL, { isDismiss: false, data });
	};

	const handleBuzzMessage = (text: string) => {
		sendMessage({ t: text || 'Buzz!!' }, [], [], [], undefined, undefined, undefined, TypeMessage.MessageBuzz);
	};

	const navigateToSearch = () => {
		navigation.navigate(APP_SCREEN.MENU_CHANNEL.STACK, {
			screen: APP_SCREEN.MENU_CHANNEL.SEARCH_MESSAGE_DM,
			params: {
				currentChannel: currentDmGroup
			}
		});
	};

	return (
		<View style={styles.headerWrapper}>
			<ChannelSeen channelId={directMessageId || ''} streamMode={streamMode} />
			{!isTabletLandscape && (
				<Pressable onPress={handleBack} style={styles.backButton}>
					<MezonIconCDN icon={IconCDN.arrowLargeLeftIcon} color={themeValue.text} height={size.s_20} width={size.s_20} />
				</Pressable>
			)}
			<Pressable style={styles.channelTitle} onPress={navigateToThreadDetail}>
				{isTypeDMGroup ? (
					<View style={styles.groupAvatar}>
						<MezonIconCDN icon={IconCDN.groupIcon} width={18} height={18} />
					</View>
				) : (
					<View style={styles.avatarWrapper}>
						{dmAvatar ? (
							<View style={styles.friendAvatar}>
								<ImageNative
									url={createImgproxyUrl(dmAvatar ?? '', { width: 100, height: 100, resizeType: 'fit' })}
									style={{ width: '100%', height: '100%' }}
									resizeMode={'cover'}
								/>
							</View>
						) : (
							<View style={styles.wrapperTextAvatar}>
								<Text style={[styles.textAvatar]}>{dmLabel?.charAt?.(0)?.toUpperCase()}</Text>
							</View>
						)}
						<UserStatus status={{ status: currentDmGroup?.is_online?.some(Boolean), isMobile: false }} customStatus={status} />
					</View>
				)}
				<Text style={styles.titleText} numberOfLines={1}>
					{dmLabel}
				</Text>
				<View style={styles.iconWrapper}>
					<TouchableOpacity style={[styles.iconHeader, { marginRight: size.s_6 }]} onPress={navigateToSearch}>
						<MezonIconCDN icon={IconCDN.magnifyingIcon} width={size.s_18} height={size.s_18} color={themeValue.text} />
					</TouchableOpacity>
					{((!isTypeDMGroup && !!currentDmGroup?.user_id?.[0]) || (isTypeDMGroup && !!currentDmGroup?.meeting_code)) && (
						<TouchableOpacity style={styles.iconHeader} onPress={goToCall}>
							<MezonIconCDN icon={IconCDN.phoneCallIcon} width={size.s_18} height={size.s_18} color={themeValue.text} />
						</TouchableOpacity>
					)}

					<View style={styles.iconOption}>
						<HeaderTooltip onPressOption={onPressOption} options={headerOptions} />
					</View>
				</View>
			</Pressable>
		</View>
	);
};

export default React.memo(HeaderDirectMessage);
