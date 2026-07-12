import { redirect } from "next/navigation";

// El middleware ya redirige "/" según haya sesión o no; esto es respaldo.
export default function Home() {
  redirect("/panel");
}
