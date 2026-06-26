"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createOrg } from "@/lib/org-api-mock";

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Enter an organisation name.").max(120),
  entity_type: z.string().trim().min(2, "Enter an entity type.").max(80),
  industry: z.string().trim().min(2, "Enter an industry.").max(80),
  jurisdiction: z.enum(["NZ", "AU"]),
});

type FormValues = z.infer<typeof createOrgSchema>;
type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  name: "",
  entity_type: "",
  industry: "",
  jurisdiction: "NZ",
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

export function CreateOrgForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setCreatedName(null);

    const parsed = createOrgSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(validationErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const organisation = await createOrg(parsed.data);
      setCreatedName(organisation.name);
      router.push("/dashboard");
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
    <Form aria-label="Create organisation" className="w-full" onSubmit={onSubmit}>
      <label className="block space-y-2 text-sm font-medium">
        <span>Organisation name</span>
        <Input
          aria-invalid={Boolean(errors.name)}
          autoComplete="organization"
          className="h-12"
          disabled={isSubmitting}
          name="name"
          onChange={(event) => updateValue("name", event.target.value)}
          placeholder="Auckland Electrical Co"
          type="text"
          value={values.name}
        />
        {errors.name ? (
          <span className="block text-xs text-destructive">{errors.name}</span>
        ) : null}
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Entity type</span>
        <Input
          aria-invalid={Boolean(errors.entity_type)}
          className="h-12"
          disabled={isSubmitting}
          name="entity_type"
          onChange={(event) => updateValue("entity_type", event.target.value)}
          placeholder="Limited company"
          type="text"
          value={values.entity_type}
        />
        {errors.entity_type ? (
          <span className="block text-xs text-destructive">
            {errors.entity_type}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Industry</span>
        <Input
          aria-invalid={Boolean(errors.industry)}
          className="h-12"
          disabled={isSubmitting}
          name="industry"
          onChange={(event) => updateValue("industry", event.target.value)}
          placeholder="Electrical services"
          type="text"
          value={values.industry}
        />
        {errors.industry ? (
          <span className="block text-xs text-destructive">
            {errors.industry}
          </span>
        ) : null}
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Jurisdiction</span>
        <select
          aria-invalid={Boolean(errors.jurisdiction)}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
          disabled={isSubmitting}
          name="jurisdiction"
          onChange={(event) =>
            updateValue("jurisdiction", event.target.value as FormValues["jurisdiction"])
          }
          value={values.jurisdiction}
        >
          <option value="NZ">New Zealand</option>
          <option value="AU">Australia</option>
        </select>
        {errors.jurisdiction ? (
          <span className="block text-xs text-destructive">
            {errors.jurisdiction}
          </span>
        ) : null}
      </label>

      {formError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {createdName ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {createdName} created. Taking you to the dashboard.
        </p>
      ) : null}

      <Button className="h-12 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Creating organisation
          </>
        ) : (
          "Create organisation"
        )}
      </Button>
    </Form>
  );
}
