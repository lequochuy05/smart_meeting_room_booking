import { router } from 'expo-router';

import { RoomSearchScreen } from '@/features/rooms/components/RoomSearchScreen';

export default function RoomsTab() {
  return <RoomSearchScreen onOpenRoom={(roomId) => router.push(`/room/${encodeURIComponent(roomId)}`)} />;
}
