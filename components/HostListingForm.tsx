"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import Navbar from "./Navbar";

const amenityOptions = ["WiFi", "Kitchen", "Washer", "Dryer", "Air conditioning", "Heating", "Dedicated workspace", "TV", "Hair dryer", "Iron", "Pool", "Hot tub", "Free parking", "EV charger", "Crib", "Gym", "BBQ grill", "Breakfast", "Indoor fireplace", "Smoking allowed", "Pets allowed", "Beach access", "Lake access", "Ski-in/ski-out", "Outdoor dining area"];

const initialForm = {
  title: "", description: "", propertyType: "entire place", category: "Design", address: "", location: "", region: "", country: "United States",
  latitude: "40.7128", longitude: "-74.0060", guests: "2", bedrooms: "1", beds: "1", bathrooms: "1", pricePerNight: "", cleaningFee: "", serviceFeePercent: "12",
  minNights: "1", maxNights: "30", checkInTime: "15:00", checkOutTime: "11:00", instantBook: true, houseRules: "",
};

type FormValues = typeof initialForm;

export default function HostListingForm() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [amenities, setAmenities] = useState<string[]>(["WiFi"]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const generateUploadUrl = useMutation(api.myFunctions.generateListingUploadUrl);
  const createListing = useMutation(api.myFunctions.createListing);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace(`/sign-in?redirect_url=${encodeURIComponent("/become-a-host")}`);
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => () => photoPreviews.forEach((preview) => URL.revokeObjectURL(preview)), [photoPreviews]);

  const update = (field: keyof FormValues, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));
  const toggleAmenity = (amenity: string) => setAmenities((current) => current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]);
  const choosePhotos = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 8);
    setPhotoPreviews((current) => { current.forEach((preview) => URL.revokeObjectURL(preview)); return selected.map((file) => URL.createObjectURL(file)); });
    setPhotos(selected);
  };
  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setPhotoPreviews((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };
  const number = (value: string) => Number(value);

  const submit = async (status: "draft" | "published") => {
    setError("");
    if (!isSignedIn) { router.replace(`/sign-in?redirect_url=${encodeURIComponent("/become-a-host")}`); return; }
    if (status === "published" && (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.country.trim() || !form.pricePerNight)) return setError("Complete the title, description, location, country, and nightly price before publishing.");
    if (status === "published" && photos.length === 0) return setError("Add at least one photo before publishing your listing.");
    if (number(form.minNights) < 1 || number(form.maxNights) < number(form.minNights)) return setError("Maximum nights must be greater than or equal to minimum nights.");
    setIsSaving(true);
    try {
      const photoStorageIds: Id<"_storage">[] = [];
      for (const photo of photos) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": photo.type }, body: photo });
        if (!response.ok) throw new Error("A photo could not be uploaded.");
        const result = await response.json() as { storageId?: Id<"_storage"> };
        if (!result.storageId) throw new Error("A photo upload did not complete.");
        photoStorageIds.push(result.storageId);
      }
      const listingId = await createListing({
        title: form.title, description: form.description, propertyType: form.propertyType, category: form.category,
        address: form.address, location: form.location, region: form.region, country: form.country,
        latitude: number(form.latitude), longitude: number(form.longitude), guests: number(form.guests), bedrooms: number(form.bedrooms),
        beds: number(form.beds), bathrooms: number(form.bathrooms), pricePerNight: number(form.pricePerNight), cleaningFee: number(form.cleaningFee),
        serviceFeePercent: number(form.serviceFeePercent), minNights: number(form.minNights), maxNights: number(form.maxNights),
        checkInTime: form.checkInTime, checkOutTime: form.checkOutTime, instantBook: form.instantBook, amenities, houseRules: form.houseRules,
        photoStorageIds, status,
      });
      router.push(status === "published" ? `/listings/${listingId}` : "/host");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We could not create your listing.");
      setIsSaving(false);
    }
  };

  if (!isLoaded || !isSignedIn) return <main className="listing-form-page"><Navbar /><div className="detail-loading">Checking your host access...</div></main>;

  return <main className="listing-form-page">
    <Navbar />
    <div className="listing-form-shell">
      <Link className="back-link" href="/host"><ArrowLeft size={16} /> Host dashboard</Link>
      <header className="listing-form-heading"><p className="eyebrow">Become a host</p><h1>Create a listing</h1><p>Share a place with thoughtful travelers. You can publish it when the details feel right.</p></header>
      <form className="listing-form" onSubmit={(event) => { event.preventDefault(); void submit("published"); }}>
        <section className="listing-form-section"><h2>Title</h2><label>Listing title<input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="The Glass House" /></label></section>
        <section className="listing-form-section"><h2>Description</h2><label>Tell guests about your place<textarea required rows={5} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What makes this place worth the journey?" /></label></section>
        <section className="listing-form-section"><h2>Type</h2><div className="form-grid form-grid-two"><label>Property type<select value={form.propertyType} onChange={(event) => update("propertyType", event.target.value)}><option value="entire place">Entire place</option><option value="private room">Private room</option><option value="shared room">Shared room</option></select></label><label>Category<select value={form.category} onChange={(event) => update("category", event.target.value)}><option>Design</option><option>Cabins</option><option>Beach</option><option>Tropical</option><option>City</option></select></label></div></section>
        <section className="listing-form-section"><h2>Location</h2><div className="form-grid"><label className="form-span-two">Address<input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="123 Main Street" /></label><label>City / locality<input required value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Joshua Tree" /></label><label>Region / state<input value={form.region} onChange={(event) => update("region", event.target.value)} /></label><label>Country<input required value={form.country} onChange={(event) => update("country", event.target.value)} /></label><label>Latitude<input type="number" step="any" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} /></label><label>Longitude<input type="number" step="any" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></label></div></section>
        <section className="listing-form-section"><h2>Capacity</h2><div className="form-grid form-grid-four">{([["guests", "Guests"], ["bedrooms", "Bedrooms"], ["beds", "Beds"], ["bathrooms", "Bathrooms"]] as const).map(([field, label]) => <label key={field}>{label}<input required type="number" min="1" value={form[field]} onChange={(event) => update(field, event.target.value)} /></label>)}</div></section>
        <section className="listing-form-section"><h2>Pricing &amp; Stay Rules</h2><div className="form-grid form-grid-three"><label>Nightly price<input required type="number" min="1" value={form.pricePerNight} onChange={(event) => update("pricePerNight", event.target.value)} placeholder="250" /></label><label>Cleaning fee<input required type="number" min="0" value={form.cleaningFee} onChange={(event) => update("cleaningFee", event.target.value)} placeholder="35" /></label><label>Service fee %<input required type="number" min="0" max="100" value={form.serviceFeePercent} onChange={(event) => update("serviceFeePercent", event.target.value)} /></label><label>Minimum nights<input required type="number" min="1" value={form.minNights} onChange={(event) => update("minNights", event.target.value)} /></label><label>Maximum nights<input required type="number" min="1" value={form.maxNights} onChange={(event) => update("maxNights", event.target.value)} /></label><label>Check-in time<input required type="time" value={form.checkInTime} onChange={(event) => update("checkInTime", event.target.value)} /></label><label>Check-out time<input required type="time" value={form.checkOutTime} onChange={(event) => update("checkOutTime", event.target.value)} /></label></div><label className="checkbox-label"><input type="checkbox" checked={form.instantBook} onChange={(event) => update("instantBook", event.target.checked)} /> Instant book</label></section>
        <section className="listing-form-section"><h2>Amenities</h2><div className="amenity-form-grid">{amenityOptions.map((amenity) => <label className="amenity-option" key={amenity}><input type="checkbox" checked={amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} /> {amenity}</label>)}</div></section>
        <section className="listing-form-section"><h2>House Rules</h2><label>What should guests know?<textarea rows={4} value={form.houseRules} onChange={(event) => update("houseRules", event.target.value)} placeholder="No smoking&#10;No parties or events" /></label></section>
        <section className="listing-form-section"><div className="form-section-heading"><h2>Photos</h2><label className="photo-picker"><ImagePlus size={16} /> Add photos<input type="file" accept="image/*" multiple onChange={(event) => choosePhotos(event.target.files)} /></label></div><p className="form-help">Add up to 8 photos. The first photo becomes the listing cover.</p>{photoPreviews.length ? <div className="photo-grid">{photoPreviews.map((preview, index) => <div className="photo-preview" key={preview}><img src={preview} alt={`Listing photo ${index + 1}`} /><button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><X size={14} /></button></div>)}</div> : <div className="photo-empty"><Plus size={20} /> Your photos will appear here</div>}</section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="listing-form-actions"><Link className="form-cancel" href="/host">Cancel</Link><div className="listing-form-submit-group"><button className="form-draft" type="button" disabled={isSaving} onClick={() => void submit("draft")}>{isSaving ? <LoaderCircle className="spin" size={16} /> : "Save as Draft"}</button><button className="form-submit" type="submit" disabled={isSaving}>{isSaving ? <><LoaderCircle className="spin" size={16} /> Saving...</> : "Create listing"}</button></div></div>
      </form>
    </div>
  </main>;
}
