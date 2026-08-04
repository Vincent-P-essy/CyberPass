"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiMutation, demoMode } from "@/lib/api";
import { Button, Field, Input, SuccessMessage } from "./ui";

const loginSchema = z.object({
  email: z.email("Saisissez une adresse e-mail valide."),
  password: z.string().min(8, "Le mot de passe contient au moins 8 caractères.")
});
type LoginInput = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom."),
  lastName: z.string().trim().min(2, "Indiquez votre nom."),
  email: z.email("Saisissez une adresse e-mail professionnelle valide."),
  password: z
    .string()
    .min(12, "Utilisez au moins 12 caractères.")
    .regex(/[A-Z]/, "Ajoutez une majuscule.")
    .regex(/[0-9]/, "Ajoutez un chiffre.")
});
type RegisterInput = z.infer<typeof registerSchema>;

function PasswordInput({
  registration,
  autoComplete
}: {
  registration:
    | ReturnType<ReturnType<typeof useForm<LoginInput>>["register"]>
    | ReturnType<ReturnType<typeof useForm<RegisterInput>>["register"]>;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
      <Input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="px-10"
        {...registration}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-lg text-ink-600 hover:bg-mist-100"
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: demoMode ? "vincent@acme.example" : "",
      password: demoMode ? "CyberPass2026!" : ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(undefined);
    const result = await apiMutation("/auth/login", {
      method: "POST",
      body: JSON.stringify(values)
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (demoMode) setMessage(result.message);
    router.push("/dashboard");
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {demoMode && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-5 text-brand-700">
          <strong>Espace de démonstration.</strong> Les identifiants sont préremplis et aucune
          session réelle ne sera créée.
        </div>
      )}
      {message && <SuccessMessage>{message}</SuccessMessage>}
      <Field label="Adresse e-mail" error={errors.email?.message} required>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-ink-600" />
          <Input
            type="email"
            autoComplete="email"
            className="pl-10"
            placeholder="vous@entreprise.fr"
            {...register("email")}
          />
        </span>
      </Field>
      <Field label="Mot de passe" error={errors.password?.message} required>
        <PasswordInput registration={register("password")} autoComplete="current-password" />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-600 hover:text-brand-700">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
        {demoMode ? "Ouvrir l’espace de démonstration" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-ink-600">
        Nouveau sur CyberPass ?{" "}
        <Link href="/register" className="font-bold text-brand-600 hover:text-brand-700">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  });
  const onSubmit = handleSubmit(async (values) => {
    const result = await apiMutation("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: values.email,
        fullName: `${values.lastName} ${values.firstName}`,
        password: values.password
      })
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push("/onboarding");
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {message && (
        <p
          role="alert"
          className="rounded-xl border border-rose-600/20 bg-rose-50 p-3 text-sm text-rose-600"
        >
          {message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prénom" error={errors.firstName?.message} required>
          <Input autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label="Nom" error={errors.lastName?.message} required>
          <Input autoComplete="family-name" {...register("lastName")} />
        </Field>
      </div>
      <Field label="E-mail professionnel" error={errors.email?.message} required>
        <Input
          type="email"
          autoComplete="email"
          placeholder="vous@entreprise.fr"
          {...register("email")}
        />
      </Field>
      <Field
        label="Mot de passe"
        hint="12 caractères minimum, avec une majuscule et un chiffre."
        error={errors.password?.message}
        required
      >
        <PasswordInput registration={register("password")} autoComplete="new-password" />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}Créer mon compte
      </Button>
      <p className="text-center text-sm text-ink-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-amber-600/15 bg-amber-50 p-4 text-sm leading-6 text-amber-600">
        <strong>Réinitialisation non activée dans ce MVP.</strong> Pour éviter de simuler un envoi
        inexistant, aucun message ne sera expédié depuis cet écran. Contactez un propriétaire de
        votre organisation.
      </div>
      <Link href="/login" className="text-center text-sm font-semibold text-brand-600">
        Retour à la connexion
      </Link>
    </div>
  );
}
