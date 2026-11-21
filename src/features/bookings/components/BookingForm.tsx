import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { ParticipantPicker } from '@/features/bookings/components/ParticipantPicker';
import { useBookingDraft } from '@/features/bookings/hooks/useBookingDraft';
import { useCreateBooking } from '@/features/bookings/hooks/useCreateBooking';
import { useRoomBookings } from '@/features/bookings/hooks/useRoomBookings';
import { findConflict } from '@/features/bookings/services/bookingRules';
import { createBookingFormSchema, type BookingFormValues } from '@/features/bookings/services/bookingSchema';
import type { Booking } from '@/features/bookings/types/booking';
import type { Participant } from '@/features/bookings/types/participant';
import { Button } from '@/shared/components/Button';
import { Field } from '@/shared/components/Field';
import { colors, radius, spacing } from '@/shared/components/theme';
import { isAppError, toAppError } from '@/shared/api/types';
import { COMPANY_TIMEZONE_LABEL, combineDateAndTime, isValidDateString, isValidTimeString } from '@/shared/utils/dateTime';

export interface BookingFormProps {
  roomId: string;
  roomName?: string;
  /** Prefill from a timeline slot (`date` as `YYYY-MM-DD`, times as `HH:mm`). */
  initialValues?: Partial<Pick<BookingFormValues, 'date' | 'startTime' | 'endTime'>>;
  onCreated: (booking: Booking) => void;
}

const FIELD_NAMES = ['title', 'date', 'startTime', 'endTime', 'participantIds'] as const;
type FieldName = (typeof FIELD_NAMES)[number];

export function BookingForm({ roomId, roomName, initialValues, onCreated }: BookingFormProps) {
  const { draft, saveDraft, clearDraft } = useBookingDraft(roomId);
  const schema = useMemo(() => createBookingFormSchema(), []);
  const [participants, setParticipants] = useState<Participant[]>(draft?.participants ?? []);
  const [serverConflict, setServerConflict] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useCreateBooking();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    // A selected timeline slot wins for date/time; title and participants come from the saved draft.
    defaultValues: {
      title: draft?.values.title ?? '',
      date: initialValues?.date ?? draft?.values.date ?? '',
      startTime: initialValues?.startTime ?? draft?.values.startTime ?? '',
      endTime: initialValues?.endTime ?? draft?.values.endTime ?? '',
      participantIds: draft?.values.participantIds ?? [],
    },
  });

  const values = watch();
  const dateValid = isValidDateString(values.date);
  const roomBookings = useRoomBookings(roomId, dateValid ? values.date : '');

  // Preserve every entered field (FR-018), also across navigation.
  const serializedValues = JSON.stringify(values);
  useEffect(() => {
    saveDraft({ values: JSON.parse(serializedValues) as BookingFormValues, participants });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedValues, participants]);

  // Any edit to the time range invalidates previous server conflict/network feedback.
  const rangeKey = `${values.date}|${values.startTime}|${values.endTime}`;
  useEffect(() => {
    setServerConflict(null);
    setSubmitError(null);
  }, [rangeKey]);

  // Immediate local overlap preview using the latest room schedule (server still revalidates).
  const range =
    dateValid && isValidTimeString(values.startTime) && isValidTimeString(values.endTime)
      ? {
          startTime: combineDateAndTime(values.date, values.startTime),
          endTime: combineDateAndTime(values.date, values.endTime),
        }
      : null;
  const localConflict = range && roomBookings.data ? findConflict(roomBookings.data.bookings, roomId, range) : null;
  const conflictMessage = localConflict
    ? `Overlaps "${localConflict.title}" (${values.startTime}–${values.endTime} is already booked). Pick a different time.`
    : serverConflict;
  const availabilityUnknown = Boolean(range) && roomBookings.isError && !roomBookings.data;

  const onValid = async (form: BookingFormValues) => {
    setSubmitError(null);
    setServerConflict(null);
    if (localConflict) return;
    try {
      const booking = await mutation.mutateAsync({
        roomId,
        title: form.title.trim(),
        startTime: combineDateAndTime(form.date, form.startTime),
        endTime: combineDateAndTime(form.date, form.endTime),
        participantIds: participants.map((p) => p.id),
      });
      clearDraft();
      onCreated(booking);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'BOOKING_CONFLICT') {
        setServerConflict(appError.message);
      } else if (appError.fieldErrors) {
        for (const [field, message] of Object.entries(appError.fieldErrors)) {
          if ((FIELD_NAMES as readonly string[]).includes(field)) setError(field as FieldName, { message });
        }
        setSubmitError(appError.message);
      } else {
        setSubmitError(appError.message);
      }
    }
  };

  const canRetry = isAppError(mutation.error) ? mutation.error.isRetryable : mutation.isError;
  const submit = handleSubmit(onValid);

  return (
    <View style={styles.container} testID="booking-form">
      {roomName ? <Text style={styles.room}>{roomName}</Text> : null}
      <Text style={styles.timezone} testID="booking-timezone">
        All times are in {COMPANY_TIMEZONE_LABEL}
      </Text>

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <Field
            label="Meeting title"
            testID="booking-title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="e.g. Sprint planning"
            error={errors.title?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <Field
            label="Date"
            testID="booking-date"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            error={errors.date?.message}
          />
        )}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => (
              <Field
                label="Start time"
                testID="booking-start"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="HH:mm"
                maxLength={5}
                error={errors.startTime?.message}
              />
            )}
          />
        </View>
        <View style={styles.flex}>
          <Controller
            control={control}
            name="endTime"
            render={({ field }) => (
              <Field
                label="End time"
                testID="booking-end"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="HH:mm"
                maxLength={5}
                error={errors.endTime?.message}
              />
            )}
          />
        </View>
      </View>

      {conflictMessage ? (
        <View style={styles.conflict} testID="conflict-warning" accessibilityRole="alert">
          <Text style={styles.conflictText}>{conflictMessage}</Text>
        </View>
      ) : null}
      {availabilityUnknown ? (
        <Text style={styles.note} testID="availability-unknown">
          Couldn&apos;t check room availability. It will be verified when you submit.
        </Text>
      ) : null}

      <ParticipantPicker
        selected={participants}
        onChange={(next) => {
          setParticipants(next);
          setValue(
            'participantIds',
            next.map((p) => p.id),
            { shouldValidate: true },
          );
        }}
        error={errors.participantIds?.message}
      />

      {submitError ? (
        <View style={styles.errorBox} testID="submit-error" accessibilityRole="alert">
          <Text style={styles.errorText}>{submitError}</Text>
          {canRetry ? (
            <Button title="Retry" variant="secondary" onPress={() => void submit()} testID="submit-retry" />
          ) : null}
        </View>
      ) : null}

      <Button
        title="Book room"
        testID="submit-booking"
        onPress={() => void submit()}
        loading={mutation.isPending}
        disabled={Boolean(conflictMessage)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, padding: spacing.lg },
  room: { fontSize: 20, fontWeight: '700', color: colors.text },
  timezone: { fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  conflict: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md },
  conflictText: { color: colors.danger, fontWeight: '600' },
  note: { color: colors.warning, fontSize: 13 },
  errorBox: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, gap: spacing.sm },
  errorText: { color: colors.danger },
});
