import { useTranslations } from "next-intl";
import { ListingForm } from "~/components/listings/listing-form";

export default function CreateListingPage() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("listing.createListing")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          List your bulk items for sale to the community. All listings are
          reviewed before publication.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <ListingForm mode="create" />
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 p-4">
        <h3 className="text-sm font-medium text-blue-900">
          How it works:
        </h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>Create your listing with detailed information and photos</li>
          <li>Submit for review - our team will verify within 24 hours</li>
          <li>Once approved, buyers can reserve with a 5% deposit</li>
          <li>Complete the sale in person at your pickup location</li>
          <li>Receive 95% balance payment at pickup</li>
        </ul>
      </div>
    </div>
  );
}
