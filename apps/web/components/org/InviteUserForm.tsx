"use client";

import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { inviteUser } from "@/lib/org-api-mock";

const inviteUserSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  role: z.enum(["admin", "member"]),
});

type FormValues = z.infer<typeof inviteUserSchema>;
type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  email: "",
  role: "member",
};

function validationErrors(error: z.ZodError<FormValues>) {
  return error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof FormValues | undefined;

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

type InviteUserFormProps = {
  orgId?: string;
};

export function InviteUserForm({ orgId = "org_mock_current" }: InviteUserFormProps) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSentEmail(null);

    const parsed = inviteUserSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(validationErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const invite = await inviteUser({
        org_id: orgId,
        email: parsed.data.email,
        role: parsed.data.role,
      });
      setSentEmail(invite.email);
      setValues(initialValues);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateValue<Field extends keyof FormValues>(
    field: Field,
    value: FormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <Form aria-label="Invite user" className="w-full" onSubmit={onSubmit}>
      {/* Actual email delivery belongs in the backend Resend workflow; this UI only calls org.invite. */}
      <label className="block space-y-2 text-sm font-medium">
        <span>Email</span>
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="h-12"
          disabled={isSubmitting}
          name="email"
          onChange={(event) => updateValue("email", event.target.value)}
          placeholder="teammate@example.com"
          type="email"
          value={values.email}
        />
        {errors.email ? (
          <span className="block text-xs text-destructive">{errors.email}</span>
        ) : null}
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Role</span>
        <select
          aria-invalid={Boolean(errors.role)}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
          disabled={isSubmitting}
          name="role"
          onChange={(event) =>
            updateValue("role", event.target.value as FormValues["role"])
          }
          value={values.role}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role ? (
          <span className="block text-xs text-destructive">{errors.role}</span>
        ) : null}
      </label>

      {formError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {sentEmail ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          Invite sent to {sentEmail}.
        </p>
      ) : null}

      <Button className="h-12 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Sending invite
          </>
        ) : (
          "Send invite"
        )}
      </Button>
    </Form>
  );
}
