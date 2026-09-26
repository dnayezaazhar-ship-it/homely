import ListingDetails from "../../../components/ListingDetails";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <ListingDetails listingId={listingId} />;
}