import BookingSummary from "../../../components/BookingSummary";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <BookingSummary bookingId={bookingId} />;
}