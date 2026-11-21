import { router, useLocalSearchParams } from 'expo-router';

import { RoomDetailScreen } from '@/features/rooms/components/RoomDetailScreen';

export default function RoomRoute() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  return (
    <RoomDetailScreen
      roomId={roomId}
      onBook={(range) =>
        router.push({
          pathname: '/booking/[roomId]',
          params: { roomId: range.roomId, date: range.date, startTime: range.startTime, endTime: range.endTime },
        })
      }
    />
  );
}
