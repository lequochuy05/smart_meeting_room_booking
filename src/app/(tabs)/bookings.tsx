import { useAuth } from '@/features/auth/hooks/useAuth';
import { MyBookingsScreen } from '@/features/bookings/components/MyBookingsScreen';

export default function BookingsTab() {
  const employeeId = useAuth((state) => state.employee?.id);
  return <MyBookingsScreen currentEmployeeId={employeeId} />;
}
