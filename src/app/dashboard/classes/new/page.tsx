import { Suspense } from "react";
import AddClassForm from "./add-class-form";

export default function AddClassPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[30vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading…
        </div>
      }
    >
      <AddClassForm />
    </Suspense>
  );
}
