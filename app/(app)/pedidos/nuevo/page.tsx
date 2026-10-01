import { Suspense } from "react";
import { NewOrderForm } from "@/components/orders/new-order-form";

export default function NuevoPedidoPage() {
  return (
    <Suspense>
      <NewOrderForm />
    </Suspense>
  );
}