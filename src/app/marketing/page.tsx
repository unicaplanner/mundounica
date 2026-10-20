import { MapaMental } from "@/components/marketing/MapaMental";
import { MAPA_MARKETING } from "@/lib/marketing/mapa";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  return <MapaMental bracos={MAPA_MARKETING} />;
}
