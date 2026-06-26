import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function InviteUserForm() {
  return (
    <div className="grid w-full max-w-md gap-6">
      <Form aria-label="Invite user">
        {/* TODO: wire this form to org.invite when Claude Code implements the procedure */}
        <label className="block space-y-2 text-sm font-medium">
          <span>Email</span>
          <Input
            className="h-12"
            disabled
            name="email"
            placeholder="Coming soon"
            type="email"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Role</span>
          <Input
            className="h-12"
            disabled
            name="role"
            placeholder="Coming soon"
            type="text"
          />
        </label>
        <Button className="h-12 w-full" disabled type="submit">
          Coming soon
        </Button>
      </Form>

      <Form aria-label="Accept invite">
        {/* TODO: wire this form to org.acceptInvite when Claude Code implements the procedure */}
        <label className="block space-y-2 text-sm font-medium">
          <span>Invite token</span>
          <Input
            className="h-12"
            disabled
            name="token"
            placeholder="Coming soon"
            type="text"
          />
        </label>
        <Button className="h-12 w-full" disabled type="submit">
          Coming soon
        </Button>
      </Form>
    </div>
  );
}
