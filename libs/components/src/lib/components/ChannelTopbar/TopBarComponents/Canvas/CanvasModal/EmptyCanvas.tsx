import { usePermissionChecker } from '@mezon/core';
import { selectCurrentChannelId } from '@mezon/store';
import { Icons } from '@mezon/ui';
import { EOverriddenPermission, EPermission } from '@mezon/utils';
import { useSelector } from 'react-redux';

type EmptyCanvasProps = {
	onClick: () => void;
};

const EmptyCanvas = ({ onClick }: EmptyCanvasProps) => {
	const currentChannelId = useSelector(selectCurrentChannelId);
	const [canManageThread] = usePermissionChecker([EOverriddenPermission.manageThread, EPermission.viewChannel], currentChannelId ?? '');
	const handleCreateCanvas = () => {
		onClick();
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] p-12">
			<button className="relative mx-auto mb-4 p-[22px] rounded-full cursor-default">
				<Icons.ThreadEmpty className="w-9 h-9 " />
				<Icons.EmptyUnreadStyle className="w-[104px] h-[80px] absolute top-0 left-[-10px] " />
			</button>
			<h2 className="text-2xl font-semibold mb-2">There are no canvas.</h2>
			<p className="text-base text-center">Stay focused on a conversation with a canvas - a temporary text channel.</p>
			{canManageThread && (
				<button
					onClick={handleCreateCanvas}
					className="mt-6 py-3 px-2  font-medium text-sm rounded-lg focus:ring-transparent btn-primary btn-primary-hover"
				>
					Create Canvas
				</button>
			)}
		</div>
	);
};

export default EmptyCanvas;
