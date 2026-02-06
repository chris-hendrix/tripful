/**
 * Example usage of CreateTripDialog component
 *
 * This is a reference implementation showing how to integrate
 * the CreateTripDialog into your application.
 */

"use client";

import { useState } from "react";
import { CreateTripDialog } from "./create-trip-dialog";
import { Button } from "@/components/ui/button";

export function CreateTripDialogExample() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsDialogOpen(true)}>Create New Trip</Button>

      <CreateTripDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
