"use client";

import * as React from "react";
import { useActionState } from "react";

import { changePasswordAction } from "@/actions/auth";
import type { ActionResult } from "@/actions/student";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null,
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="max-w-md space-y-5">
      {state?.message && <Alert variant="success">{state.message}</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <Field label="Current password" htmlFor="current_password" error={state?.fieldErrors?.current_password}>
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="new_password" error={state?.fieldErrors?.new_password} hint="At least 8 characters.">
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm_password" error={state?.fieldErrors?.confirm_password}>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" loading={pending}>
        Change password
      </Button>
    </form>
  );
}