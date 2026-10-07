"use client";

import { useId } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Inline form outcome. Always icon + text, never color alone (design system 3.3). */
export function FormAlert({
  kind,
  children,
  className,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const isError = kind === "error";
  return (
    <Alert
      variant={isError ? "destructive" : "success"}
      role={isError ? "alert" : "status"}
      className={className}
    >
      {isError ? <WarningCircle weight="fill" aria-hidden /> : <CheckCircle weight="fill" aria-hidden />}
      <AlertDescription className="text-foreground">{children}</AlertDescription>
    </Alert>
  );
}

type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  label: string;
  description?: React.ReactNode;
};

/** Label + Input + optional description, wired with ids. */
export function TextField({ label, description, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-describedby={description ? `${id}-desc` : undefined} {...inputProps} />
      {description && <FieldDescription id={`${id}-desc`}>{description}</FieldDescription>}
    </Field>
  );
}

/** A titled settings card. `danger` marks irreversible actions with a destructive-tinted border. */
export function SettingsSection({
  title,
  description,
  children,
  danger = false,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn(danger && "border-destructive/40", className)}>
      <CardHeader>
        <CardTitle className={cn(danger && "text-destructive")}>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

/** Page title block for app pages. */
export function PageHeading({
  title,
  description,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <h1 className="text-headline text-foreground">{title}</h1>
      {description && <p className="text-body text-foreground-secondary">{description}</p>}
    </div>
  );
}
