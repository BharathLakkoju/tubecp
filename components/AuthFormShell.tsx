"use client";

import Reveal from "@/components/motion/Reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Full-page auth card on its own route (repo rule `no-modals`). */
export default function AuthFormShell({ title, subtitle, children }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-12 sm:py-16">
      <Reveal immediate>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-headline">{title}</h1>
            </CardTitle>
            <CardDescription className="text-body">{subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
