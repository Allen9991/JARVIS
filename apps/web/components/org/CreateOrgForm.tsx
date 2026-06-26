import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function CreateOrgForm() {
  return (
    <Form aria-label="Create organisation" className="w-full max-w-md">
      {/* TODO: wire this form to org.create when Claude Code implements the procedure */}
      <label className="block space-y-2 text-sm font-medium">
        <span>Organisation name</span>
        <Input
          className="h-12"
          disabled
          name="name"
          placeholder="Coming soon"
          type="text"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Jurisdiction</span>
        <Input
          className="h-12"
          disabled
          name="jurisdiction"
          placeholder="Coming soon"
          type="text"
        />
      </label>
      <Button className="h-12 w-full" disabled type="submit">
        Coming soon
      </Button>
    </Form>
  );
}
