import { redirect } from "next/navigation";

/** `/` → the primary operator view (brain/03 §5). */
export default function Home() {
  redirect("/control-tower");
}
